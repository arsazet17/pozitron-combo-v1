/* COMBO KENO · История свежих · Supabase + УДЛ v10 · 02.10.2026
   Основная история хранится в Supabase и одинакова на всех устройствах.
   «3 БЛОКА» подключается во второй строке панели сразу после 🔍 Комбы.
   Clarity patch показывает явный ВЫВОД: ПРОПУСК / СИГНАЛ БЕЗ КОМБЫ / КОМБА СФОРМИРОВАНА.
*/
(() => {
  'use strict';
  if (window.__comboFreshDeleteLoaderV10) return;
  window.__comboFreshDeleteLoaderV10 = true;

  function tracks(){try{return Array.isArray(window.ComboCloudFresh?.get?.())?window.ComboCloudFresh.get():[]}catch{return[]}}
  function installDeletePatch(){
    if(window.__comboFreshHistoryDeleteV2)return;window.__comboFreshHistoryDeleteV2=true;
    if(!document.getElementById('comboFreshHistoryDeleteStyles')){const s=document.createElement('style');s.id='comboFreshHistoryDeleteStyles';s.textContent=`#comboSearch .cfsTrackActions{display:flex;align-items:center;gap:6px;justify-content:flex-end}#comboSearch .cfsTrackDel{padding:7px 8px;font-size:10px;line-height:1;background:#281520;border-color:#6d3343;color:#ffd2d7;white-space:nowrap;min-width:45px}@media(max-width:390px){#comboSearch .cfsTrackActions{gap:4px}#comboSearch .cfsTrackDel,#comboSearch .cfsTrackOpen{padding:7px 6px;font-size:9px}}`;document.head.appendChild(s)}
    let scheduled=false;const patch=()=>{scheduled=false;const body=document.getElementById('cfsHistoryBody');if(!body)return;const rows=[...body.querySelectorAll(':scope > .cfsTrackItem')],a=tracks().sort((x,y)=>Number(y.createdAt||0)-Number(x.createdAt||0));rows.forEach((row,i)=>{if(row.querySelector('.cfsTrackDel'))return;const open=row.querySelector('.cfsTrackOpen'),t=a[i];if(!open||!t?.id)return;const actions=document.createElement('div');actions.className='cfsTrackActions';const del=document.createElement('button');del.type='button';del.className='cfsTrackDel';del.textContent='УДЛ';del.onclick=async e=>{e.preventDefault();e.stopPropagation();del.disabled=true;del.textContent='…';const ok=await window.ComboCloudFresh?.delete?.(t.id);if(!ok){del.disabled=false;del.textContent='УДЛ';alert('Не удалось удалить запись из Supabase.');return}row.remove();window.dispatchEvent(new Event('focus'));setTimeout(schedulePatch,0)};open.before(actions);actions.appendChild(del);actions.appendChild(open)})};const schedulePatch=()=>{if(scheduled)return;scheduled=true;queueMicrotask(patch)};new MutationObserver(schedulePatch).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('focus',()=>setTimeout(schedulePatch,0));window.addEventListener('combo:fresh-cloud',()=>setTimeout(schedulePatch,0));schedulePatch();
  }
  function loadBase(){if(window.__comboFreshSplitV1){installDeletePatch();return}const currentSrc=document.currentScript&&document.currentScript.src,baseUrl=new URL('combo-fresh-split-v1-base.js?v=20261002-cloud10',currentSrc||location.href),s=document.createElement('script');s.src=baseUrl.href;s.onload=installDeletePatch;s.onerror=()=>console.error('COMBO FRESH base load failed');document.head.appendChild(s)}
  function loadThreeBlocks(){
    if(window.__comboThreeBlocksLoaderV8)return;window.__comboThreeBlocksLoaderV8=true;
    const currentSrc=document.currentScript&&document.currentScript.src;
    const engineUrl=new URL('combo-three-blocks-engine-v1.js?v=20261002-tb8',currentSrc||location.href);
    const uiUrl=new URL('combo-three-blocks-ui-v1.js?v=20261002-tb8',currentSrc||location.href);
    const placementUrl=new URL('combo-three-blocks-placement-v1.js?v=20261002-tb8',currentSrc||location.href);
    const clarityUrl=new URL('combo-three-blocks-clarity-v1.js?v=20261002-tb8',currentSrc||location.href);
    const loadClarity=()=>{if(window.__comboThreeBlocksClarityV1)return;const c=document.createElement('script');c.src=clarityUrl.href;c.onerror=()=>console.error('COMBO 3 BLOCKS clarity load failed');document.head.appendChild(c)};
    const loadPlacement=()=>{if(window.__comboThreeBlocksPlacementV14){loadClarity();return}const p=document.createElement('script');p.src=placementUrl.href;p.onload=loadClarity;p.onerror=()=>console.error('COMBO 3 BLOCKS placement load failed');document.head.appendChild(p)};
    const loadUI=()=>{if(window.__comboThreeBlocksUIV3){loadPlacement();return}const u=document.createElement('script');u.src=uiUrl.href;u.onload=loadPlacement;u.onerror=()=>console.error('COMBO 3 BLOCKS UI load failed');document.head.appendChild(u)};
    if(window.ComboThreeBlocksEngine&&window.ComboThreeBlocksEngine.VERSION==='TB3-2026-10-02'){loadUI();return}
    const e=document.createElement('script');e.src=engineUrl.href;e.onload=loadUI;e.onerror=()=>console.error('COMBO 3 BLOCKS engine load failed');document.head.appendChild(e);
  }
  function afterCloud(){loadBase();loadThreeBlocks()}
  function ensureCloud(){if(window.ComboCloudHistory&&window.ComboCloudFresh){Promise.resolve(window.ComboCloudHistory.ready).finally(afterCloud);return}const currentSrc=document.currentScript&&document.currentScript.src,cloudUrl=new URL('combo-cloud-sync-v1.js?v=20261002-cloud10',currentSrc||location.href),s=document.createElement('script');s.src=cloudUrl.href;s.onload=()=>Promise.resolve(window.ComboCloudHistory?.ready).finally(afterCloud);s.onerror=()=>alert('Облачная история Supabase не загрузилась.');document.head.appendChild(s)}
  ensureCloud();
})();
