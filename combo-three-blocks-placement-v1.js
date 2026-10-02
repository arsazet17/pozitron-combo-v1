/* COMBO KENO · 3 БЛОКА · placement v1.4 · 02.10.2026
   Точное место: ВТОРАЯ строка нижней панели — Таблица · Интервалы · 🔍 Комбы · 3 Блока.
   Верхняя строка остаётся: Наши комбы · Любая комба · ⏰ Комбы · Рентген · История.
   Версию приложения не переопределяем: её ведёт общий AUTO APP BUILD.
*/
(() => {
  'use strict';
  if(window.__comboThreeBlocksPlacementV14)return;
  window.__comboThreeBlocksPlacementV14=true;
  let previousOn=null;

  function installCss(){
    if(document.getElementById('comboThreeBlocksPlacementStylesV14'))return;
    const s=document.createElement('style');s.id='comboThreeBlocksPlacementStylesV14';s.textContent=`
      .footrow2{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      #threeBlocksNavBtn{min-width:0!important}
      #threeBlocksNavBtn b{font-size:20px}
      #threeBlocksDrawer{position:fixed;inset:0;width:100%;height:100dvh;z-index:9998;background:linear-gradient(180deg,#0e2941,#071725);overflow-y:auto;overflow-x:hidden;padding:10px 10px calc(24px + env(safe-area-inset-bottom))}
      #threeBlocksDrawer.hidden{display:none!important}
      .threeBlocksDrawerHead{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;padding:5px 0 9px;background:linear-gradient(180deg,#0e2941 78%,rgba(14,41,65,0))}
      .threeBlocksDrawerHead b{font-size:19px;color:#fff}.threeBlocksDrawerHead small{display:block;color:#9eb0c1;font-size:10px;margin-top:2px}.threeBlocksDrawerHead button{padding:7px 11px;background:#0a1c2d}
      #threeBlocksDrawerBody{max-width:650px;margin:0 auto}
      @media(max-width:430px){.footrow2 .nav{font-size:10px!important;padding-left:1px!important;padding-right:1px!important}.footrow2 .nav b{font-size:18px!important}#threeBlocksNavBtn{font-size:9px!important}}
      @media(max-width:360px){.footrow2 .nav{font-size:9px!important}.footrow2 .nav b{font-size:17px!important}}
    `;document.head.appendChild(s);
  }

  function ensureDrawer(){
    let d=document.getElementById('threeBlocksDrawer');
    if(d)return d;
    d=document.createElement('div');d.id='threeBlocksDrawer';d.className='hidden';
    d.innerHTML=`<div class="threeBlocksDrawerHead"><div><b>3 БЛОКА</b><small>Вход K7 · мощность K7 · переходы · общий архив</small></div><button id="closeThreeBlocksDrawer" type="button">▼</button></div><div id="threeBlocksDrawerBody"></div>`;
    document.body.appendChild(d);d.querySelector('#closeThreeBlocksDrawer').onclick=closeDrawer;return d;
  }

  function moveRoot(){
    const root=document.getElementById('comboThreeBlocksRoot'),body=document.getElementById('threeBlocksDrawerBody');
    if(root&&body&&root.parentElement!==body)body.appendChild(root);
  }

  function ensureNav(){
    const row=document.querySelector('.footrow2');if(!row)return;
    let b=document.getElementById('threeBlocksNavBtn');
    if(!b){b=document.createElement('button');b.id='threeBlocksNavBtn';b.className='nav';b.type='button';b.innerHTML='<b>▦</b>3 Блока';}
    const search=row.querySelector('[data-sec="comboSearch"]');
    if(search){
      if(b.previousElementSibling!==search)search.insertAdjacentElement('afterend',b);
    }else if(b.parentElement!==row){
      const spacers=[...row.querySelectorAll('.navSpacer')];
      const slot=spacers.at(-1);
      if(slot)row.replaceChild(b,slot);else row.appendChild(b);
    }
    b.onclick=toggleDrawer;
  }

  async function openDrawer(){
    try{if(typeof closeSavedDrawer==='function')closeSavedDrawer()}catch(_){ }
    try{if(typeof closeTableDrawer==='function')closeTableDrawer()}catch(_){ }
    const d=ensureDrawer();moveRoot();
    previousOn=document.querySelector('.footer .nav.on:not(#threeBlocksNavBtn)');
    document.querySelectorAll('.footer .nav').forEach(n=>n.classList.remove('on'));
    document.getElementById('threeBlocksNavBtn')?.classList.add('on');
    d.classList.remove('hidden');document.body.style.overflow='hidden';
    try{await window.ComboThreeBlocksUI?.refresh?.()}catch(e){console.error('3 БЛОКА refresh',e)}
    moveRoot();
  }

  function closeDrawer(){
    const d=document.getElementById('threeBlocksDrawer');if(d)d.classList.add('hidden');
    document.body.style.overflow='';document.getElementById('threeBlocksNavBtn')?.classList.remove('on');
    if(previousOn&&document.contains(previousOn))previousOn.classList.add('on');
  }

  function toggleDrawer(){const d=ensureDrawer();d.classList.contains('hidden')?openDrawer():closeDrawer()}
  function repair(){ensureDrawer();ensureNav();moveRoot()}
  function install(){installCss();repair();setTimeout(repair,250);setTimeout(repair,900);setTimeout(repair,1800);window.addEventListener('focus',repair);window.addEventListener('pageshow',repair);window.addEventListener('combo:three-blocks-cloud',moveRoot)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
