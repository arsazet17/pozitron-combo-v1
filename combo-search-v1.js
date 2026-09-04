/* COMBO KENO — Поиск разных комб
   v4.1.23-draw-count-archive, 02.09.2026
   Новый принцип: не выводим миллионы лексикографических вариантов.
   Формируем пул из реально ходивших чисел, оцениваем ход по всему окну
   и показываем 4 максимально разные комбинации.
*/
(() => {
  'use strict';

  const EXT_VERSION='v4.1.25';
  const RESULT_LIMIT=4;
  const detailDrawCounts=new Map();
  const DETAIL_MIN_DRAWS=5;

  function q(id){return document.getElementById(id)}
  function f2(n){return String(n).padStart(2,'0')}
  function ruDateToISO(s){
    const m=String(s||'').match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
    if(!m)return '';
    let y=Number(m[3]); if(y<100)y+=2000;
    return `${y}-${m[2]}-${m[1]}`;
  }
  function isoToRu(s){
    const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}.${m[2]}.${String(Number(m[1])%100).padStart(2,'0')}`:'';
  }
  function comboKey(nums){return [...nums].sort((a,b)=>a-b).join('-')}
  function overlap(a,b){let n=0;for(const x of a)if(b.includes(x))n++;return n}

  function css(){
    if(q('comboSearchStyles'))return;
    const s=document.createElement('style');
    s.id='comboSearchStyles';
    s.textContent=`
      .comboSearchCard{background:linear-gradient(180deg,rgba(15,39,62,.98),rgba(7,24,39,.98));border:1px solid var(--line);border-radius:15px;padding:11px;margin:9px 0}
      .csTitle{font-size:20px;font-weight:950;margin:0 0 4px}.csSub{font-size:11px;color:var(--muted);margin-bottom:10px;line-height:1.35}
      .csLabel{font-size:11px;color:#c5d5e4;font-weight:900;margin:9px 0 5px}
      .csModes{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.csModes.size{grid-template-columns:repeat(5,1fr)}
      .csModes button{padding:9px 3px;font-size:11px}.csDate{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end;margin-top:7px}
      .csDate input{width:100%;background:#061421;color:#fff;border:1px solid #2e526d;border-radius:9px;padding:9px}
      .csGo{width:100%;margin-top:9px}.csStatus{margin-top:8px;padding:8px;border:1px solid #294b66;border-radius:9px;background:#081827;font-size:11px;color:#c7d7e6;line-height:1.4}
      .csStatus.busy{color:#ffe28a}.csStatus.err{color:#ffb6b6;border-color:#743c42}
      .csSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:8px}.csStat{padding:8px 5px;text-align:center;border:1px solid #294b66;background:#081827;border-radius:10px}.csStat b{display:block;font-size:16px;color:var(--green)}.csStat span{font-size:9px;color:var(--muted)}
      .csList{display:grid;gap:7px;margin-top:8px}.csItem{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;text-align:left;padding:10px;background:#0a1c2d;border:1px solid #315677;border-radius:11px}
      .csNums{font-weight:950;font-size:14px;letter-spacing:.4px}.csMeta{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.35}.csFire{font-weight:950;color:var(--gold);font-size:13px;white-space:nowrap}
      .csDetail{margin-top:10px}.csDetailTools{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.csDetailTools .historyTools{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:1 1 260px}.csDetailTools .historyTools button{white-space:nowrap}.csDrawCount{display:flex;align-items:center;gap:5px;margin-left:auto;font-size:11px;color:var(--muted);font-weight:850}.csDrawCount input{width:72px;background:#061421;color:#fff;border:1px solid #315b7d;border-radius:9px;padding:8px 7px;text-align:center;font-weight:900}.csDetailHead{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:7px}.csDetailHead b{font-size:15px}.csClose{margin-left:auto;padding:6px 9px;background:#281520;border-color:#6d3343;color:#ffd2d7;font-size:10px}
      .historyDismissBtn{padding:5px 8px!important;margin-left:3px;background:#281520!important;border-color:#6d3343!important;color:#ffd2d7!important;font-size:10px!important;border-radius:8px!important}
      .csDetail .drawnums{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px 4px;align-items:center}.csDetail .dn{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:0;height:22px;padding:0 3px;border:1px solid transparent;border-radius:6px;box-sizing:border-box;line-height:1}.csDetail .dn.transition{padding-right:11px;background:#3a2a15;border-color:#d89a2b;color:#fff}.csDetail .dn.transition::after{content:'◆';position:absolute;right:2px;top:50%;transform:translateY(-50%);color:#ff9800;font-size:7px;line-height:1;text-shadow:none;z-index:2}.csDetail .dn.hit.transition{background:var(--green)!important;border-color:#d89a2b!important;color:#fff!important;box-shadow:0 0 0 1px rgba(216,154,43,.45) inset}
      @media(max-width:380px){.csModes button{font-size:10px;padding:8px 2px}.csNums{font-size:13px}}
    `;
    document.head.appendChild(s);
  }

  function addSection(){
    if(q('comboSearch'))return;
    const sec=document.createElement('section');
    sec.id='comboSearch';sec.className='section';
    sec.innerHTML=`
      <div class="comboSearchCard">
        <div class="csTitle">🔍 Комбы</div>
        <div class="csSub">Ищем не все миллионы вариантов, а 4 разные комбы с реальным ходом по выбранному отрезку. Почти одинаковые варианты автоматически отбрасываются.</div>
        <div class="csLabel">ТИРАЖИ</div>
        <div class="csModes" id="csWindowModes">
          <button type="button" data-csw="5">5</button>
          <button type="button" class="active" data-csw="10">10</button>
          <button type="button" data-csw="20">20</button>
          <button type="button" data-csw="60">60</button>
        </div>
        <div class="csLabel">ИЛИ ДАТА</div>
        <div class="csDate"><input id="csDateInput" type="date"><button id="csToday" type="button">Сегодня</button></div>
        <div class="csLabel">РАЗМЕР КОМБЫ</div>
        <div class="csModes size" id="csSizeModes">
          <button type="button" class="active" data-css="3">3К</button>
          <button type="button" data-css="4">4К</button>
          <button type="button" data-css="5">5К</button>
          <button type="button" data-css="6">6К</button>
          <button type="button" data-css="7">7К</button>
        </div>
        <button id="csGo" class="primary csGo" type="button">🔍 НАЙТИ КОМБЫ</button>
        <div id="csStatus" class="csStatus">Выберите отрезок и размер комбинации.</div>
        <div id="csSummary"></div>
      </div>
      <div id="csResults" class="comboSearchCard hidden"></div>
      <div id="csDetail" class="comboSearchCard csDetail hidden"></div>`;
    document.querySelector('.app')?.appendChild(sec);
  }

  function addNav(){
    if(document.querySelector('[data-sec="comboSearch"]'))return;
    const row=document.querySelector('.footrow2');
    if(!row)return;
    const spacer=row.querySelector('.navSpacer');
    const b=document.createElement('button');
    b.className='nav';b.type='button';b.dataset.sec='comboSearch';
    b.innerHTML='<b>🔍</b>Комбы';
    if(spacer)row.replaceChild(b,spacer);else row.appendChild(b);
    b.onclick=()=>{
      try{closeSavedDrawer?.();closeTableDrawer?.()}catch(e){}
      document.querySelectorAll('.section').forEach(s=>s.classList.toggle('on',s.id==='comboSearch'));
      document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n===b));
      window.scrollTo({top:0,behavior:'smooth'});
    };
  }

  const state={window:10,size:3,date:'',draws:[],rows:[],busy:false};

  function setActive(box,attr,val){
    box?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',Number(b.getAttribute(attr))===Number(val)));
  }

  function selectedDraws(){
    if(typeof DRAWS==='undefined'||!Array.isArray(DRAWS))return [];
    if(state.date){
      const ru=isoToRu(state.date);
      return DRAWS.filter(d=>String(d.date)===ru);
    }
    return DRAWS.slice(-Math.max(1,Number(state.window)||10));
  }

  function combinations(a,k,cb){
    const pick=new Array(k);
    function rec(start,depth){
      if(depth===k){cb(pick.slice());return}
      const need=k-depth;
      for(let i=start;i<=a.length-need;i++){pick[depth]=a[i];rec(i+1,depth+1)}
    }
    rec(0,0);
  }

  function trajectory(nums,draws){
    const k=nums.length;
    let full=0,sum=0,withHit=0,near=0,run=0,maxRun=0;
    const hits=[];
    for(const d of draws){
      let h=0;for(const n of nums)if(d.balls.includes(n))h++;
      hits.push(h);sum+=h;
      if(h===k)full++;
      if(h>0){withHit++;run++;if(run>maxRun)maxRun=run}else run=0;
      if(h>=k-1)near++;
    }
    // Полный выход важнее всего, затем почти полный ход, общий набор попаданий и устойчивость.
    const score=full*10000+near*500+sum*20+withHit*5+maxRun;
    return{full,sum,withHit,near,maxRun,hits,score};
  }

  async function buildCandidates(draws,k){
    const freq=Array(81).fill(0);
    for(const d of draws)for(const n of d.balls)freq[n]++;

    const pool=new Map();
    for(let di=0;di<draws.length;di++){
      const d=draws[di];
      // Берём наиболее "живые" числа конкретного тиража, но не один жёсткий набор.
      // k+4 даёт разнообразный, но ещё компактный пул.
      const ranked=[...d.balls].sort((a,b)=>freq[b]-freq[a]||a-b);
      const core=ranked.slice(0,Math.min(ranked.length,k+4));
      combinations(core,k,nums=>pool.set(comboKey(nums),nums));
      if(di%8===0)await new Promise(r=>setTimeout(r,0));
    }

    const rows=[];
    let i=0;
    for(const nums of pool.values()){
      const tr=trajectory(nums,draws);
      // Кандидат обязан хотя бы раз реально полностью выйти в этом окне.
      if(tr.full>0)rows.push({nums,...tr});
      if(++i%500===0)await new Promise(r=>setTimeout(r,0));
    }
    rows.sort((a,b)=>b.score-a.score||b.full-a.full||b.sum-a.sum||comboKey(a.nums).localeCompare(comboKey(b.nums)));
    return{rows,poolSize:pool.size};
  }

  function pickDiverse(rows,k,limit=RESULT_LIMIT){
    // Запрещаем "6 одинаковых + 1 новое".
    // 3К: максимум 1 общее, 4К:2, 5К:2, 6К:3, 7К:3.
    const strict=Math.floor(k/2);
    const picked=[];
    for(const r of rows){
      if(picked.every(p=>overlap(r.nums,p.nums)<=strict)){
        picked.push(r);if(picked.length>=limit)return picked;
      }
    }
    // Если окно очень маленькое и 4 строгих варианта физически нет,
    // слегка ослабляем, но никогда не допускаем k-1 одинаковых чисел.
    for(let allowed=strict+1;allowed<=Math.max(strict,k-2)&&picked.length<limit;allowed++){
      for(const r of rows){
        if(picked.includes(r))continue;
        if(picked.every(p=>overlap(r.nums,p.nums)<=allowed)){
          picked.push(r);if(picked.length>=limit)break;
        }
      }
    }
    return picked;
  }

  function prizeFor(k,h){
    try{return Number(PAYOUTS?.combination?.[String(k)]?.[String(h)]||0)}catch(e){return 0}
  }

  function detailHitCell(h,k){
    const prize=prizeFor(k,h);
    const cls=prize?'fire':h===0?'z':h>=2?'h':'o';
    return `<div class="hitbox"><div class="hits ${cls}">${prize?'🔥 ':''}${h}</div>${prize?`<div class="prize">Сумма<br>${prize.toLocaleString('ru-RU')} ₽</div>`:''}</div>`;
  }

  function transitionSetForDraw(d){
    const archive=(typeof DRAWS!=='undefined'&&Array.isArray(DRAWS)&&DRAWS.length)?DRAWS:state.draws;
    const idx=archive.findIndex(x=>Number(x.draw)===Number(d?.draw));
    if(idx<=0)return new Set();
    const prev=new Set((archive[idx-1]?.balls||[]).map(Number));
    return new Set((d?.balls||[]).map(Number).filter(n=>prev.has(Number(n))));
  }

  function detailRow(d,nums,showTransitions=false){
    const balls=[...d.balls].sort((a,b)=>a-b);
    const transitions=showTransitions?transitionSetForDraw(d):new Set();
    let h=0;for(const n of nums)if(d.balls.includes(n))h++;
    const col=Number.isInteger(Number(d.column))?Number(d.column):'—';
    return `<div class="hrow"><div class="hcell"><div class="hdraw">${d.draw}</div><div class="hsub">Столб ${col}</div><div class="hdate">${d.date} ${d.time}</div></div><div class="hcell">${detailHitCell(h,nums.length)}</div><div class="hcell drawnums">${balls.map(n=>`<span class="dn ${nums.includes(n)?'hit':''} ${transitions.has(Number(n))?'transition':''}">${f2(n)}</span>`).join('')}</div></div>`;
  }

  function showDetail(row){
    const box=q('csDetail'),key=comboKey(row.nums);
    let count=Number(detailDrawCounts.get(key)??DETAIL_MIN_DRAWS);
    if(!Number.isInteger(count)||count<DETAIL_MIN_DRAWS)count=DETAIL_MIN_DRAWS;
    detailDrawCounts.set(key,count);
    let showTransitions=false;
    const render=()=>{
      const archive=(typeof DRAWS!=='undefined'&&Array.isArray(DRAWS)&&DRAWS.length)?DRAWS:state.draws;
      const visible=[...archive].sort((a,b)=>b.draw-a.draw).slice(0,count);
      const detailStats=trajectory(row.nums,[...visible].sort((a,b)=>a.draw-b.draw));
      box.classList.remove('hidden');
      box.innerHTML=`<div class="csDetailHead"><b>${row.nums.map(f2).join(' ')}</b><span class="muted">🔥 полностью ${detailStats.full} · Σ ${detailStats.sum} · с попаданием ${detailStats.withHit}/${visible.length}</span><button id="csDetailClose" class="csClose" type="button">✕ Закрыть</button></div><div class="csDetailTools"><div class="historyTools"><button type="button" class="active">⬆️ Возрастание</button><button id="csTransitionsBtn" type="button" class="${showTransitions?'active':''}" aria-pressed="${showTransitions?'true':'false'}">🔸 Переходы</button></div><label class="csDrawCount">Тиражей <input id="csDrawCount" type="number" min="${DETAIL_MIN_DRAWS}" step="1" inputmode="numeric" value="${count}" aria-label="Количество тиражей"></label></div><div class="hist"><div class="hrow head"><div class="hcell">Тираж / Столб / Дата</div><div class="hcell">Попад.</div><div class="hcell">Числа тиража · ⬆️ · 2×10</div></div>${visible.map(d=>detailRow(d,row.nums,showTransitions)).join('')}</div>`;
      q('csDetailClose').onclick=()=>{box.classList.add('hidden');box.innerHTML=''};
      const transitionsBtn=q('csTransitionsBtn');
      if(transitionsBtn)transitionsBtn.onclick=()=>{showTransitions=!showTransitions;render()};
      const input=q('csDrawCount');
      const apply=()=>{let v=Math.floor(Number(input.value));if(!Number.isFinite(v)||v<DETAIL_MIN_DRAWS)v=DETAIL_MIN_DRAWS;count=v;detailDrawCounts.set(key,v);render()};
      input.onchange=apply;
      input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();apply()}};
    };
    render();
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderResults(){
    const box=q('csResults');box.classList.remove('hidden');
    box.innerHTML=`<h2 style="margin:0 0 5px">Разные ${state.size}К</h2><div class="muted">Выбраны лучшие разные варианты. Нажмите на комбу — откроется её ход по всем ${state.draws.length} тиражам.</div><div id="csList" class="csList"></div>`;
    const list=q('csList');
    state.rows.forEach((r,i)=>{
      const b=document.createElement('button');b.type='button';b.className='csItem';
      b.innerHTML=`<span><span class="csNums">${r.nums.map(f2).join(' ')}</span><span class="csMeta">🔥 полностью ${r.full} · почти полных ${r.near} · Σ попаданий ${r.sum} · ход ${r.withHit}/${state.draws.length}</span></span><span class="csFire">№${i+1} ›</span>`;
      b.onclick=()=>showDetail(r);list.appendChild(b);
    });
  }


  async function runSearch(){
    if(state.busy)return;
    const draws=selectedDraws();
    if(!draws.length){
      q('csStatus').className='csStatus err';
      q('csStatus').textContent='За выбранный период тиражи не найдены.';
      return;
    }
    state.busy=true;state.draws=draws;state.rows=[];
    q('csResults').classList.add('hidden');q('csDetail').classList.add('hidden');q('csDetail').innerHTML='';
    q('csStatus').className='csStatus busy';
    const go=q('csGo');go.disabled=true;go.textContent='ИЩУ…';
    try{
      q('csStatus').textContent=`Анализирую ход ${draws.length} тиражей · ${state.size}К…`;
      const built=await buildCandidates(draws,state.size);
      const picked=pickDiverse(built.rows,state.size,RESULT_LIMIT);
      state.rows=picked;
      q('csStatus').className='csStatus';
      q('csStatus').textContent=`Готово: проверен пул ${built.poolSize.toLocaleString('ru-RU')} реально собиравшихся вариантов. Оставлено ${picked.length} разных комб; почти одинаковые отброшены.`;
      q('csSummary').innerHTML=`<div class="csSummary"><div class="csStat"><b>${draws.length}</b><span>тиражей</span></div><div class="csStat"><b>${state.size}К</b><span>размер</span></div><div class="csStat"><b>${picked.length}</b><span>разные комбы</span></div></div>`;
      renderResults();
    }catch(e){
      console.error('COMBO DIVERSE SEARCH',e);
      q('csStatus').className='csStatus err';
      q('csStatus').textContent='Ошибка поиска: '+(e?.message||e);
    }finally{
      state.busy=false;go.disabled=false;go.textContent='🔍 НАЙТИ КОМБЫ';
    }
  }

  function clearOldResult(note='Параметры изменены — пересчитываю…'){
    q('csResults')?.classList.add('hidden');
    q('csDetail')?.classList.add('hidden');
    if(q('csDetail'))q('csDetail').innerHTML='';
    if(q('csSummary'))q('csSummary').innerHTML='';
    if(q('csStatus')){
      q('csStatus').className='csStatus';
      q('csStatus').textContent=note;
    }
  }

  let autoRunTimer=0;
  function scheduleAutoRun(){
    clearTimeout(autoRunTimer);
    clearOldResult();
    autoRunTimer=setTimeout(()=>runSearch(),120);
  }

  function bind(){
    q('csWindowModes')?.querySelectorAll('[data-csw]').forEach(b=>b.onclick=()=>{
      state.window=Number(b.dataset.csw);
      state.date='';
      q('csDateInput').value='';
      setActive(q('csWindowModes'),'data-csw',state.window);
      scheduleAutoRun();
    });
    q('csSizeModes')?.querySelectorAll('[data-css]').forEach(b=>b.onclick=()=>{
      state.size=Number(b.dataset.css);
      setActive(q('csSizeModes'),'data-css',state.size);
      scheduleAutoRun();
    });
    q('csDateInput').onchange=e=>{
      state.date=e.target.value;
      if(state.date){
        q('csWindowModes')?.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        scheduleAutoRun();
      }
    };
    q('csToday').onclick=()=>{
      const last=(typeof DRAWS!=='undefined'&&DRAWS.length)?DRAWS[DRAWS.length-1]:null;
      const iso=last?ruDateToISO(last.date):new Date().toISOString().slice(0,10);
      state.date=iso;
      q('csDateInput').value=iso;
      q('csWindowModes')?.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      scheduleAutoRun();
    };
    q('csGo').onclick=runSearch;
  }

  function patchHistoryDismiss(){
    if(typeof renderHistory!=='function'||renderHistory.__comboSearchPatched)return;
    const original=renderHistory;
    const wrapped=function(){
      original();
      const box=q('historyBox');if(!box||!lastResult)return;
      const numsRow=box.querySelector('.resultTop');if(!numsRow||numsRow.querySelector('.historyDismissBtn'))return;
      const del=document.createElement('button');del.type='button';del.className='historyDismissBtn';del.textContent='✕';
      del.title='Убрать эту комбу только с текущего экрана';
      del.onclick=()=>{
        lastResult=null;try{historyMarks?.clear?.()}catch(e){};selected=[];
        try{renderPick()}catch(e){}
        box.innerHTML='<h2>История</h2><div class="msg">Текущая комбинация убрана с экрана. Сохранённые и «Наши комбы» не изменены.</div>';
      };
      numsRow.appendChild(del);
    };
    wrapped.__comboSearchPatched=true;renderHistory=wrapped;
  }

  function init(){
    css();addSection();addNav();bind();patchHistoryDismiss();
    const v=document.querySelector('.version');if(v)v.textContent='Версия '+EXT_VERSION;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();