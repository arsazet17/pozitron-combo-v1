const fs=require('fs');

function read(path){ return fs.readFileSync(path,'utf8'); }
function write(path,s){ fs.writeFileSync(path,s,'utf8'); }

function mustReplace(path, from, to, label){
  let s=read(path);
  if(!s.includes(from)){
    if(s.includes(to)){
      console.log(label+': already patched');
      return;
    }
    throw new Error(label+': expected fragment not found');
  }
  s=s.replace(from,to);
  write(path,s);
  console.log(label+': patched');
}

function mustInsertBefore(path, marker, block, label){
  let s=read(path);
  if(s.includes(block.trim())){
    console.log(label+': already inserted');
    return;
  }
  if(!s.includes(marker)) throw new Error(label+': marker not found');
  s=s.replace(marker, block+'\n'+marker);
  write(path,s);
  console.log(label+': inserted');
}

// 1) Faster publication eligibility: 7 min -> 3 min.
mustReplace(
  '.github/workflows/update-combo-v1.yaml',
  'COMBO_PUBLICATION_GRACE_MINUTES: "7"',
  'COMBO_PUBLICATION_GRACE_MINUTES: "3"',
  'publication grace'
);

// 2) Faster service-worker/app-shell update check: 10 min -> 1 min.
mustReplace(
  'index.html',
  'setInterval(check,600000);',
  'setInterval(check,60000);',
  'service worker refresh interval'
);

// 3) XRAY must invalidate stale analysis as soon as a new draw arrives,
// even if XRAY tab is closed at that moment.
const oldFn = "function onDataUpdated(){const d=latest(),now=Number(d?.draw||0);settleArchive();if(lastKnownDraw==null){lastKnownDraw=now;return}if(now===lastKnownDraw)return;lastKnownDraw=now;if($('xrayRoot')&&document.getElementById('xray')?.classList.contains('on')){lastAnalysis=null;revealPrediction=false;render()}}";
const newFn = "function onDataUpdated(){const d=latest(),now=Number(d?.draw||0);settleArchive();if(lastKnownDraw==null){lastKnownDraw=now;return}if(now===lastKnownDraw)return;lastKnownDraw=now;lastAnalysis=null;revealPrediction=false;if($('xrayRoot')&&document.getElementById('xray')?.classList.contains('on'))render()}";
mustReplace('xray-ui-v1.js', oldFn, newFn, 'XRAY current draw sync');

// 4) Cache-bust XRAY UI so phones take the fixed script.
mustReplace(
  'index.html',
  'xray-ui-v1.js?v=xray422',
  'xray-ui-v1.js?v=xray424fast',
  'XRAY UI cache bust'
);

// 5) IndexedDB cache for the big draw archive.
// It lets the app paint immediately from the last saved archive, then check only
// the tiny combo-status-v1.json. The full ~4 MB history is downloaded only when
// there is actually a newer draw (or on first-ever launch).
const idbBlock = String.raw`
const COMBO_DB_NAME='comboKenoLocalV1',COMBO_DB_STORE='kv',COMBO_DB_KEY='draws';
function comboDbOpen(){return new Promise((resolve,reject)=>{try{const q=indexedDB.open(COMBO_DB_NAME,1);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(COMBO_DB_STORE))db.createObjectStore(COMBO_DB_STORE)};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error||new Error('IndexedDB open failed'))}catch(e){reject(e)}})}
async function loadDrawCache(){try{const db=await comboDbOpen();return await new Promise((resolve,reject)=>{const tx=db.transaction(COMBO_DB_STORE,'readonly'),r=tx.objectStore(COMBO_DB_STORE).get(COMBO_DB_KEY);r.onsuccess=()=>resolve(Array.isArray(r.result)?r.result:[]);r.onerror=()=>reject(r.error)});}catch(e){console.warn('COMBO cache read',e);return[]}}
async function saveDrawCache(draws){try{if(!Array.isArray(draws)||!draws.length)return;const db=await comboDbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction(COMBO_DB_STORE,'readwrite');tx.objectStore(COMBO_DB_STORE).put(draws,COMBO_DB_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB abort'))});}catch(e){console.warn('COMBO cache write',e)}}
function paintBaseAfterDraws(){updateDbLine();renderFields('anyP');renderFields('ourP');refreshOpenHistory();window.ComboXrayUI?.onDataUpdated();}
`;

