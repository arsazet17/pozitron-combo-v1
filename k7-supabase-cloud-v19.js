'use strict';
(() => {
  const ENDPOINT='https://oviqrkdkahammpuyreil.supabase.co/functions/v1/k7-archive';
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
    const r=await fetch(ENDPOINT+path,{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data?.error||('HTTP '+r.status));
    return data;
  }
  async function loadRemote(){
    try{
      setStatus('Supabase: загружаю архив…','warn');
      const d=await request('GET');
      const rows=(d.items||[]).map(mapRow).filter(x=>x.key&&x.nums.length===7);
      await writeSaved(rows.sort((a,b)=>(Number(b.savedAt)||0)-(Number(a.savedAt)||0)));
      renderSavedArchive();renderCombos(LAST_COMBOS);
      setStatus('Supabase: '+rows.length+' сохранено','ok');
      return true;
    }catch(e){
      console.error(e);setStatus('Supabase недоступен · локальный кэш сохранён','warn');return false;
    }
  }
  window.setupCloud=async function(){await loadRemote()};
  window.loadCloudArchive=loadRemote;
  window.cloudSave=async function(item){
    try{setStatus('Сохраняю K7…','warn');await request('POST','',item);setStatus('K7 сохранена в Supabase','ok');return true}
    catch(e){console.error(e);setStatus('Не удалось сохранить K7','err');alert('K7 не сохранена в постоянный архив.');return false}
  };
  window.cloudDelete=async function(key){
    try{setStatus('Удаляю K7…','warn');await request('DELETE','?key='+encodeURIComponent(key));setStatus('K7 удалена из Supabase','ok');return true}
    catch(e){console.error(e);setStatus('Не удалось удалить K7','err');alert('Удаление K7 не выполнено.');return false}
  };
  const notice=document.querySelector('#savedCard .notice');
  if(notice)notice.textContent='Основная копия сохранённых K7 хранится в Supabase. Телефон используется только как локальный кэш. После обновления или смены телефона архив восстанавливается автоматически.';
  const ver=document.querySelector('.ver');if(ver)ver.textContent='LAB v1.9.1';
  const b=document.getElementById('cloudSetup');if(b){b.onclick=window.setupCloud;b.textContent='☁ Supabase: подключён';b.disabled=true;}
  setStatus('Supabase: подключаю архив…','warn');
  setTimeout(loadRemote,0);
})();