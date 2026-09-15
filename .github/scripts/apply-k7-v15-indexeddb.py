from pathlib import Path

p = Path('k7-interval-builder.html')
s = p.read_text(encoding='utf-8')

if 'LAB v1.4' not in s:
    raise SystemExit('Expected LAB v1.4 not found')
s = s.replace('LAB v1.4', 'LAB v1.5', 1)

old_notice = 'Архив пока лабораторный и хранится в браузере этого устройства. В основное COMBO ничего не встроено.'
new_notice = 'Архив хранится в IndexedDB браузера — не в localStorage. Старые сохранённые K7 при первом запуске автоматически переносятся в IndexedDB и удаляются из localStorage. В основное COMBO ничего не встроено.'
if old_notice not in s:
    raise SystemExit('Saved archive notice not found')
s = s.replace(old_notice, new_notice, 1)

old_const = "const K7_SAVED_KEY='k7IntervalLabSavedV1';"
new_const = "const K7_LEGACY_KEY='k7IntervalLabSavedV1',K7_DB_NAME='k7IntervalLabDB',K7_DB_STORE='savedK7';\nlet SAVED_CACHE=[];"
if old_const not in s:
    raise SystemExit('K7 saved key const not found')
s = s.replace(old_const, new_const, 1)

old_block = '''function readSaved(){
 try{const v=JSON.parse(localStorage.getItem(K7_SAVED_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}
}
function writeSaved(a){localStorage.setItem(K7_SAVED_KEY,JSON.stringify(a))}
function savedKey(nums){return [...nums].sort((a,b)=>a-b).join('-')}
function isSaved(nums){const k=savedKey(nums);return readSaved().some(x=>x.key===k)}
function saveK7(nums){
 const a=readSaved(),key=savedKey(nums);if(a.some(x=>x.key===key))return false;
 const last=DRAWS[DRAWS.length-1];if(!last)return false;
 a.unshift({key,nums:[...nums].sort((a,b)=>a-b),savedDraw:Number(last.draw),savedDate:last.date||'',savedTime:last.time||'',savedColumn:drawCol(last),savedAt:Date.now()});
 writeSaved(a);renderSavedArchive();renderCombos(LAST_COMBOS);return true;
}
function removeSaved(key){writeSaved(readSaved().filter(x=>x.key!==key));renderSavedArchive();renderCombos(LAST_COMBOS)}'''

new_block = '''function openSavedDB(){
 return new Promise((resolve,reject)=>{
   const req=indexedDB.open(K7_DB_NAME,1);
   req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(K7_DB_STORE))db.createObjectStore(K7_DB_STORE,{keyPath:'key'})};
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));
 });
}
async function loadSavedDB(){
 try{
   const db=await openSavedDB();
   const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(K7_DB_STORE,'readonly'),r=tx.objectStore(K7_DB_STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)});
   SAVED_CACHE=rows.sort((a,b)=>(Number(b.savedAt)||0)-(Number(a.savedAt)||0));
   let legacy=[];
   try{const v=JSON.parse(localStorage.getItem(K7_LEGACY_KEY)||'[]');if(Array.isArray(v))legacy=v}catch{}
   if(legacy.length){
     const by=new Map(SAVED_CACHE.map(x=>[x.key,x]));legacy.forEach(x=>{if(x&&x.key&&!by.has(x.key))by.set(x.key,x)});
     SAVED_CACHE=[...by.values()].sort((a,b)=>(Number(b.savedAt)||0)-(Number(a.savedAt)||0));
     await writeSaved(SAVED_CACHE);
   }
   try{localStorage.removeItem(K7_LEGACY_KEY)}catch{}
   db.close();
 }catch(e){console.error('IndexedDB load:',e);SAVED_CACHE=[]}
}
function readSaved(){return SAVED_CACHE}
async function writeSaved(a){
 SAVED_CACHE=[...(a||[])];
 const db=await openSavedDB();
 await new Promise((resolve,reject)=>{
   const tx=db.transaction(K7_DB_STORE,'readwrite'),st=tx.objectStore(K7_DB_STORE);st.clear();SAVED_CACHE.forEach(x=>st.put(x));
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('IndexedDB write failed'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB write aborted'));
 });
 db.close();
}
function savedKey(nums){return [...nums].sort((a,b)=>a-b).join('-')}
function isSaved(nums){const k=savedKey(nums);return readSaved().some(x=>x.key===k)}
async function saveK7(nums){
 const a=readSaved(),key=savedKey(nums);if(a.some(x=>x.key===key))return false;
 const last=DRAWS[DRAWS.length-1];if(!last)return false;
 a.unshift({key,nums:[...nums].sort((a,b)=>a-b),savedDraw:Number(last.draw),savedDate:last.date||'',savedTime:last.time||'',savedColumn:drawCol(last),savedAt:Date.now()});
 await writeSaved(a);renderSavedArchive();renderCombos(LAST_COMBOS);return true;
}
async function removeSaved(key){await writeSaved(readSaved().filter(x=>x.key!==key));renderSavedArchive();renderCombos(LAST_COMBOS)}'''

if old_block not in s:
    raise SystemExit('Old localStorage block not found')
s = s.replace(old_block, new_block, 1)

old_load = "   if(Number($('window').value)>DRAWS.length)$('window').value=String(DRAWS.length);\n   build();"
new_load = "   if(Number($('window').value)>DRAWS.length)$('window').value=String(DRAWS.length);\n   await loadSavedDB();\n   build();"
if old_load not in s:
    raise SystemExit('load() build marker not found')
s = s.replace(old_load, new_load, 1)

p.write_text(s, encoding='utf-8')
print('K7 LAB v1.5 IndexedDB patch applied')
