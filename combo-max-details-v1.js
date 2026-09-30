/* COMBO KENO — Максимальные выходы + свободная подсветка архива
   v4.3.20 · 30.09.2026
   1) «Макс.» в основном архиве: раскрытие всех максимальных выходов.
   2) «Макс. выход» внутри раздела «Комбы»: тираж, дата/время, столб,
      выплата, попавшие числа и шум тиража.
   3) Подсветка чисел в «Как шла комбинация» больше не ограничена 10 числами
      и не меняет саму выбранную комбинацию.
*/
(() => {
  'use strict';

  const VERSION='4.3.20';
  const PREVIEW_LIMIT=4;
  const mainViewState=new Map();
  const searchViewState=new Map();
  const searchMarkState=new Map();
  let searchObserver=null;
  let searchTimer=0;

  const fmt=n=>String(Number(n)).padStart(2,'0');
  const money=n=>`${Number(n||0).toLocaleString('ru-RU')} ₽`;
  const comboKey=nums=>(nums||[]).map(Number).sort((a,b)=>a-b).join('-');

  function payout(k,h){
    try{
      if(typeof PAYOUTS!=='undefined'){
        return Number(PAYOUTS?.combination?.[String(k)]?.[String(h)]||0);
      }
    }catch(e){}
    return 0;
  }

  function columnOf(d){
    try{
      if(typeof drawColumn==='function')return drawColumn(d);
    }catch(e){}
    const c=Number(d?.column);
    return Number.isInteger(c)?c:null;
  }

  function hitNumbers(nums,d){
    const set=new Set((d?.balls||[]).map(Number));
    return (nums||[]).map(Number).filter(n=>set.has(n));
  }

  function hits(nums,d){return hitNumbers(nums,d).length}

  function drawNoise(nums,d){
    const combo=new Set((nums||[]).map(Number));
    return (d?.balls||[]).map(Number).filter(n=>!combo.has(n));
  }

  function addCss(){
    if(document.getElementById('comboMaxDetailsStyles'))return;
    const s=document.createElement('style');
    s.id='comboMaxDetailsStyles';
    s.textContent=`
      #historyBox .maxDetailsStat{cursor:pointer;position:relative;outline:none;transition:border-color .12s,box-shadow .12s,transform .08s}
      #historyBox .maxDetailsStat:active{transform:scale(.98)}
      #historyBox .maxDetailsStat.open{border-color:#ffbd23;box-shadow:0 0 0 1px rgba(255,189,35,.25) inset}
      #historyBox .maxDetailsHint{display:block;margin-top:4px;color:#ffcf5c;font-size:9px;font-weight:900;line-height:1.2}
      #historyBox .maxDetailsPanel{grid-column:1/-1;margin:-1px 0 7px;padding:9px;border:1px solid #6b5521;border-radius:11px;background:linear-gradient(180deg,#12243a,#081827)}
      .comboMaxHead{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:7px}
      .comboMaxTitle{font-weight:950;font-size:13px;color:#fff}
      .comboMaxSummary{font-size:10px;color:#ffcf5c;margin-top:2px;line-height:1.35}
      .comboMaxClose{padding:5px 8px;border-radius:8px;background:#0a1c2d;color:#c9d9e7;font-size:10px;white-space:nowrap}
      .comboMaxList{display:grid;gap:6px}
      .comboMaxRow{padding:8px;border:1px solid #294b66;border-radius:9px;background:#071725}
      .comboMaxRowTop{display:flex;align-items:center;justify-content:space-between;gap:7px;font-size:11px;font-weight:900}
      .comboMaxDraw{color:#fff}.comboMaxPrize{color:#ffbd23;white-space:nowrap}
      .comboMaxMeta{margin-top:3px;font-size:10px;color:#b7c8d7;line-height:1.35}
      .comboMaxHits,.comboMaxNoise{margin-top:5px;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
      .comboMaxHit{padding:3px 5px;border-radius:6px;background:#26752d;border:1px solid #67c93f;color:#fff;font-size:10px;font-weight:900}
      .comboMaxNoiseNum{padding:2px 4px;border-radius:5px;background:#0a1c2d;border:1px solid #294b66;color:#aebfcd;font-size:9px;font-weight:800}
      .comboMaxToggle{width:100%;margin-top:7px;padding:7px;border-radius:8px;background:#0b2032;color:#d5e3ee;font-size:10px}
      #csDetail .csMaxDetailsWrap{width:100%;margin:8px 0 9px}
      #csDetail .csMaxSummaryBtn{width:100%;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;text-align:left;padding:10px 11px;border:1px solid #6b5521;border-radius:11px;background:linear-gradient(180deg,#142b43,#0a1b2b)}
      #csDetail .csMaxSummaryBtn.open{border-color:#ffbd23;box-shadow:0 0 0 1px rgba(255,189,35,.22) inset}
      #csDetail .csMaxSummaryMain{min-width:0}
      #csDetail .csMaxSummaryTitle{display:block;font-size:12px;font-weight:950;color:#fff}
      #csDetail .csMaxSummarySub{display:block;margin-top:3px;font-size:10px;color:#ffcf5c;line-height:1.3}
      #csDetail .csMaxChevron{font-size:15px;color:#ffcf5c;font-weight:950}
      #csDetail .csMaxDetailsPanel{margin-top:6px;padding:9px;border:1px solid #6b5521;border-radius:11px;background:linear-gradient(180deg,#12243a,#081827)}
      #csDetail .csSearchMarkWrap{margin:7px 0 7px;padding:7px 8px;border:1px solid #274863;border-radius:9px;background:#081a2b}
      #csDetail .csSearchMarkHelp{color:#a9bfd0;font-size:10.5px;line-height:1.35}
      #csDetail .csSearchMarkBar{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:6px}
      #csDetail .csSearchMarkChip{padding:4px 6px;border-radius:7px;background:#126da8;border:1px solid #80dcff;color:#fff;font-weight:950;font-size:11px}
      #csDetail .csSearchMarkClear{padding:4px 7px;border-radius:7px;background:#0a1c2d;color:#bcd0e0;font-size:10px}
      #csDetail .dn.mark{background:linear-gradient(180deg,#35a9ff,#126da8)!important;color:#fff!important;font-weight:950;box-shadow:0 0 0 1px #80dcff inset,0 0 8px rgba(53,169,255,.45)!important}
      #csDetail .dn.hit.mark{box-shadow:0 0 0 2px #6fd33f inset,0 0 8px rgba(53,169,255,.55)!important}
      @media(max-width:380px){.comboMaxRowTop{font-size:10px}.comboMaxSummary,.comboMaxMeta{font-size:9px}#csDetail .csMaxSummaryTitle{font-size:11px}#csDetail .csMaxSummarySub{font-size:9px}}
    `;
    document.head.appendChild(s);
  }

  function occurrenceRowsHtml(p,showAll){
    const visible=showAll?p.maxDraws:p.maxDraws.slice(0,PREVIEW_LIMIT);
    const rows=visible.map(d=>{
      const hn=hitNumbers(p.nums,d);
      const noise=drawNoise(p.nums,d);
      const amount=payout(p.k,hn.length);
      const col=columnOf(d);
      return `<div class="comboMaxRow">
        <div class="comboMaxRowTop"><span class="comboMaxDraw">${amount>0?'🔥 ':''}№${d.draw}</span><span class="comboMaxPrize">${hn.length}/${p.k}${amount>0?` · ${money(amount)}`:''}</span></div>
        <div class="comboMaxMeta">${d.date||'—'} · ${d.time||'—'} · столб ${col??'—'}</div>
        <div class="comboMaxHits"><span class="comboMaxMeta">Попали:</span>${hn.map(n=>`<span class="comboMaxHit">${fmt(n)}</span>`).join('')}</div>
        <div class="comboMaxNoise"><span class="comboMaxMeta">Шум:</span>${noise.map(n=>`<span class="comboMaxNoiseNum">${fmt(n)}</span>`).join('')}</div>
      </div>`;
    }).join('');
    return rows||'<div class="muted">Максимальные выходы не найдены.</div>';
  }

  function moreButtonHtml(p,showAll,id){
    if(p.maxDraws.length<=PREVIEW_LIMIT)return '';
    return `<button id="${id}" class="comboMaxToggle" type="button">${showAll?'Свернуть ▲':`Развернуть все (${p.maxDraws.length}) ▼`}</button>`;
  }

  function mainPayload(){
    try{
      if(typeof lastResult==='undefined'||!lastResult)return null;
      const nums=[...(lastResult.nums||[])].map(Number);
      const draws=[...(lastResult.draws||[])];
      if(!nums.length||!draws.length)return null;
      let best=Number(lastResult.st?.best);
      if(!Number.isFinite(best))best=Math.max(...draws.map(d=>hits(nums,d)));
      const maxDraws=draws.filter(d=>hits(nums,d)===best).sort((a,b)=>Number(b.draw)-Number(a.draw));
      return {nums,draws,best,maxDraws,k:nums.length,key:comboKey(nums)};
    }catch(e){return null}
  }

  function mainPanelHtml(p,showAll){
    const prize=payout(p.k,p.best);
    const total=prize*p.maxDraws.length;
    const payoutText=prize>0?`по ${money(prize)} · всего ${money(total)}`:'выплаты за этот уровень нет';
    return `<div class="comboMaxHead"><div><div class="comboMaxTitle">МАКСИМАЛЬНЫЕ ВЫХОДЫ · ${p.best}/${p.k}</div><div class="comboMaxSummary">${p.maxDraws.length} раз · ${payoutText}</div></div><button id="maxDetailsClose" class="comboMaxClose" type="button">Свернуть ▲</button></div><div class="comboMaxList">${occurrenceRowsHtml(p,showAll)}</div>${moreButtonHtml(p,showAll,'maxDetailsMore')}`;
  }

  function enhanceMainHistory(){
    const p=mainPayload();
    const box=document.getElementById('historyBox');
    if(!p||!box)return;
    const stats=box.querySelector('.stats');
    if(!stats)return;
    const maxStat=[...stats.querySelectorAll('.stat')].find(el=>String(el.querySelector('span')?.textContent||'').trim().startsWith('Макс.'));
    if(!maxStat)return;
    let st=mainViewState.get(p.key);
    if(!st){st={open:false,all:false};mainViewState.set(p.key,st)}
    const prize=payout(p.k,p.best);
    maxStat.classList.add('maxDetailsStat');
    maxStat.classList.toggle('open',!!st.open);
    maxStat.setAttribute('role','button');
    maxStat.setAttribute('tabindex','0');
    maxStat.setAttribute('aria-expanded',st.open?'true':'false');
    const span=maxStat.querySelector('span');
    if(span)span.innerHTML=`Макс.<small class="maxDetailsHint">${p.maxDraws.length} раз${prize>0?` · ${money(prize)}`:''} ${st.open?'▲':'▼'}</small>`;
    const old=box.querySelector('.maxDetailsPanel');if(old)old.remove();
    if(st.open){
      const panel=document.createElement('div');panel.className='maxDetailsPanel';panel.innerHTML=mainPanelHtml(p,st.all);stats.insertAdjacentElement('afterend',panel);
      const close=document.getElementById('maxDetailsClose');if(close)close.onclick=e=>{e.stopPropagation();st.open=false;st.all=false;enhanceMainHistory()};
      const more=document.getElementById('maxDetailsMore');if(more)more.onclick=e=>{e.stopPropagation();st.all=!st.all;enhanceMainHistory()};
    }
    const toggle=()=>{st.open=!st.open;if(!st.open)st.all=false;enhanceMainHistory()};
    maxStat.onclick=toggle;
    maxStat.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}};
  }

  function patchMainRender(){
    if(typeof renderHistory!=='function')return false;
    if(renderHistory.__comboMaxDetailsPatched)return true;
    const original=renderHistory;
    const wrapped=function(){original();enhanceMainHistory()};
    wrapped.__comboMaxDetailsPatched=true;
    renderHistory=wrapped;
    return true;
  }

  function patchUnlimitedHistoryMarks(){
    try{
      if(typeof historyMarks==='undefined')return false;
      if(typeof markBarHTML==='function'){
        markBarHTML=function(){
          const a=[...historyMarks].sort((x,y)=>x-y);
          return `<div class="markHelp">Нажмите на любое число в тираже — это же число подсветится во всех показанных тиражах. Подсветка не ограничена: можно отметить хоть все 20 чисел тиража.</div>${a.length?`<div class="markBar"><span class="muted">Подсвечено (${a.length}):</span>${a.map(n=>`<span class="markChip">${fmt(n)}</span>`).join('')}<button id="markClear" class="markClear" type="button">Снять всё</button></div>`:''}`;
        };
      }
      if(typeof toggleHistoryMark==='function'){
        toggleHistoryMark=function(n){
          n=Number(n);
          if(!Number.isInteger(n)||n<1||n>80)return;
          if(historyMarks.has(n))historyMarks.delete(n);else historyMarks.add(n);
          renderHistory();
        };
      }
      return true;
    }catch(e){console.warn('COMBO unlimited history marks',e);return false}
  }

  function searchPayload(){
    try{
      const box=document.getElementById('csDetail');
      if(!box||box.classList.contains('hidden'))return null;
      const head=box.querySelector('.csDetailHead');
      const comboText=head?.querySelector('b')?.textContent||'';
      const nums=(comboText.match(/\d+/g)||[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=80);
      if(!nums.length)return null;
      const archive=(typeof DRAWS!=='undefined'&&Array.isArray(DRAWS)&&DRAWS.length)?DRAWS:[];
      if(!archive.length)return null;
      const input=document.getElementById('csDrawValue');
      let count=Math.floor(Number(input?.value||input?.textContent||1));
      if(!Number.isFinite(count)||count<1)count=1;
      count=Math.min(count,archive.length);
      const draws=[...archive].sort((a,b)=>Number(b.draw)-Number(a.draw)).slice(0,count);
      if(!draws.length)return null;
      const best=Math.max(...draws.map(d=>hits(nums,d)));
      const maxDraws=draws.filter(d=>hits(nums,d)===best);
      return {box,head,nums,draws,best,maxDraws,k:nums.length,key:comboKey(nums),count};
    }catch(e){return null}
  }

  function searchPanelInner(p,st){
    const prize=payout(p.k,p.best);
    const total=prize*p.maxDraws.length;
    const payoutText=prize>0?`${money(prize)} за выход · всего ${money(total)}`:'выплаты за этот уровень нет';
    return `<div class="comboMaxHead"><div><div class="comboMaxTitle">МАКСИМАЛЬНЫЙ ВЫХОД · ${p.best}/${p.k}</div><div class="comboMaxSummary">${p.maxDraws.length} раз · ${payoutText}</div></div><button id="csMaxClose" class="comboMaxClose" type="button">Свернуть ▲</button></div><div class="comboMaxList">${occurrenceRowsHtml(p,st.all)}</div>${moreButtonHtml(p,st.all,'csMaxMore')}`;
  }

  function renderSearchMaxBox(p,force=false){
    if(!p?.head)return;
    let st=searchViewState.get(p.key);
    if(!st){st={open:false,all:false};searchViewState.set(p.key,st)}
    const signature=[p.key,p.count,p.best,p.maxDraws.length,p.maxDraws[0]?.draw||'',st.open?1:0,st.all?1:0].join('|');
    let wrap=p.box.querySelector('.csMaxDetailsWrap');
    if(!wrap){wrap=document.createElement('div');wrap.className='csMaxDetailsWrap';p.head.insertAdjacentElement('afterend',wrap)}
    else if(!force&&wrap.dataset.signature===signature)return;
    const prize=payout(p.k,p.best);
    wrap.dataset.signature=signature;
    wrap.innerHTML=`<button id="csMaxSummaryBtn" class="csMaxSummaryBtn ${st.open?'open':''}" type="button" aria-expanded="${st.open?'true':'false'}"><span class="csMaxSummaryMain"><span class="csMaxSummaryTitle">🏆 Максимум: ${p.best}/${p.k}</span><span class="csMaxSummarySub">${p.maxDraws.length} раз${prize>0?` · ${money(prize)} за выход`:''} · нажмите, чтобы посмотреть когда</span></span><span class="csMaxChevron">${st.open?'▲':'▼'}</span></button>${st.open?`<div class="csMaxDetailsPanel">${searchPanelInner(p,st)}</div>`:''}`;
    const summary=wrap.querySelector('#csMaxSummaryBtn');if(summary)summary.onclick=()=>{st.open=!st.open;if(!st.open)st.all=false;renderSearchMaxBox(searchPayload()||p,true)};
    const close=wrap.querySelector('#csMaxClose');if(close)close.onclick=e=>{e.stopPropagation();st.open=false;st.all=false;renderSearchMaxBox(searchPayload()||p,true)};
    const more=wrap.querySelector('#csMaxMore');if(more)more.onclick=e=>{e.stopPropagation();st.all=!st.all;renderSearchMaxBox(searchPayload()||p,true)};
  }

  function searchMarksFor(p){
    let marks=searchMarkState.get(p.key);
    if(!marks){marks=new Set();searchMarkState.set(p.key,marks)}
    return marks;
  }

  function applySearchMarks(p){
    if(!p?.box)return;
    const marks=searchMarksFor(p);
    const hist=p.box.querySelector('.hist');
    if(!hist)return;
    let wrap=p.box.querySelector('.csSearchMarkWrap');
    if(!wrap){wrap=document.createElement('div');wrap.className='csSearchMarkWrap';hist.insertAdjacentElement('beforebegin',wrap)}
    const marked=[...marks].sort((a,b)=>a-b);
    wrap.innerHTML=`<div class="csSearchMarkHelp">Нажмите на любое число в тираже — это же число подсветится во всех показанных тиражах. Без ограничения: можно отметить хоть все 20 чисел тиража.</div>${marked.length?`<div class="csSearchMarkBar"><span class="muted">Подсвечено (${marked.length}):</span>${marked.map(n=>`<span class="csSearchMarkChip">${fmt(n)}</span>`).join('')}<button class="csSearchMarkClear" type="button">Снять всё</button></div>`:''}`;
    const clear=wrap.querySelector('.csSearchMarkClear');if(clear)clear.onclick=()=>{marks.clear();applySearchMarks(p)};
    p.box.querySelectorAll('.hist .dn').forEach(el=>{
      const n=Number(String(el.textContent||'').trim());
      if(!Number.isInteger(n)||n<1||n>80)return;
      el.classList.toggle('mark',marks.has(n));
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.setAttribute('aria-pressed',marks.has(n)?'true':'false');
      const toggle=e=>{e?.preventDefault?.();if(marks.has(n))marks.delete(n);else marks.add(n);applySearchMarks(p)};
      el.onclick=toggle;
      el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){toggle(e)}};
    });
  }

  function enhanceSearchDetail(){
    const p=searchPayload();
    if(!p)return;
    renderSearchMaxBox(p,false);
    applySearchMarks(p);
  }
  function scheduleSearchEnhance(){clearTimeout(searchTimer);searchTimer=setTimeout(enhanceSearchDetail,0)}
  function observeSearchDetail(){
    if(searchObserver)return;
    searchObserver=new MutationObserver(()=>scheduleSearchEnhance());
    searchObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','value']});
    scheduleSearchEnhance();
  }

  function init(){
    addCss();
    patchUnlimitedHistoryMarks();
    if(patchMainRender())enhanceMainHistory();
    else setTimeout(()=>{patchUnlimitedHistoryMarks();if(patchMainRender())enhanceMainHistory()},250);
    observeSearchDetail();
    setTimeout(()=>{const v=document.querySelector('.version');if(v&&!document.getElementById('appVersionOwner'))v.textContent='Версия v'+VERSION},0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
