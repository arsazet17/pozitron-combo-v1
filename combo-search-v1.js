/* COMBO KENO — extension: Поиск комб + локальное закрытие текущей истории
   v4.1.16-search1, 02.09.2026
*/
(() => {
  'use strict';

  const EXT_VERSION = 'v4.1.16';
  const PAGE_SIZE = 100;
  const BASE = 81;
  const C20 = {3:1140,4:4845,5:15504,6:38760,7:77520};

  function q(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function f2(n){ return String(n).padStart(2,'0'); }
  function ruDateToISO(s){
    const m=String(s||'').match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
    if(!m)return '';
    let y=Number(m[3]); if(y<100)y+=2000;
    return `${y}-${m[2]}-${m[1]}`;
  }
  function isoToRu(s){
    const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}.${m[2]}.${String(Number(m[1])%100).padStart(2,'0')}` : '';
  }
  function encodeNums(nums){ let k=0; for(const n of nums) k=k*BASE+n; return k; }
  function decodeKey(key,size){
    const a=new Array(size);
    for(let i=size-1;i>=0;i--){ a[i]=key%BASE; key=Math.floor(key/BASE); }
    return a;
  }

  function css(){
    if(q('comboSearchStyles'))return;
    const s=document.createElement('style');
    s.id='comboSearchStyles';
    s.textContent=`
      .comboSearchCard{background:linear-gradient(180deg,rgba(15,39,62,.98),rgba(7,24,39,.98));border:1px solid var(--line);border-radius:15px;padding:11px;margin:9px 0}
      .csTitle{font-size:20px;font-weight:950;margin:0 0 4px}.csSub{font-size:11px;color:var(--muted);margin-bottom:10px}
      .csLabel{font-size:11px;color:#c5d5e4;font-weight:900;margin:9px 0 5px}.csModes{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.csModes.size{grid-template-columns:repeat(5,1fr)}
      .csModes button{padding:9px 3px;font-size:11px}.csDate{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end;margin-top:7px}.csDate input{width:100%;background:#061421;color:#fff;border:1px solid #2e526d;border-radius:9px;padding:9px}
      .csGo{width:100%;margin-top:9px}.csStatus{margin-top:8px;padding:8px;border:1px solid #294b66;border-radius:9px;background:#081827;font-size:11px;color:#c7d7e6;line-height:1.4}
      .csStatus.busy{color:#ffe28a}.csStatus.err{color:#ffb6b6;border-color:#743c42}.csSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:8px}.csStat{padding:8px 5px;text-align:center;border:1px solid #294b66;background:#081827;border-radius:10px}.csStat b{display:block;font-size:16px;color:var(--green)}.csStat span{font-size:9px;color:var(--muted)}
      .csList{display:grid;gap:6px;margin-top:8px}.csItem{display:grid;grid-template-columns:1fr auto auto;gap:7px;align-items:center;text-align:left;padding:9px;background:#0a1c2d;border:1px solid #315677;border-radius:11px}.csNums{font-weight:950;font-size:14px}.csMeta{font-size:10px;color:var(--muted);margin-top:2px}.csCount{font-weight:950;color:var(--gold);font-size:13px}.csArrow{font-size:17px;color:#9eb0c1}.csMore{width:100%;margin-top:8px}
      .csDetail{margin-top:10px}.csDetailHead{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:7px}.csDetailHead b{font-size:15px}.csClose{margin-left:auto;padding:6px 9px;background:#281520;border-color:#6d3343;color:#ffd2d7;font-size:10px}
      .historyDismissBtn{padding:5px 8px!important;margin-left:3px;background:#281520!important;border-color:#6d3343!important;color:#ffd2d7!important;font-size:10px!important;border-radius:8px!important}
      @media(max-width:380px){.csModes button{font-size:10px;padding:8px 2px}.csItem{grid-template-columns:1fr auto auto}.csNums{font-size:13px}}
    `;
    document.head.appendChild(s);
  }

  function addSection(){
    if(q('comboSearch'))return;
    const sec=document.createElement('section');
    sec.id='comboSearch'; sec.className='section';
    sec.innerHTML=`
      <div class="comboSearchCard">
        <div class="csTitle">🔍 Комбы</div>
        <div class="csSub">Система сама перебирает архив и находит все комбинации, которые хотя бы один раз полностью вышли в выбранном окне.</div>
        <div class="csLabel">ТИРАЖИ</div>
        <div class="csModes" id="csWindowModes">
          <button type="button" data-csw="5">5</button><button type="button" class="active" data-csw="10">10</button><button type="button" data-csw="20">20</button><button type="button" data-csw="60">60</button>
        </div>
        <div class="csLabel">ИЛИ ДАТА</div>
        <div class="csDate"><input id="csDateInput" type="date"><button id="csToday" type="button">Сегодня</button></div>
        <div class="csLabel">РАЗМЕР КОМБЫ</div>
        <div class="csModes size" id="csSizeModes">
          <button type="button" class="active" data-css="3">3К</button><button type="button" data-css="4">4К</button><button type="button" data-css="5">5К</button><button type="button" data-css="6">6К</button><button type="button" data-css="7">7К</button>
        </div>
        <button id="csGo" class="primary csGo" type="button">🔍 НАЙТИ КОМБЫ</button>
        <div id="csStatus" class="csStatus">Выберите количество тиражей или дату и размер комбинации.</div>
        <div id="csSummary"></div>
      </div>
      <div id="csResults" class="comboSearchCard hidden"></div>
      <div id="csDetail" class="comboSearchCard hidden"></div>`;
    const app=document.querySelector('.app');
    if(app)app.appendChild(sec);
  }

  function addNav(){
    if(q('comboSearchNav'))return;
    const row=document.querySelector('.footrow2');
    if(!row)return;
    const spacers=[...row.querySelectorAll('.navSpacer')];
    const slot=spacers[0];
    const b=document.createElement('button');
    b.id='comboSearchNav'; b.className='nav'; b.type='button';
    b.innerHTML='<b>🔍</b>Комбы';
    if(slot)row.replaceChild(b,slot); else row.appendChild(b);
    b.onclick=()=>{
      try{ if(typeof closeSavedDrawer==='function')closeSavedDrawer(); }catch(e){}
      try{ if(typeof closeTableDrawer==='function')closeTableDrawer(); }catch(e){}
      document.querySelectorAll('.section').forEach(s=>s.classList.toggle('on',s.id==='comboSearch'));
      document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n===b));
      window.scrollTo({top:0,behavior:'smooth'});
    };
  }

  const state={window:10,size:3,date:'',codes:null,cursor:0,groupsShown:0,draws:[],totalGroups:null,busy:false};

  function setModeButtons(root,attr,val){
    root.querySelectorAll(`[${attr}]`).forEach(b=>b.classList.toggle('active',Number(b.getAttribute(attr))===Number(val)));
  }
  function selectedDraws(){
    const all=(typeof DRAWS!=='undefined' && Array.isArray(DRAWS)) ? DRAWS : [];
    if(state.date){
      const rd=isoToRu(state.date);
      return all.filter(d=>String(d.date)===rd);
    }
    return all.slice(-state.window);
  }

  function fillCombos(sortedBalls,k,out,offset){
    const pick=new Array(k);
    function rec(start,depth){
      if(depth===k){ out[offset++]=encodeNums(pick); return; }
      const need=k-depth;
      for(let i=start;i<=sortedBalls.length-need;i++){
        pick[depth]=sortedBalls[i]; rec(i+1,depth+1);
      }
    }
    rec(0,0); return offset;
  }

  async function buildCodes(draws,k){
    const per=C20[k];
    const total=draws.length*per;
    const out=new Float64Array(total);
    let off=0;
    for(let i=0;i<draws.length;i++){
      const balls=[...draws[i].balls].sort((a,b)=>a-b);
      off=fillCombos(balls,k,out,off);
      if((i+1)%4===0){
        q('csStatus').textContent=`Перебор: ${i+1} из ${draws.length} тиражей · ${off.toLocaleString('ru-RU')} комбинаций…`;
        await new Promise(r=>setTimeout(r,0));
      }
    }
    q('csStatus').textContent=`Сортирую ${total.toLocaleString('ru-RU')} комбинаций…`;
    await new Promise(r=>setTimeout(r,0));
    out.sort();
    return out;
  }

  function countUnique(codes){
    if(!codes?.length)return 0;
    let n=1; for(let i=1;i<codes.length;i++)if(codes[i]!==codes[i-1])n++; return n;
  }

  function takeGroups(limit){
    const a=state.codes, rows=[]; if(!a)return rows;
    let i=state.cursor;
    while(i<a.length && rows.length<limit){
      const key=a[i]; let j=i+1; while(j<a.length && a[j]===key)j++;
      rows.push({key,count:j-i,nums:decodeKey(key,state.size)}); i=j;
    }
    state.cursor=i; state.groupsShown+=rows.length; return rows;
  }

  function appendRows(rows){
    const list=q('csList');
    for(const r of rows){
      const b=document.createElement('button'); b.type='button'; b.className='csItem'; b.dataset.cskey=String(r.key);
      b.innerHTML=`<span><span class="csNums">${r.nums.map(f2).join(' ')}</span><span class="csMeta">полностью вышла ${r.count} ${r.count===1?'раз':'раз(а)'}</span></span><span class="csCount">🔥 ${r.count}</span><span class="csArrow">›</span>`;
      b.onclick=()=>showDetail(r.key,r.nums,r.count); list.appendChild(b);
    }
  }

  function renderResults(){
    const box=q('csResults'); box.classList.remove('hidden');
    box.innerHTML=`<h2 style="margin:0 0 5px">Найденные ${state.size}К</h2><div class="muted">Нажмите на любую комбу — ниже откроется, как она шла во всех выбранных тиражах.</div><div id="csList" class="csList"></div><button id="csMore" class="csMore" type="button">ПОКАЗАТЬ ЕЩЁ</button>`;
    appendRows(takeGroups(PAGE_SIZE));
    const more=q('csMore');
    const refresh=()=>{ more.textContent=`ПОКАЗАТЬ ЕЩЁ · показано ${state.groupsShown.toLocaleString('ru-RU')}${state.totalGroups!=null?' из '+state.totalGroups.toLocaleString('ru-RU'):''}`; if(state.cursor>=state.codes.length)more.classList.add('hidden'); };
    more.onclick=()=>{ appendRows(takeGroups(PAGE_SIZE)); refresh(); };
    refresh();
  }

  function detailHitCell(h,k){
    try{ if(typeof hitCell==='function')return hitCell(h,k); }catch(e){}
    const prize=(typeof PAYOUTS!=='undefined')?Number(PAYOUTS?.combination?.[String(k)]?.[String(h)]||0):0;
    return `<div class="hitbox"><div class="hits ${prize?'fire':h===0?'z':h>=2?'h':'o'}">${prize?'🔥 ':''}${h}</div>${prize?`<div class="prize">Сумма<br>${prize.toLocaleString('ru-RU')} ₽</div>`:''}</div>`;
  }
  function detailRow(d,nums){
    const balls=[...d.balls].sort((a,b)=>a-b); let h=0; for(const n of nums)if(d.balls.includes(n))h++;
    const col=(Number.isInteger(Number(d.column))?Number(d.column):'—');
    return `<div class="hrow"><div class="hcell"><div class="hdraw">${d.draw}</div><div class="hsub">Столб ${col}</div><div class="hdate">${d.date} ${d.time}</div></div><div class="hcell">${detailHitCell(h,nums.length)}</div><div class="hcell drawnums">${balls.map(n=>`<span class="dn ${nums.includes(n)?'hit':''}">${f2(n)}</span>`).join('')}</div></div>`;
  }
  function showDetail(key,nums,fullCount){
    const box=q('csDetail'); box.classList.remove('hidden');
    box.innerHTML=`<div class="csDetailHead"><b>${nums.map(f2).join(' ')}</b><span class="muted">🔥 полностью: ${fullCount}</span><button id="csDetailClose" class="csClose" type="button">✕ Закрыть</button></div><div class="historyTools"><button type="button" class="active">⬆️ Возрастание</button></div><div class="hist"><div class="hrow head"><div class="hcell">Тираж / Столб / Дата</div><div class="hcell">Попад.</div><div class="hcell">Числа тиража · ⬆️ · 2×10</div></div>${[...state.draws].sort((a,b)=>b.draw-a.draw).map(d=>detailRow(d,nums)).join('')}</div>`;
    q('csDetailClose').onclick=()=>{box.classList.add('hidden');box.innerHTML='';};
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function runSearch(){
    if(state.busy)return;
    const draws=selectedDraws();
    if(!draws.length){ q('csStatus').className='csStatus err'; q('csStatus').textContent='За выбранный период тиражи не найдены.'; return; }
    state.busy=true; state.draws=draws; state.codes=null; state.cursor=0; state.groupsShown=0; state.totalGroups=null;
    q('csResults').classList.add('hidden'); q('csDetail').classList.add('hidden'); q('csDetail').innerHTML='';
    q('csStatus').className='csStatus busy';
    const go=q('csGo'); go.disabled=true; go.textContent='ИЩУ…';
    try{
      const total=draws.length*C20[state.size];
      q('csStatus').textContent=`Проверяю ${draws.length} тиражей · ${state.size}К · до ${total.toLocaleString('ru-RU')} комбинаций…`;
      const codes=await buildCodes(draws,state.size); state.codes=codes;
      q('csStatus').textContent='Считаю уникальные комбинации…'; await new Promise(r=>setTimeout(r,0));
      state.totalGroups=countUnique(codes);
      q('csStatus').className='csStatus';
      q('csStatus').textContent=`Готово: ${draws.length} тиражей · ${state.size}К · найдено ${state.totalGroups.toLocaleString('ru-RU')} разных комб. Показаны первые ${Math.min(PAGE_SIZE,state.totalGroups)}; остальные — кнопкой «Показать ещё».`;
      q('csSummary').innerHTML=`<div class="csSummary"><div class="csStat"><b>${draws.length}</b><span>тиражей</span></div><div class="csStat"><b>${state.size}К</b><span>размер</span></div><div class="csStat"><b>${state.totalGroups.toLocaleString('ru-RU')}</b><span>разных комб</span></div></div>`;
      renderResults();
    }catch(e){ console.error('COMBO SEARCH',e); q('csStatus').className='csStatus err'; q('csStatus').textContent='Ошибка поиска: '+(e?.message||e); }
    finally{state.busy=false;go.disabled=false;go.textContent='🔍 НАЙТИ КОМБЫ';}
  }

  function bind(){
    q('csWindowModes').querySelectorAll('[data-csw]').forEach(b=>b.onclick=()=>{state.window=Number(b.dataset.csw);state.date='';q('csDateInput').value='';setModeButtons(q('csWindowModes'),'data-csw',state.window)});
    q('csSizeModes').querySelectorAll('[data-css]').forEach(b=>b.onclick=()=>{state.size=Number(b.dataset.css);setModeButtons(q('csSizeModes'),'data-css',state.size)});
    q('csDateInput').onchange=e=>{state.date=e.target.value;if(state.date)q('csWindowModes').querySelectorAll('button').forEach(b=>b.classList.remove('active'));};
    q('csToday').onclick=()=>{const last=(typeof DRAWS!=='undefined'&&DRAWS.length)?DRAWS[DRAWS.length-1]:null;const iso=last?ruDateToISO(last.date):new Date().toISOString().slice(0,10);state.date=iso;q('csDateInput').value=iso;q('csWindowModes').querySelectorAll('button').forEach(b=>b.classList.remove('active'));};
    q('csGo').onclick=runSearch;
  }

  function patchHistoryDismiss(){
    if(typeof renderHistory!=='function' || renderHistory.__comboSearchPatched)return;
    const original=renderHistory;
    const wrapped=function(){
      original();
      const box=q('historyBox'); if(!box||!lastResult)return;
      const numsRow=box.querySelector('.resultTop'); if(!numsRow||numsRow.querySelector('.historyDismissBtn'))return;
      const del=document.createElement('button'); del.type='button'; del.className='historyDismissBtn'; del.textContent='✕'; del.title='Убрать эту комбу только с текущего экрана';
      del.onclick=()=>{
        lastResult=null; historyMarks?.clear?.(); selected=[];
        try{renderPick();}catch(e){}
        box.innerHTML='<h2>История</h2><div class="msg">Текущая комбинация убрана с этого экрана. Сохранённые и «Наши комбы» не изменены.</div>';
      };
      numsRow.appendChild(del);
    };
    wrapped.__comboSearchPatched=true; renderHistory=wrapped;
  }

  function updateVersion(){
    const v=document.querySelector('.version'); if(v)v.textContent='Версия '+EXT_VERSION;
  }

  function init(){
    css(); addSection(); addNav(); bind(); patchHistoryDismiss(); updateVersion();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
