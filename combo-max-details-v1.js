/* COMBO KENO — Максимальные выходы выбранной комбинации
   v4.3.18 · раскрытие плитки «Макс.»: тираж, дата/время, столб, попадания и выплата.
*/
(() => {
  'use strict';

  const VERSION='4.3.18';
  const PREVIEW_LIMIT=4;
  const viewState=new Map();

  const fmt=n=>String(Number(n)).padStart(2,'0');
  const money=n=>`${Number(n||0).toLocaleString('ru-RU')} ₽`;
  const comboKey=nums=>(nums||[]).map(Number).sort((a,b)=>a-b).join('-');

  function payout(k,h){
    try{
      if(typeof PAYOUTS!=='undefined')return Number(PAYOUTS?.combination?.[String(k)]?.[String(h)]||0);
    }catch(e){}
    return 0;
  }

  function columnOf(d){
    try{if(typeof drawColumn==='function')return drawColumn(d)}catch(e){}
    const c=Number(d?.column);return Number.isInteger(c)?c:null;
  }

  function hitNumbers(nums,d){
    const set=new Set((d?.balls||[]).map(Number));
    return (nums||[]).map(Number).filter(n=>set.has(n));
  }

  function hits(nums,d){return hitNumbers(nums,d).length}

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
      #historyBox .maxDetailsHead{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:7px}
      #historyBox .maxDetailsTitle{font-weight:950;font-size:13px;color:#fff}
      #historyBox .maxDetailsSummary{font-size:10px;color:#ffcf5c;margin-top:2px;line-height:1.35}
      #historyBox .maxDetailsClose{padding:5px 8px;border-radius:8px;background:#0a1c2d;color:#c9d9e7;font-size:10px;white-space:nowrap}
      #historyBox .maxDetailsList{display:grid;gap:6px}
      #historyBox .maxDetailsRow{padding:8px;border:1px solid #294b66;border-radius:9px;background:#071725}
      #historyBox .maxDetailsRowTop{display:flex;align-items:center;justify-content:space-between;gap:7px;font-size:11px;font-weight:900}
      #historyBox .maxDetailsDraw{color:#fff}.maxDetailsPrize{color:#ffbd23;white-space:nowrap}
      #historyBox .maxDetailsMeta{margin-top:3px;font-size:10px;color:#b7c8d7;line-height:1.35}
      #historyBox .maxDetailsHits{margin-top:4px;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
      #historyBox .maxDetailsHit{padding:3px 5px;border-radius:6px;background:#26752d;border:1px solid #67c93f;color:#fff;font-size:10px;font-weight:900}
      #historyBox .maxDetailsToggle{width:100%;margin-top:7px;padding:7px;border-radius:8px;background:#0b2032;color:#d5e3ee;font-size:10px}
      @media(max-width:380px){#historyBox .maxDetailsRowTop{font-size:10px}#historyBox .maxDetailsSummary,#historyBox .maxDetailsMeta{font-size:9px}}
    `;
    document.head.appendChild(s);
  }

  function currentPayload(){
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

  function panelHtml(p,showAll){
    const prize=payout(p.k,p.best);
    const total=prize*p.maxDraws.length;
    const visible=showAll?p.maxDraws:p.maxDraws.slice(0,PREVIEW_LIMIT);
    const payoutText=prize>0?`по ${money(prize)} · всего ${money(total)}`:'выплаты за этот уровень нет';
    const rows=visible.map(d=>{
      const hn=hitNumbers(p.nums,d),col=columnOf(d),amount=payout(p.k,hn.length);
      return `<div class="maxDetailsRow">
        <div class="maxDetailsRowTop"><span class="maxDetailsDraw">${amount>0?'🔥 ':''}№${d.draw}</span><span class="maxDetailsPrize">${hn.length}/${p.k}${amount>0?` · ${money(amount)}`:''}</span></div>
        <div class="maxDetailsMeta">${d.date||'—'} · ${d.time||'—'} · столб ${col??'—'}</div>
        <div class="maxDetailsHits"><span class="maxDetailsMeta">Попали:</span>${hn.map(n=>`<span class="maxDetailsHit">${fmt(n)}</span>`).join('')}</div>
      </div>`;
    }).join('');
    const toggle=p.maxDraws.length>PREVIEW_LIMIT?`<button id="maxDetailsMore" class="maxDetailsToggle" type="button">${showAll?'Свернуть ▲':`Развернуть все (${p.maxDraws.length}) ▼`}</button>`:'';
    return `<div class="maxDetailsHead"><div><div class="maxDetailsTitle">МАКСИМАЛЬНЫЕ ВЫХОДЫ · ${p.best}/${p.k}</div><div class="maxDetailsSummary">${p.maxDraws.length} ${p.maxDraws.length===1?'раз':'раза/раз'} · ${payoutText}</div></div><button id="maxDetailsClose" class="maxDetailsClose" type="button">Свернуть ▲</button></div><div class="maxDetailsList">${rows||'<div class="muted">Максимальные выходы не найдены.</div>'}</div>${toggle}`;
  }

  function enhanceHistory(){
    const p=currentPayload();
    const box=document.getElementById('historyBox');
    if(!p||!box)return;
    const stats=box.querySelector('.stats');
    if(!stats)return;
    const maxStat=[...stats.querySelectorAll('.stat')].find(el=>String(el.querySelector('span')?.textContent||'').trim().startsWith('Макс.'));
    if(!maxStat)return;

    let st=viewState.get(p.key);if(!st){st={open:false,all:false};viewState.set(p.key,st)}
    const prize=payout(p.k,p.best);
    maxStat.classList.add('maxDetailsStat');
    maxStat.classList.toggle('open',!!st.open);
    maxStat.setAttribute('role','button');maxStat.setAttribute('tabindex','0');
    maxStat.setAttribute('aria-expanded',st.open?'true':'false');
    const span=maxStat.querySelector('span');
    if(span)span.innerHTML=`Макс.<small class="maxDetailsHint">${p.maxDraws.length} раз${prize>0?` · ${money(prize)}`:''} ${st.open?'▲':'▼'}</small>`;

    const old=box.querySelector('.maxDetailsPanel');if(old)old.remove();
    if(st.open){
      const panel=document.createElement('div');panel.className='maxDetailsPanel';panel.innerHTML=panelHtml(p,st.all);
      stats.insertAdjacentElement('afterend',panel);
      const close=document.getElementById('maxDetailsClose');if(close)close.onclick=e=>{e.stopPropagation();st.open=false;enhanceHistory()};
      const more=document.getElementById('maxDetailsMore');if(more)more.onclick=e=>{e.stopPropagation();st.all=!st.all;enhanceHistory()};
    }
    const toggle=()=>{st.open=!st.open;if(!st.open)st.all=false;enhanceHistory()};
    maxStat.onclick=toggle;
    maxStat.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}};
  }

  function patch(){
    if(typeof renderHistory!=='function'||renderHistory.__comboMaxDetailsPatched)return false;
    const original=renderHistory;
    const wrapped=function(){original();enhanceHistory()};
    wrapped.__comboMaxDetailsPatched=true;
    renderHistory=wrapped;
    enhanceHistory();
    return true;
  }

  function init(){
    addCss();
    if(!patch())setTimeout(patch,250);
    setTimeout(()=>{const v=document.querySelector('.version');if(v)v.textContent='Версия v'+VERSION},0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
