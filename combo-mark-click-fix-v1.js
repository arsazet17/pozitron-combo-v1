/* COMBO KENO · click-to-highlight hotfix v1 · 30.09.2026
   Fixes inactive number taps in history/search detail.
   - Tap a number: highlight the same number in every visible draw.
   - Tap again: remove highlight.
   - No 10-number limit; up to all 20 visible numbers.
*/
(() => {
  'use strict';
  if (window.__comboMarkClickFixV1) return;
  window.__comboMarkClickFixV1 = true;

  const detailMarks = new Map();
  const fmt = n => String(Number(n)).padStart(2,'0');

  function detailBox(){
    const box=document.getElementById('csDetail');
    return box && !box.classList.contains('hidden') ? box : null;
  }
  function detailKey(box){
    return String(box?.querySelector('.csDetailHead b')?.textContent || 'detail').trim();
  }
  function marksFor(box){
    const key=detailKey(box);
    if(!detailMarks.has(key)) detailMarks.set(key,new Set());
    return detailMarks.get(key);
  }
  function paintDetail(box){
    if(!box)return;
    const marks=marksFor(box);
    box.querySelectorAll('.hist .dn').forEach(el=>{
      const n=Number(String(el.textContent||'').trim());
      if(Number.isInteger(n) && n>=1 && n<=80) el.classList.toggle('mark',marks.has(n));
    });
  }
  function ensureDetailBar(box){
    if(!box)return;
    const hist=box.querySelector('.hist');
    if(!hist)return;
    const marks=marksFor(box);
    let wrap=box.querySelector('.csSearchMarkWrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='csSearchMarkWrap';
      hist.insertAdjacentElement('beforebegin',wrap);
    }
    const a=[...marks].sort((x,y)=>x-y);
    wrap.innerHTML=`<div class="csSearchMarkHelp">Нажмите на любое число в тираже — оно подсветится во всех показанных тиражах. Второе нажатие гасит его. Ограничения 10 нет — можно выбрать хоть все 20.</div>${a.length?`<div class="csSearchMarkBar"><span class="muted">Подсвечено (${a.length}):</span>${a.map(n=>`<span class="csSearchMarkChip">${fmt(n)}</span>`).join('')}<button class="csSearchMarkClear" type="button">Снять всё</button></div>`:''}`;
    paintDetail(box);
  }

  document.addEventListener('click',e=>{
    const dn=e.target.closest?.('#csDetail .hist .dn');
    if(dn){
      const box=detailBox();
      if(!box || !box.contains(dn))return;
      const n=Number(String(dn.textContent||'').trim());
      if(!Number.isInteger(n)||n<1||n>80)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const marks=marksFor(box);
      if(marks.has(n))marks.delete(n);else marks.add(n);
      ensureDetailBar(box);
      return;
    }
    const clear=e.target.closest?.('#csDetail .csSearchMarkClear');
    if(clear){
      const box=detailBox();
      if(!box)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      marksFor(box).clear();
      ensureDetailBar(box);
      return;
    }

    const main=e.target.closest?.('#historyBox .hist .dn');
    if(main && typeof toggleHistoryMark==='function'){
      const n=Number(main.dataset.hn || String(main.textContent||'').trim());
      if(!Number.isInteger(n)||n<1||n>80)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      try{ toggleHistoryMark(n); }catch(err){ console.warn('COMBO mark hotfix',err); }
    }
  },true);

  let timer=0;
  const sync=()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const box=detailBox();
      if(box){ ensureDetailBar(box); paintDetail(box); }
      const v=document.querySelector('.version');
      if(v) v.textContent='Версия v4.3.28';
    },30);
  };
  const start=()=>{
    const target=document.getElementById('csDetail') || document.body;
    if(target) new MutationObserver(sync).observe(target,{childList:true,subtree:true});
    sync();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
