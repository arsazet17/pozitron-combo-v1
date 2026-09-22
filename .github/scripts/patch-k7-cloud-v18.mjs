import fs from 'node:fs';

const path='k7-interval-builder.html';
let s=fs.readFileSync(path,'utf8');
function rep(oldText,newText,label){
  if(!s.includes(oldText)) throw new Error('Patch target not found: '+label);
  s=s.replace(oldText,newText);
}

rep('<div class="ver">LAB v1.7</div>','<div class="ver">LAB v1.8</div>','version');

rep(
'.backtestWrap{overflow:auto;margin-top:8px}.backtestTable{border-collapse:collapse;white-space:nowrap;font-size:13px}.backtestTable th,.backtestTable td{padding:8px;border:1px solid #315775;text-align:right}\n</style>',
'.backtestWrap{overflow:auto;margin-top:8px}.backtestTable{border-collapse:collapse;white-space:nowrap;font-size:13px}.backtestTable th,.backtestTable td{padding:8px;border:1px solid #315775;text-align:right}\n.cloudBar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:8px}.cloudBar button{padding:8px 10px}.cloudStatus{font-size:10px;color:#9fb4c5}.cloudStatus.ok{color:#9af274}.cloudStatus.warn{color:#ffd78b}.cloudStatus.err{color:#ffb6b6}\n</style>',
'cloud css');

rep(
'  <div class="notice">Архив хранится в IndexedDB браузера — не в localStorage. Старые сохранённые K7 при первом запуске автоматически переносятся в IndexedDB и удаляются из localStorage. В основное COMBO ничего не встроено.</div>\n  <div id="savedArchive" class="savedArchive"></div>',
'  <div class="notice">Основная копия сохранённых K7 хранится в GitHub. IndexedDB на телефоне используется только как локальный кэш. После смены/обновления телефона архив восстанавливается из GitHub и заново пересчитывается по общему архиву тиражей.</div>\n  <div class="cloudBar"><button id="cloudSetup" class="ghost">☁ GitHub: подключить</button><span id="cloudStatus" class="cloudStatus">Проверка облака…</span></div>\n  <div id="savedArchive" class="savedArchive"></div>',
'saved card cloud ui');

rep(
"const K7_LEGACY_KEY='k7IntervalLabSavedV1',K7_DB_NAME='k7IntervalLabDB',K7_DB_STORE='savedK7';\nlet SAVED_CACHE=[];",
"const K7_LEGACY_KEY='k7IntervalLabSavedV1',K7_DB_NAME='k7IntervalLabDB',K7_DB_STORE='savedK7';\nconst K7_CLOUD_FILE='data/k7-saved-cloud.json',K7_CLOUD_REPO='arsazet17/pozitron-combo-v1',K7_CLOUD_WORKFLOW='k7-cloud-store.yml',K7_CLOUD_TOKEN_KEY='k7GithubActionsTokenV1';\nlet SAVED_CACHE=[],CLOUD_STATE={items:[],deleted:[],updatedAt:null};",
'cloud constants');

