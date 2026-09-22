'use strict';
(() => {
  const ENDPOINT='https://oviqrkdkahammpuyreil.supabase.co/functions/v1/k7-archive';
  const PIN_KEY='k7ArchivePinV1';
  const getPin=()=>{try{return String(localStorage.getItem(PIN_KEY)||'').trim()}catch{return ''}};
  const setPin=v=>{try{localStorage.setItem(PIN_KEY,String(v||'').trim())}catch{}};
  const clearPin=()=>{try{localStorage.removeItem(PIN_KEY)}catch{}};
  const mapRow=r=>({
    key:r.k7_key, nums:Array.isArray(r.nums)?r.nums.map(Number):[],
    savedDraw:Number(r.saved_draw), savedDate:r.saved_date||'', savedTime:r.saved_time||'',
    savedColumn:r.saved_column, k7Index:r.k7_index, mode:r.mode||'', modeCode:r.mode_code||'',
    window:r.window_size, pool:r.pool_size, savedAt:Number(r.saved_at)||0
  });
  const setStatus=(text,kind='')=>{
    const el=document.getElementById('cloudStatus');if(el){el.textContent=text;el.className='cloudStatus '+kind}
    const b=document.getElementById('cloudSetup');if(b)b.textContent=getPin()?'🔑 Архив K7: подключён':'🔑 Архив K7: подключить';
  };
  async function request(method,path='',body=null,pin=getPin()){
    if(!pin)throw new Error('PIN_REQUIRED');
    const r=await fetch(ENDPOINT+path,{method,headers:{'content-type':'application/json','x-k7-pin':pin},body:body?JSON.stringify(body):undefined,cache:'no-store'});
    let data={};try{data=await r.json()}catch{}
    if(r.status===401)throw new Error('BAD_PIN');
    if(!r.ok)throw new Error(data?.error||('HTTP '+r.status));
    return data;
  }
  async function ensurePin(force=false){
    let pin=!force?getPin():'';
    if(!pin){
      pin=String(prompt('Введите PIN архива K7')||'').trim();
      if(!pin)return '';
    }
    try{await request('GET','',null,pin);setPin(pin);setStatus('Supabase: постоянный архив подключён','ok');return pin}
    catch(e){clearPin();setStatus('Неверный PIN архива','err');alert('PIN архива K7 не подошёл.');return ''}
  }
  async function loadRemote(){
    if(!getPin()){setStatus('Supabase готов · нажмите подключить и введите PIN','warn');return false}
    try{
      const d=await request('GET');
      const rows=(d.items||[]).map(mapRow).filter(x=>x.key&&x.nums.length===7);
      await writeSaved(rows.sort((a,b)=>(Number(b.savedAt)||0)-(Number(a.savedAt)||0)));
      renderSavedArchive();renderCombos(LAST_COMBOS);
      setStatus('Supabase: '+rows.length+' сохранено','ok');
      return true;
    }catch(e){
      if(String(e.message)==='BAD_PIN')clearPin();
      setStatus('Supabase недоступен · локальный кэш сохранён','warn');
      return false;
    }
  }
  window.setupCloud=async function(){
    const pin=await ensurePin(true);if(pin){await loadRemote();alert('Архив K7 подключён. Сохранение и удаление теперь идут в Supabase.');}
  };
  window.loadCloudArchive=loadRemote;
  window.cloudSave=async function(item){
    const pin=await ensurePin(false);if(!pin)return false;
    try{setStatus('Сохраняю K7…','warn');await request('POST','',item,pin);setStatus('K7 сохранена в Supabase','ok');return true}
    catch(e){console.error(e);setStatus('Не удалось сохранить K7','err');alert('K7 не сохранена в постоянный архив.');return false}
  };
  window.cloudDelete=async function(key){
    const pin=await ensurePin(false);if(!pin)return false;
    try{setStatus('Удаляю K7…','warn');await request('DELETE','?key='+encodeURIComponent(key),null,pin);setStatus('K7 удалена из Supabase','ok');return true}
    catch(e){console.error(e);setStatus('Не удалось удалить K7','err');alert('Удаление K7 не выполнено.');return false}
  };
  const notice=document.querySelector('#savedCard .notice');
  if(notice)notice.textContent='Основная копия сохранённых K7 хранится в Supabase. Телефон используется только как локальный кэш. После обновления или смены телефона архив восстанавливается после ввода PIN.';
  const ver=document.querySelector('.ver');if(ver)ver.textContent='LAB v1.9';
  const b=document.getElementById('cloudSetup');if(b)b.onclick=window.setupCloud;
  setStatus(getPin()?'Supabase: подключаю архив…':'Supabase готов · нажмите подключить и введите PIN',getPin()?'warn':'');
  if(getPin())setTimeout(loadRemote,0);
})();