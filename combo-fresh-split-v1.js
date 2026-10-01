/* COMBO KENO · Разные + Свежие + отслеживание v2 · 01.10.2026
   — «Разные»: свободное количество результатов.
   — «Свежие»: точный K-набор встретился ровно один раз за весь архив,
     и этот единственный выход находится в последних N тиражах.
   — «Отслеживание»: только вручную выбранные свежие комбы. После FIRST
     показываем ход по следующим тиражам, выигрыши и первый повтор 6/6.
*/
(() => {
  'use strict';
  if(window.__comboFreshSplitV1)return;
  window.__comboFreshSplitV1=true;

  const DEFAULT_LIMIT=4;
  const DEFAULT_FRESH=2;
  const DEFAULT_TRACK=60;
  const TRACK_KEY='comboKenoFreshWatchV1';
  const cache=new Map();
  let observer=null;
  let busy=false;
  let timer=0;

  const q=id=>document.getElementById(id);
  const f2=n=>String(Number(n)).padStart(2,'0');
  const keyOf=nums=>[...nums].map(Number).sort((a,b)=>a-b).join('-');
  const tick=()=>new Promise(r=>setTimeout(r,0));
  const overlap=(a,b)=>{let n=0;for(const x of a)if(b.includes(x))n++;return n};
  function positive(v,fallback=1,max=Infinity){let n=Math.floor(Number(v));if(!Number.isFinite(n)||n<1)n=fallback;return Math.max(1,Math.min(max,n))}
  function archive(){try{return (typeof DRAWS!=='undefined'&&Array.isArray(DRAWS))?DRAWS:[]}catch(e){return []}}
  function sizeNow(){return positive(document.querySelector('#csSizeModes .active[data-css]')?.dataset.css||3,3,7)}
  function windowNow(){return positive(q('csWindowValue')?.value||10,10,Math.max(1,archive().length))}
  function ruDateToISO(s){const m=String(s||'').match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);if(!m)return'';let y=Number(m[3]);if(y<100)y+=2000;return `${y}-${m[2]}-${m[1]}`}
  function selectedDraws(){const a=archive();const date=q('csDateInput')?.value||'';if(date)return a.filter(d=>ruDateToISO(d.date)===date);return a.slice(-windowNow())}
  function combinations(a,k,cb){const pick=new Array(k);function rec(start,depth){if(depth===k){cb(pick.slice());return}const need=k-depth;for(let i=start;i<=a.length-need;i++){pick[depth]=a[i];rec(i+1,depth+1)}}rec(0,0)}
  function nCk(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let z=1;for(let i=1;i<=k;i++)z=z*(n-k+i)/i;return Math.round(z)}
  function ageText(age){age=Number(age)||0;if(age===0)return'последний тираж';const d10=age%10,d100=age%100,w=d10===1&&d100!==11?'тираж':(d10>=2&&d10<=4&&(d100<12||d100>14)?'тиража':'тиражей');return `${age} ${w} назад`}
  function payout(k,h){try{return Number(PAYOUTS?.combination?.[String(k)]?.[String(h)]||0)}catch(e){return 0}}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function loadTracks(){try{const a=JSON.parse(localStorage.getItem(TRACK_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  function saveTracks(a){try{localStorage.setItem(TRACK_KEY,JSON.stringify(a.slice(-100)))}catch(e){console.warn('fresh watch save',e)}}
  function trackId(nums,draw){return `${Number(draw)}|${keyOf(nums)}`}
  function isTracked(r){return loadTracks().some(x=>x.id===trackId(r.nums,r.draw))}
  function addTrack(r){
    const a=loadTracks(),id=trackId(r.nums,r.draw);if(a.some(x=>x.id===id))return;
    const horizon=positive(q('cfsTrackN')?.value,DEFAULT_TRACK,5000);
    a.push({id,nums:r.nums.map(Number).sort((x,y)=>x-y),k:r.nums.length,startDraw:Number(r.draw),startDate:r.date||'',startTime:r.time||'',startColumn:Number(r.column),horizon,createdAt:Date.now()});
    saveTracks(a);renderTrackingHistory();
  }
  function trackState(t){
    const all=[...archive()].sort((a,b)=>Number(a.draw)-Number(b.draw));
    const source=all.find(d=>Number(d.draw)===Number(t.startDraw));
    const after=all.filter(d=>Number(d.draw)>Number(t.startDraw)).slice(0,positive(t.horizon,DEFAULT_TRACK,5000));
    const rows=after.map((d,i)=>({d,step:i+1,h:hitCount(t.nums,d),pr:payout(t.k,hitCount(t.nums,d))}));
    const repeats=rows.filter(x=>x.h===t.k),wins=rows.filter(x=>x.pr>0),sum=wins.reduce((z,x)=>z+x.pr,0);
    return {source,rows,repeats,wins,sum,progress:rows.length,done:rows.length>=Number(t.horizon)};
  }

  function installCss(){
    if(q('comboFreshSplitStyles'))return;
    const s=document.createElement('style');s.id='comboFreshSplitStyles';s.textContent=`
      #comboSearch .cfsControls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin:10px 0 2px}
      #comboSearch .cfsCard{display:grid;grid-template-columns:1fr auto;grid-template-areas:'t i' 's i';gap:2px 8px;align-items:center;padding:9px;border:1px solid #315677;border-radius:11px;background:#081827}
      #comboSearch .cfsCard.fresh{border-color:#416c3d;background:linear-gradient(180deg,#0e2a24,#081827)}#comboSearch .cfsCard.track{border-color:#7b5a17;background:linear-gradient(180deg,#2a2410,#081827)}
      #comboSearch .cfsTitle{grid-area:t;font-size:11px;font-weight:950;color:#fff}#comboSearch .cfsSub{grid-area:s;font-size:9px;color:var(--muted);line-height:1.25}
      #comboSearch .cfsInput{grid-area:i;width:68px;height:42px;border:1px solid #315b7d;border-radius:10px;background:#020912;color:#fff;text-align:center;font-size:18px;font-weight:950;appearance:textfield;-moz-appearance:textfield}
      #comboSearch .cfsInput::-webkit-outer-spin-button,#comboSearch .cfsInput::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}#comboSearch .cfsCard.fresh .cfsInput{border-color:#4f8a45;color:#9cff78}#comboSearch .cfsCard.track .cfsInput{border-color:#9a7624;color:#ffd65b}
      #comboSearch .cfsGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;align-items:start}#comboSearch .cfsPane{min-width:0;padding:8px;border:1px solid #294b66;border-radius:12px;background:#071725}#comboSearch .cfsPane.fresh{border-color:#416c3d;background:linear-gradient(180deg,#0b241f,#071725)}
      #comboSearch .cfsPaneTitle{font-size:16px;font-weight:950;margin:0 0 3px}#comboSearch .cfsPaneSub{font-size:9px;color:var(--muted);line-height:1.3;margin-bottom:7px}#comboSearch .cfsList{display:grid;gap:7px}
      #comboSearch .cfsItem{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;text-align:left;padding:10px;background:#0a1c2d;border:1px solid #315677;border-radius:11px}#comboSearch .cfsItem.fresh{border-color:#3f7439;background:#0b211d}
      #comboSearch button.cfsOpen{border:0;background:transparent;padding:0;text-align:left;color:inherit;font:inherit;min-width:0}#comboSearch .cfsNums{font-weight:950;font-size:14px;letter-spacing:.4px}#comboSearch .cfsMeta{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.35}#comboSearch .cfsFreshMeta{color:#9cff78}#comboSearch .cfsBadge{font-weight:950;color:#9cff78;font-size:11px;white-space:nowrap}
      #comboSearch .cfsTrackBtn{padding:7px 8px;border-radius:9px;font-size:10px;background:#2a2410;border-color:#8f6c1e;color:#ffd65b;white-space:nowrap}#comboSearch .cfsTrackBtn.on{background:#173b1d;border-color:#4f8a45;color:#9cff78}
      #comboSearch .cfsEmpty{padding:10px;border:1px dashed #315677;border-radius:9px;color:#9fb2c4;font-size:10px;line-height:1.4}#comboSearch .cfsPane.fresh .cfsEmpty{border-color:#416c3d}
      #comboSearch .cfsBusy{padding:9px;border:1px solid #416c3d;border-radius:10px;color:#d9ffc8;background:#0b211d;font-size:10px;line-height:1.35}
      #comboSearch .cfsHistory{margin-top:10px;border:1px solid #7b5a17;border-radius:12px;background:#101b24;overflow:hidden}#comboSearch .cfsHistoryHead{width:100%;display:flex;justify-content:space-between;align-items:center;border:0;border-radius:0;background:#13283a;padding:11px;color:#fff}#comboSearch .cfsHistoryBody{display:grid;gap:7px;padding:8px}#comboSearch .cfsTrackItem{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;padding:9px;border:1px solid #465b6c;border-radius:10px;background:#081827}#comboSearch .cfsTrackItem.repeat{border-color:#9a7624;background:#201d10}#comboSearch .cfsTrackItem .repeatText{color:#ffd65b;font-weight:900}#comboSearch .cfsProgress{color:#a8bdd0;font-size:10px;margin-top:3px;line-height:1.35}
      #comboSearch .cfsTrackOpen{padding:7px 8px;font-size:10px;background:#0a1c2d}.cfsTrackSummary{font-size:10px;color:#9fb2c4;margin-top:3px}.cfsTrackSummary.fire{color:#ffd65b;font-weight:900}
      @media(max-width:760px){#comboSearch .cfsGrid{grid-template-columns:1fr}}@media(max-width:430px){#comboSearch .cfsControls{grid-template-columns:1fr 1fr}#comboSearch .cfsCard.track{grid-column:1/-1}}@media(max-width:380px){#comboSearch .cfsInput{width:58px}}
    `;document.head.appendChild(s);
  }

  function bindNumberInput(id,fallback){const el=q(id);if(!el)return;el.onfocus=()=>{el.dataset.prev=el.value;el.value=''};el.oninput=()=>{el.value=String(el.value||'').replace(/\D/g,'').slice(0,6)};el.onblur=()=>{if(!el.value)el.value=el.dataset.prev||String(fallback);q('csResults')?.classList.add('hidden')};el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();el.blur()}}}
  function installControls(){
    const sizeBox=q('csSizeModes');if(!sizeBox||q('cfsControls'))return false;
    const wrap=document.createElement('div');wrap.id='cfsControls';wrap.className='cfsControls';wrap.innerHTML=`
      <label class="cfsCard"><span class="cfsTitle">РАЗНЫЕ КОМБЫ</span><span class="cfsSub">сколько вариантов показать</span><input id="cfsLimit" class="cfsInput" type="tel" inputmode="numeric" pattern="[0-9]*" value="${DEFAULT_LIMIT}"></label>
      <label class="cfsCard fresh"><span class="cfsTitle">🆕 СВЕЖИЕ</span><span class="cfsSub">за последние N тиражей</span><input id="cfsFresh" class="cfsInput" type="tel" inputmode="numeric" pattern="[0-9]*" value="${DEFAULT_FRESH}"></label>
      <label class="cfsCard track"><span class="cfsTitle">🔁 ОТСЛ. ТИРАЖЕЙ</span><span class="cfsSub">сколько тиражей смотреть после FIRST</span><input id="cfsTrackN" class="cfsInput" type="tel" inputmode="numeric" pattern="[0-9]*" value="${DEFAULT_TRACK}"></label>`;
    sizeBox.insertAdjacentElement('afterend',wrap);
    bindNumberInput('cfsLimit',DEFAULT_LIMIT);bindNumberInput('cfsFresh',DEFAULT_FRESH);bindNumberInput('cfsTrackN',DEFAULT_TRACK);
    const go=q('csGo');if(go)go.textContent='🔍 НАЙТИ РАЗНЫЕ + СВЕЖИЕ';
    return true;
  }

  async function buildRows(draws,k){
    const freq=Array(81).fill(0);for(const d of draws)for(const n of d.balls)freq[Number(n)]++;
    const n=draws.length,extra=n<=120?4:n<=500?3:n<=3000?2:1,pool=new Map();
    for(let di=0;di<draws.length;di++){
      const ranked=[...(draws[di].balls||[])].map(Number).sort((a,b)=>freq[b]-freq[a]||a-b),core=ranked.slice(0,Math.min(ranked.length,k+extra));
      combinations(core,k,nums=>{const key=keyOf(nums),old=pool.get(key);if(old)old.seedFull++;else pool.set(key,{nums,seedFull:1})});if(di%24===0)await tick();
    }
    let seeds=[...pool.values()];const evalLimit=n<=120?Infinity:n<=500?8000:n<=3000?2500:n<=12000?900:350;
    if(Number.isFinite(evalLimit)&&seeds.length>evalLimit){const fsum=x=>x.nums.reduce((z,a)=>z+freq[a],0);seeds.sort((a,b)=>b.seedFull-a.seedFull||fsum(b)-fsum(a)||keyOf(a.nums).localeCompare(keyOf(b.nums)));seeds=seeds.slice(0,evalLimit)}
    const sets=draws.map(d=>new Set((d.balls||[]).map(Number))),rows=[];let i=0;
    for(const seed of seeds){let full=0,sum=0,withHit=0,near=0,run=0,maxRun=0;for(const ds of sets){let h=0;for(const x of seed.nums)if(ds.has(x))h++;sum+=h;if(h===k)full++;if(h>0){withHit++;run++;maxRun=Math.max(maxRun,run)}else run=0;if(h>=k-1)near++}if(full>0)rows.push({...seed,full,sum,withHit,near,maxRun,score:full*10000+near*500+sum*20+withHit*5+maxRun});if(++i%120===0)await tick()}
    rows.sort((a,b)=>b.score-a.score||b.full-a.full||b.sum-a.sum||keyOf(a.nums).localeCompare(keyOf(b.nums)));return rows;
  }
  function pickDiverse(rows,k,limit){const strict=Math.floor(k/2),picked=[];for(const r of rows){if(picked.every(p=>overlap(r.nums,p.nums)<=strict)){picked.push(r);if(picked.length>=limit)return picked}}for(let allowed=strict+1;allowed<=Math.max(strict,k-2)&&picked.length<limit;allowed++)for(const r of rows){if(picked.includes(r))continue;if(picked.every(p=>overlap(r.nums,p.nums)<=allowed)){picked.push(r);if(picked.length>=limit)break}}return picked}
  function pickFresh(rows,k,limit){const picked=pickDiverse(rows,k,limit);if(picked.length>=limit)return picked;for(const r of rows){if(!picked.includes(r)){picked.push(r);if(picked.length>=limit)break}}return picked}

  async function freshRows(k,windowCount,limit){
    const a=[...archive()].sort((x,y)=>Number(y.draw)-Number(x.draw));if(!a.length)return[];windowCount=positive(windowCount,DEFAULT_FRESH,a.length);limit=positive(limit,DEFAULT_LIMIT);
    const ck=[a[0]?.draw||'',a.length,k,windowCount,limit].join('|');if(cache.has(ck))return cache.get(ck);
    const recent=a.slice(0,windowCount),rows=[],totalTarget=nCk(20,k);
    for(let age=0;age<recent.length;age++){
      const target=recent[age],targetNums=[...new Set((target.balls||[]).map(Number))].filter(n=>n>=1&&n<=80).sort((x,y)=>x-y);if(targetNums.length<k)continue;
      const targetSet=new Set(targetNums),repeated=new Set();
      for(let oi=0;oi<a.length;oi++){
        const other=a[oi];if(Number(other.draw)===Number(target.draw))continue;const inter=[];for(const raw of(other.balls||[])){const n=Number(raw);if(targetSet.has(n))inter.push(n)}
        if(inter.length>=k){inter.sort((x,y)=>x-y);combinations(inter,k,nums=>repeated.add(keyOf(nums)))}if(repeated.size>=totalTarget)break;if(oi%500===0)await tick();
      }
      combinations(targetNums,k,nums=>{if(!repeated.has(keyOf(nums)))rows.push({nums,fresh:true,age,draw:Number(target.draw),date:target.date,time:target.time,column:target.column})});
      rows.sort((x,y)=>x.age-y.age||y.draw-x.draw||keyOf(x.nums).localeCompare(keyOf(y.nums)));if(pickFresh(rows,k,limit).length>=limit)break;await tick();
    }
    const out=pickFresh(rows,k,limit);cache.set(ck,out);return out;
  }

  function hitCount(nums,d){const s=new Set((d.balls||[]).map(Number));let h=0;for(const n of nums)if(s.has(Number(n)))h++;return h}
  function detailRow(d,nums,label=''){const balls=[...(d.balls||[])].sort((a,b)=>a-b),h=hitCount(nums,d),pr=payout(nums.length,h),col=Number.isInteger(Number(d.column))?Number(d.column):'—';return `<div class="hrow"><div class="hcell"><div class="hdraw">${label?esc(label)+' · ':''}${d.draw}</div><div class="hsub">Столб ${col}</div><div class="hdate">${d.date} ${d.time}</div></div><div class="hcell"><div class="hitbox"><div class="hits ${pr?'fire':h===0?'z':h>=2?'h':'o'}">${pr?'🔥 ':''}${h}</div>${pr?`<div class="prize">Сумма<br>${pr.toLocaleString('ru-RU')} ₽</div>`:''}</div></div><div class="hcell drawnums">${balls.map(n=>`<span class="dn ${nums.includes(n)?'hit':''}">${f2(n)}</span>`).join('')}</div></div>`}
  function openDetail(nums,age=0){
    const box=q('csDetail'),a=[...archive()].sort((x,y)=>Number(y.draw)-Number(x.draw));if(!box||!a.length)return;let count=Math.max(1,Number(age)+1);
    const render=()=>{const visible=a.slice(0,count),win=visible.reduce((z,d)=>z+(payout(nums.length,hitCount(nums,d))>0?1:0),0),sum=visible.reduce((z,d)=>z+payout(nums.length,hitCount(nums,d)),0);box.classList.remove('hidden');box.innerHTML=`<div class="csDetailHead"><b>${nums.map(f2).join(' ')}</b><button id="csDetailClose" class="csClose" type="button">✕ Закрыть</button><div class="csWinStats"><div>💰 Выигрышных: <b>${win} / ${visible.length}</b></div><div>🔥 Сумма выигрышей: <b>${sum.toLocaleString('ru-RU')} ₽</b></div></div></div><div class="csDetailTools"><div class="historyTools"><button type="button" class="active">⬆️ Возрастание</button></div><div class="csDrawCount"><span>Тиражей</span><div class="csDetailCounter"><button id="csDrawMinus" type="button">−</button><input id="csDrawValue" class="csWheelValue" type="tel" inputmode="numeric" pattern="[0-9]*" value="${count}"><button id="csDrawPlus" type="button">+</button><button id="csDrawMax" class="csWheelMax" type="button">MAX</button></div></div></div><div class="hist"><div class="hrow head"><div class="hcell">Тираж / Столб / Дата</div><div class="hcell">Попад.</div><div class="hcell">Числа тиража · ⬆️ · 2×10</div></div>${visible.map(d=>detailRow(d,nums)).join('')}</div>`;q('csDetailClose').onclick=()=>{box.classList.add('hidden');box.innerHTML=''};const set=v=>{count=positive(v,1,a.length);render()};q('csDrawMinus').onclick=()=>set(count-1);q('csDrawPlus').onclick=()=>set(count+1);q('csDrawMax').onclick=()=>set(a.length);const valueInput=q('csDrawValue');valueInput.onfocus=()=>{valueInput.dataset.prev=valueInput.value;valueInput.value=''};valueInput.oninput=()=>{valueInput.value=String(valueInput.value||'').replace(/\D/g,'').slice(0,6)};valueInput.onblur=()=>{if(!valueInput.value)valueInput.value=valueInput.dataset.prev||String(count);else set(valueInput.value)};valueInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();valueInput.blur()}}};render();box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function openTracked(id){
    const t=loadTracks().find(x=>x.id===id),box=q('csDetail');if(!t||!box)return;const s=trackState(t),future=s.rows;
    const firstRepeat=s.repeats[0];box.classList.remove('hidden');box.innerHTML=`<div class="csDetailHead"><b>🔁 ${t.nums.map(f2).join(' ')}</b><button id="csDetailClose" class="csClose" type="button">✕ Закрыть</button><div class="csWinStats"><div>🆕 FIRST: <b>№${t.startDraw}</b> · отслеживание ${s.progress}/${t.horizon}</div><div>🔥 После FIRST выигрышных: <b>${s.wins.length}</b> · сумма <b>${s.sum.toLocaleString('ru-RU')} ₽</b></div>${firstRepeat?`<div>🔁 Повтор ${t.k}/${t.k}: <b>№${firstRepeat.d.draw}</b> · +${firstRepeat.step} тиражей</div>`:'<div>🔁 Полного повтора пока нет.</div>'}</div></div><div class="hist"><div class="hrow head"><div class="hcell">Тираж / Столб / Дата</div><div class="hcell">Попад.</div><div class="hcell">Числа тиража · ход после FIRST</div></div>${s.source?detailRow(s.source,t.nums,'FIRST'):''}${future.map(x=>detailRow(x.d,t.nums,'+'+x.step)).join('')}</div>`;q('csDetailClose').onclick=()=>{box.classList.add('hidden');box.innerHTML=''};box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function makeItem(r,i,fresh=false){
    if(fresh){const w=document.createElement('div');w.className='cfsItem fresh';const on=isTracked(r);w.innerHTML=`<button type="button" class="cfsOpen"><span class="cfsNums">${r.nums.map(f2).join(' ')}</span><span class="cfsMeta cfsFreshMeta">🆕 впервые · ${ageText(r.age)} · №${r.draw} · раньше 0</span><span class="cfsMeta">${r.date||''} ${r.time||''}${Number.isInteger(Number(r.column))?` · столб ${r.column}`:''}</span></button><div><div class="cfsBadge">NEW ${i+1} ›</div><button type="button" class="cfsTrackBtn ${on?'on':''}" ${on?'disabled':''}>${on?'✓ ОТСЛ.':'🔁 ОТСЛ.'}</button></div>`;w.querySelector('.cfsOpen').onclick=()=>openDetail(r.nums,r.age);const tb=w.querySelector('.cfsTrackBtn');if(!on)tb.onclick=e=>{e.stopPropagation();addTrack(r);tb.textContent='✓ ОТСЛ.';tb.classList.add('on');tb.disabled=true};return w}
    const b=document.createElement('button');b.type='button';b.className='cfsItem';b.innerHTML=`<span><span class="cfsNums">${r.nums.map(f2).join(' ')}</span><span class="cfsMeta">🔥 полностью ${r.full} · почти полных ${r.near} · Σ попаданий ${r.sum} · ход ${r.withHit}</span></span><span class="csFire">№${i+1} ›</span>`;b.onclick=()=>openDetail(r.nums,0);return b
  }

  function renderTrackingHistory(){
    const host=q('cfsTrackHistory');if(!host)return;const a=loadTracks().sort((x,y)=>Number(y.createdAt||0)-Number(x.createdAt||0));host.innerHTML=`<button id="cfsHistoryToggle" type="button" class="cfsHistoryHead"><b>🔁 История свежих</b><span>${a.length} ${host.dataset.open==='1'?'▲':'▼'}</span></button><div id="cfsHistoryBody" class="cfsHistoryBody ${host.dataset.open==='1'?'':'hidden'}"></div>`;q('cfsHistoryToggle').onclick=()=>{host.dataset.open=host.dataset.open==='1'?'0':'1';renderTrackingHistory()};const body=q('cfsHistoryBody');if(!body||host.dataset.open!=='1')return;if(!a.length){body.innerHTML='<div class="cfsEmpty">Пока ничего не отслеживается. На свежей комбе нажмите «ОТСЛ.».</div>';return}for(const t of a){const s=trackState(t),rep=s.repeats[0],d=document.createElement('div');d.className='cfsTrackItem'+(rep?' repeat':'');d.innerHTML=`<div><div class="cfsNums">${t.nums.map(f2).join(' ')}</div><div class="cfsProgress">FIRST №${t.startDraw} · ход ${s.progress}/${t.horizon}${s.done?' · завершено':''}</div>${rep?`<div class="cfsTrackSummary fire">🔁 ${t.k}/${t.k} №${rep.d.draw} · +${rep.step} тиражей</div>`:'<div class="cfsTrackSummary">полного повтора пока нет</div>'}${s.wins.length?`<div class="cfsTrackSummary fire">🔥 выигрышных ${s.wins.length} · ${s.sum.toLocaleString('ru-RU')} ₽</div>`:''}</div><button type="button" class="cfsTrackOpen">Открыть ›</button>`;d.querySelector('.cfsTrackOpen').onclick=()=>openTracked(t.id);body.appendChild(d)}}

  async function enhance(){
    if(busy)return;const results=q('csResults'),status=q('csStatus');if(!results||results.classList.contains('hidden'))return;
    const limit=positive(q('cfsLimit')?.value,DEFAULT_LIMIT),freshN=positive(q('cfsFresh')?.value,DEFAULT_FRESH,Math.max(1,archive().length)),k=sizeNow(),draws=selectedDraws();if(!draws.length)return;
    busy=true;try{
      if(q('cfsLimit'))q('cfsLimit').value=String(limit);if(q('cfsFresh'))q('cfsFresh').value=String(freshN);if(q('cfsTrackN'))q('cfsTrackN').value=String(positive(q('cfsTrackN').value,DEFAULT_TRACK,5000));
      const oldButtons=[...results.querySelectorAll('#csList .csItem')];
      results.innerHTML=`<div class="cfsBusy">Формирую ${limit} разных и проверяю свежие ${k}К за последние ${freshN} тиражей…</div>`;
      let diverse=[];if(limit<=oldButtons.length){diverse=oldButtons.slice(0,limit)}else{const rows=await buildRows(draws,k);diverse=pickDiverse(rows,k,limit)}
      const fresh=await freshRows(k,freshN,limit);
      results.innerHTML=`<div class="cfsGrid"><div class="cfsPane"><div class="cfsPaneTitle">Разные ${k}К</div><div class="cfsPaneSub">Запрошено ${limit}. Лучшие разные варианты по ${draws.length} выбранным тиражам.</div><div id="cfsDiverse" class="cfsList"></div></div><div class="cfsPane fresh"><div class="cfsPaneTitle">🆕 Свежие ${k}К</div><div class="cfsPaneSub">Точный набор встретился ровно один раз за весь архив. Нажмите «ОТСЛ.», чтобы смотреть его следующие тиражи.</div><div id="cfsFreshList" class="cfsList"></div></div></div><div id="cfsTrackHistory" class="cfsHistory" data-open="0"></div>`;
      const dl=q('cfsDiverse');if(Array.isArray(diverse)&&diverse.length&&diverse[0] instanceof Element){diverse.forEach(x=>dl.appendChild(x))}else if(diverse.length){diverse.forEach((r,i)=>dl.appendChild(makeItem(r,i,false)))}else dl.innerHTML='<div class="cfsEmpty">Разных вариантов по этим условиям не найдено.</div>';
      const fl=q('cfsFreshList');if(fresh.length)fresh.forEach((r,i)=>fl.appendChild(makeItem(r,i,true)));else fl.innerHTML=`<div class="cfsEmpty">Свежих точных ${k}К за последние ${freshN} тиражей не найдено — все такие наборы встречались раньше.</div>`;
      renderTrackingHistory();
      if(status){status.className='csStatus';status.textContent=`Готово: разные — ${Array.isArray(diverse)?diverse.length:0}; свежие — ${fresh.length}. Отслеживание включается только кнопкой «ОТСЛ.».`}
      const go=q('csGo');if(go)go.textContent='🔍 НАЙТИ РАЗНЫЕ + СВЕЖИЕ';
    }catch(e){console.error('COMBO FRESH SPLIT',e);if(status){status.className='csStatus err';status.textContent='Ошибка свежих комб: '+(e?.message||e)}}finally{busy=false}
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,40)}
  function watch(){const status=q('csStatus');if(!status||observer)return;observer=new MutationObserver(()=>{const t=String(status.textContent||'');if(t.startsWith('Готово:')&&!t.includes('свежие —'))schedule()});observer.observe(status,{childList:true,subtree:true,characterData:true})}
  function init(){installCss();if(!installControls()){setTimeout(init,120);return}watch();const go=q('csGo');if(go)go.addEventListener('click',()=>{const r=q('csResults');if(r)r.dataset.cfsPending='1'},{capture:true});setInterval(()=>{if(q('cfsTrackHistory'))renderTrackingHistory()},15000);window.addEventListener('focus',()=>{if(q('cfsTrackHistory'))renderTrackingHistory()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})();