rep(
" db.close();\n}\nfunction savedKey(nums){return [...nums].sort((a,b)=>a-b).join('-')}",
` db.close();
}
function cloudToken(){try{return String(localStorage.getItem(K7_CLOUD_TOKEN_KEY)||'').trim()}catch{return ''}}
function setCloudStatus(text,kind=''){const el=$('cloudStatus');if(!el)return;el.textContent=text;el.className='cloudStatus '+kind;const b=$('cloudSetup');if(b)b.textContent=cloudToken()?'☁ GitHub: подключён':'☁ GitHub: подключить'}
async function readCloudArchive(){
 const r=await fetch(K7_CLOUD_FILE+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('GitHub archive HTTP '+r.status);
 const v=await r.json();return {items:Array.isArray(v?.items)?v.items:[],deleted:Array.isArray(v?.deleted)?v.deleted:[],updatedAt:v?.updatedAt||null};
}
async function loadCloudArchive(){
 try{
   CLOUD_STATE=await readCloudArchive();
   const by=new Map(readSaved().filter(x=>x&&x.key).map(x=>[x.key,x]));
   CLOUD_STATE.items.filter(x=>x&&x.key).forEach(x=>by.set(x.key,x));
   new Set(CLOUD_STATE.deleted.map(x=>x?.key).filter(Boolean)).forEach(k=>by.delete(k));
   await writeSaved([...by.values()].sort((a,b)=>(Number(b.savedAt)||0)-(Number(a.savedAt)||0)));
   setCloudStatus('GitHub: '+CLOUD_STATE.items.length+' сохранено'+(cloudToken()?' · запись включена':' · нужна авторизация'),'ok');
 }catch(e){console.error('K7 cloud load:',e);setCloudStatus('GitHub недоступен · используется локальный кэш','warn')}
}
async function dispatchCloud(op,payload,token=cloudToken()){
 if(!token)throw new Error('GitHub token не задан');
 const r=await fetch('https://api.github.com/repos/'+K7_CLOUD_REPO+'/actions/workflows/'+K7_CLOUD_WORKFLOW+'/dispatches',{method:'POST',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({ref:'main',inputs:{op,record:JSON.stringify(payload)}})});
 if(r.status!==204){let t='';try{t=await r.text()}catch{};throw new Error('GitHub '+r.status+(t?' · '+t.slice(0,180):''))}
 return true;
}
async function ensureCloudToken(syncLocal=false){
 let token=cloudToken();
 if(!token){
   token=String(prompt('Для постоянного архива нужен fine-grained GitHub token только для репозитория '+K7_CLOUD_REPO+'.\\nРазрешение: Actions → Read and write.\\nВставьте token:')||'').trim();
   if(!token)return '';
   try{localStorage.setItem(K7_CLOUD_TOKEN_KEY,token)}catch{}
 }
 try{
   if(syncLocal&&readSaved().length){
     const chunks=[];for(let i=0;i<readSaved().length;i+=40)chunks.push(readSaved().slice(i,i+40));
     for(const part of chunks)await dispatchCloud('merge',part,token);
   }else if(syncLocal)await dispatchCloud('merge',[],token);
   setCloudStatus(syncLocal?'GitHub: синхронизация отправлена':'GitHub: запись включена','ok');
   return token;
 }catch(e){
   try{localStorage.removeItem(K7_CLOUD_TOKEN_KEY)}catch{}
   setCloudStatus('Ошибка авторизации GitHub','err');
   alert('GitHub не принял token. Проверьте: выбран только репозиторий '+K7_CLOUD_REPO+' и Actions = Read and write.');
   console.error(e);return '';
 }
}
async function setupCloud(){
 if(cloudToken()){
   try{await ensureCloudToken(true);alert('Сохранённые K7 отправлены на синхронизацию с GitHub.')}catch(e){console.error(e)}
   return;
 }
 const token=await ensureCloudToken(true);if(token)alert('GitHub подключён. Теперь сохранение и удаление K7 отправляется в репозиторий, а телефон используется только как кэш.');
}
async function cloudSave(item){
 const token=await ensureCloudToken(false);if(!token)return false;
 try{setCloudStatus('Сохраняю в GitHub…','warn');await dispatchCloud('save',item,token);setCloudStatus('Сохранение отправлено в GitHub','ok');return true}catch(e){console.error(e);setCloudStatus('Не удалось сохранить в GitHub','err');alert('K7 не сохранена: GitHub не принял запрос.');return false}
}
async function cloudDelete(key){
 const token=await ensureCloudToken(false);if(!token)return false;
 try{setCloudStatus('Удаляю из GitHub…','warn');await dispatchCloud('delete',{key},token);setCloudStatus('Удаление отправлено в GitHub','ok');return true}catch(e){console.error(e);setCloudStatus('Не удалось удалить из GitHub','err');alert('Удаление отменено: GitHub не принял запрос.');return false}
}
function savedKey(nums){return [...nums].sort((a,b)=>a-b).join('-')}`,
'cloud functions');

rep(
`async function saveK7(nums,meta={}){
 const a=readSaved(),key=savedKey(nums);if(a.some(x=>x.key===key))return false;
 const last=DRAWS[DRAWS.length-1];if(!last)return false;
 a.unshift({key,nums:[...nums].sort((a,b)=>a-b),savedDraw:Number(last.draw),savedDate:last.date||'',savedTime:last.time||'',savedColumn:drawCol(last),savedAt:Date.now(),k7Index:Number(meta.k7Index)||null,mode:meta.mode||$('mode').value,modeCode:modeCode(meta.mode||$('mode').value),window:Number(meta.window)||CURRENT_DRAWS.length,pool:Number(meta.pool)||Number($('pool').value)});
 await writeSaved(a);renderSavedArchive();renderCombos(LAST_COMBOS);return true;
}
async function removeSaved(key){await writeSaved(readSaved().filter(x=>x.key!==key));renderSavedArchive();renderCombos(LAST_COMBOS)}`,
`async function saveK7(nums,meta={}){
 const a=readSaved(),key=savedKey(nums);if(a.some(x=>x.key===key))return false;
 const last=DRAWS[DRAWS.length-1];if(!last)return false;
 const item={key,nums:[...nums].sort((a,b)=>a-b),savedDraw:Number(last.draw),savedDate:last.date||'',savedTime:last.time||'',savedColumn:drawCol(last),savedAt:Date.now(),k7Index:Number(meta.k7Index)||null,mode:meta.mode||$('mode').value,modeCode:modeCode(meta.mode||$('mode').value),window:Number(meta.window)||CURRENT_DRAWS.length,pool:Number(meta.pool)||Number($('pool').value)};
 if(!(await cloudSave(item)))return false;
 a.unshift(item);await writeSaved(a);renderSavedArchive();renderCombos(LAST_COMBOS);return true;
}
async function removeSaved(key){
 if(!(await cloudDelete(key)))return false;
 await writeSaved(readSaved().filter(x=>x.key!==key));renderSavedArchive();renderCombos(LAST_COMBOS);return true;
}`,
'save delete cloud');

rep(
"   await loadSavedDB();\n   build();",
"   await loadSavedDB();\n   await loadCloudArchive();\n   build();",
'load cloud');

rep(
"$('refresh').onclick=()=>location.replace(location.pathname+'?v='+Date.now());$('back').onclick=()=>location.href='./';\nload();",
"$('refresh').onclick=()=>location.replace(location.pathname+'?v='+Date.now());$('back').onclick=()=>location.href='./';\n$('cloudSetup').onclick=setupCloud;\nload();",
'cloud setup handler');

fs.writeFileSync(path,s);
console.log('K7 cloud patch applied');
