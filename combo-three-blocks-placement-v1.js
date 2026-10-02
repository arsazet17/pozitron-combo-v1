/* COMBO KENO · 3 БЛОКА · placement v1.3 · 02.10.2026
   Кнопка рядом с «Комбы». Без глобального MutationObserver.
*/
(() => {
  'use strict';
  if (window.__comboThreeBlocksPlacementV13) return;
  window.__comboThreeBlocksPlacementV13 = true;

  function installCss(){
    if(document.getElementById('comboThreeBlocksPlacementStyles')) return;
    const s=document.createElement('style');s.id='comboThreeBlocksPlacementStyles';s.textContent=`
      .footin{grid-template-columns:repeat(6,minmax(0,1fr))!important}#threeBlocksNavBtn{min-width:0!important}#threeBlocksNavBtn b{font-size:20px}
      #threeBlocksDrawer{position:fixed;inset:0;width:100%;height:100dvh;z-index:9998;background:linear-gradient(180deg,#0e2941,#071725);overflow-y:auto;overflow-x:hidden;padding:10px 10px calc(24px + env(safe-area-inset-bottom))}#threeBlocksDrawer.hidden{display:none!important}
      .threeBlocksDrawerHead{position:sticky;top:0;z-index:3;display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;padding:4px 0 9px;background:linear-gradient(180deg,#0e2941 76%,rgba(14,41,65,0))}.threeBlocksDrawerHead b{font-size:18px}.threeBlocksDrawerHead small{display:block;color:#9eb0c1;font-size:10px;margin-top:2px}.threeBlocksDrawerHead button{padding:7px 11px;background:#0a1c2d}#threeBlocksDrawerBody{max-width:650px;margin:0 auto}#threeBlocksDrawer #comboThreeBlocksRoot{margin:0;display:grid;gap:9px}
      @media(max-width:430px){.footin .nav{font-size:9px!important;padding-left:1px!important;padding-right:1px!important}.footin .nav b{font-size:18px!important}#threeBlocksNavBtn{font-size:9px!important}}`;
    document.head.appendChild(s);
  }
  function ensureDrawer(){let d=document.getElementById('threeBlocksDrawer');if(d)return d;d=document.createElement('div');d.id='threeBlocksDrawer';d.className='hidden';d.innerHTML=`<div class="threeBlocksDrawerHead"><div><b>3 БЛОКА</b><small>B1 время · B2 мощность · B3 переходы · архив Supabase</small></div><button id="closeThreeBlocksDrawer" type="button">▼</button></div><div id="threeBlocksDrawerBody"></div>`;document.body.appendChild(d);d.querySelector('#closeThreeBlocksDrawer').onclick=closeDrawer;return d}
  function moveRoot(){const root=document.getElementById('comboThreeBlocksRoot'),body=document.getElementById('threeBlocksDrawerBody');if(root&&body&&root.parentElement!==body)body.appendChild(root)}
  function ensureNav(){const saved=document.getElementById('savedDrawerBtn');if(!saved)return;let b=document.getElementById('threeBlocksNavBtn');if(!b){b=document.createElement('button');b.id='threeBlocksNavBtn';b.className='nav';b.type='button';b.innerHTML='<b>🧩</b>3 Блока';saved.insertAdjacentElement('afterend',b)}b.onclick=toggleDrawer}
  async function openDrawer(){try{if(typeof closeSavedDrawer==='function')closeSavedDrawer()}catch(_){}try{if(typeof closeTableDrawer==='function')closeTableDrawer()}catch(_){}const d=ensureDrawer();moveRoot();d.classList.remove('hidden');document.body.style.overflow='hidden';document.getElementById('threeBlocksNavBtn')?.classList.add('on');try{await window.ComboThreeBlocksUI?.refresh?.()}catch(e){console.error('3 БЛОКА refresh',e)}moveRoot()}
  function closeDrawer(){document.getElementById('threeBlocksDrawer')?.classList.add('hidden');document.body.style.overflow='';document.getElementById('threeBlocksNavBtn')?.classList.remove('on')}
  function toggleDrawer(){const d=ensureDrawer();d.classList.contains('hidden')?openDrawer():closeDrawer()}
  function setVersion(){const el=document.querySelector('.version');if(el)el.textContent='Версия v4.5.0'}
  function repair(){ensureDrawer();ensureNav();moveRoot();setVersion()}
  function install(){installCss();repair();window.addEventListener('focus',repair);window.addEventListener('pageshow',repair);window.addEventListener('combo:three-blocks-cloud',moveRoot)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