mustInsertBefore(
  'index.html',
  'async function load(){',
  idbBlock,
  'IndexedDB archive cache helpers'
);

// 6) When live auto-refresh downloads a newer archive, persist it locally too.
mustReplace(
  'index.html',
  "if(received>current || force){DRAWS=d;updateDbLine();renderFields('anyP');renderFields('ourP');refreshOpenHistory();window.ComboXrayUI?.onDataUpdated();}",
  "if(received>current || force){DRAWS=d;saveDrawCache(DRAWS);paintBaseAfterDraws();}",
  'persist live archive + unified repaint'
);

// 7) Add fast-start loader and use it instead of the old full-download-on-every-open load().
const fastLoad = String.raw`
async function loadFast(){
  try{
    const cached=await loadDrawCache();

    // Paint cached archive immediately, before any big network transfer.
    if(Array.isArray(cached)&&cached.length){
      DRAWS=cached.sort((a,b)=>a.draw-b.draw);
      updateDbLine();
      window.ComboXrayUI?.onDataUpdated();
    }

    const [p,s,pay]=await Promise.all([
      fetchJSONLive('combo-presets-v1.json'),
      fetchJSONLive('combo-status-v1.json').catch(()=>null),
      fetchJSONLive('keno-payouts-v1.json')
    ]);
    PRESETS=p;PAYOUTS=pay;syncMeta=s;
    renderGroups();renderCombos();renderPick();

    const current=Number(DRAWS.at(-1)?.draw||0);
    const official=Number(s?.latestDraw||0);

    // First launch, cleared browser storage, or server has a newer fact:
    // only then fetch the complete history.
    if(!DRAWS.length || (official && official>current)){
      const d=await fetchJSONLive('combo-history-v1.json');
      if(!Array.isArray(d)||!d.length)throw new Error('combo-history-v1.json пуст');
      d.sort((a,b)=>a.draw-b.draw);
      const received=Number(d.at(-1)?.draw||0);
      if(official && received<official)throw new Error('История ещё не догнала status: '+received+'<'+official);
      DRAWS=d;
      await saveDrawCache(DRAWS);
      paintBaseAfterDraws();
    }else{
      updateDbLine();
      renderFields('anyP');renderFields('ourP');
    }

    startAutoRefresh();
  }catch(e){
    $('dbline').textContent=DRAWS.length?'База загружена из памяти · сеть недоступна':'Ошибка загрузки базы';
    console.error(e);
    if(DRAWS.length){
      try{renderGroups();renderCombos();renderPick();startAutoRefresh();}catch(_){}
    }
  }
}
`;

mustInsertBefore(
  'index.html',
  'document.querySelectorAll(\'.nav[data-sec]\')',
  fastLoad,
  'fast startup loader'
);

// Replace only the startup call, not the load() declaration.
mustReplace(
  'index.html',
  'loadSavedAnyCombos();renderSavedCombos();renderPick();syncTableHeadButtons();load();',
  'loadSavedAnyCombos();renderSavedCombos();renderPick();syncTableHeadButtons();loadFast();',
  'use fast startup loader'
);

// 8) Cache-bust the main shell after this merged patch.
let idx=read('index.html');
idx=idx.replace(/<meta name="app-build" content="[^"]+">/,'<meta name="app-build" content="combo-fast-xray-cache-1">');
idx=idx.replace(/sw\.js\?v=[^'"]+/g,'sw.js?v=combo-fast-xray-cache-1');
idx=idx.replace(/combo-search-v1\.js\?v=[^'"]+/g,'combo-search-v1.js?v=combo-fast-xray-cache-1');
write('index.html',idx);

console.log('COMBO MERGED FAST UPDATE + XRAY SYNC + FAST START PATCH COMPLETE');
