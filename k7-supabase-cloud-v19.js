'use strict';
(() => {
  const ENDPOINT='https://oviqrkdkahammpuyreil.supabase.co/functions/v1/k7-archive';
  const API_KEY='sb_publishable_1m9JJLimTkluI2uS0r5VXA_EF3trjvU';
  const mapRow=r=>({
    key:r.k7_key, nums:Array.isArray(r.nums)?r.nums.map(Number):[],
    savedDraw:Number(r.saved_draw), savedDate:r.saved_date||'', savedTime:r.saved_time||'',
    savedColumn:r.saved_column, k7Index:r.k7_index, mode:r.mode||'', modeCode:r.mode_code||'',
    window:r.window_size, pool:r.pool_size, savedAt:Number(r.saved_at)||0
  });
  const setStatus=(text,kind='')=>{
    const el=document.getElementById('cloudStatus');if(el){el.textContent=text;el.className='cloudStatus '+kind}
    const b=document.getElementById('cloudSetup');if(b){b.textContent='☁ Supabase: подключён';b.disabled=true;}
  };
  async function request(method,path='',body=null){
    const r=await fetch(ENDPOINT+path,{method,headers:{'content-type':'application/json','apikey':API_KEY},body:body?JSON.stringify(body):undefined,cache:'no-store'});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error((data&&data.detail)||data?.error||('HTTP '+r.status));
    return data;
  }
  function localRows(){
    try{return (typeof readSaved==='function'?readSaved():[]).filter(x=>x&&x.key&&Array.isArray(x.nums)&&x.nums.length===7)}catch{return []}
  }
  async function loadRemote(){
    const local=localRows();
    try{
      setStatus('Supabase: синхронизация…','warn');
      let d=await request('GET');
      let remote=(d.items||[]).map(mapRow).filter(x=>x.key&&x.nums.length===7);
      const remoteKeys=new Set(remote.map(x=>x.key));
      let migrated=0, pending=0;
      for(const item of local){
        if(remoteKeys.has(item.key))continue;
        try{await request('POST','',item);remoteKeys.add(item.key);migrated++;}
        catch(e){console.error('K7 migrate:',e);pending++;}
      }
      if(migrated){
        d=await request('GET');
        remote=(d.items||[]).map(mapRow).filter(x=>x.key&&x.nums.length===7);
      }
      const merged=new Map(remote.map(x=>[x.key,x]));
      for(const item of local)if(!merged.has(item.key))merged.set(item.key,item);
      const rows=[...merged.values()].sort((a,b)=>(Number(b.savedAt)||0)-(Number(a.savedAt)||0));
      await writeSaved(rows);
      renderSavedArchive();renderCombos(LAST_COMBOS);
      if(pending)setStatus('Supabase: '+remote.length+' в облаке · '+pending+' ждёт синхронизации','warn');
      else setStatus('Supabase: '+remote.length+' сохранено','ok');
      return true;
    }catch(e){
      console.error('Supabase load:',e);
      setStatus('Supabase недоступен · локальный кэш сохранён','warn');
      return false;
    }
  }
  window.setupCloud=async function(){await loadRemote()};
  window.loadCloudArchive=loadRemote;
  window.cloudSave=async function(item){
    try{
      setStatus('Сохраняю K7…','warn');
      const d=await request('POST','',item);
      setStatus('K7 сохранена в Supabase'+(d?.server?' · '+d.server:''),'ok');
      return true;
    }catch(e){
      console.error('Supabase save:',e);
      const msg=String(e?.message||e);
      setStatus('Не удалось сохранить K7 · '+msg,'err');
      alert('K7 не сохранена в постоянный архив.\n'+msg);
      return false;
    }
  };
  window.cloudDelete=async function(key){
    try{setStatus('Удаляю K7…','warn');await request('DELETE','?key='+encodeURIComponent(key));setStatus('K7 удалена из Supabase','ok');return true}
    catch(e){console.error('Supabase delete:',e);const msg=String(e?.message||e);setStatus('Не удалось удалить K7 · '+msg,'err');alert('Удаление K7 не выполнено.\n'+msg);return false}
  };
  const notice=document.querySelector('#savedCard .notice');
  if(notice)notice.textContent='Основная копия сохранённых K7 хранится в Supabase. Телефон используется только как локальный кэш. После обновления или смены телефона архив восстанавливается автоматически.';
  const ver=document.querySelector('.ver');if(ver)ver.textContent='LAB v1.9.3';
  const b=document.getElementById('cloudSetup');if(b){b.onclick=window.setupCloud;b.textContent='☁ Supabase: подключён';b.disabled=true;}
  setStatus('Supabase: подключаю архив…','warn');
  setTimeout(loadRemote,0);
})();