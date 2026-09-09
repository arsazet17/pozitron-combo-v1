(function(){
'use strict';
const __xrayPatchStyle=document.createElement('style');__xrayPatchStyle.textContent=`.xrayPanelHead small{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25}
.xrayColumnForecast{margin-top:8px;padding:7px 8px;border-top:1px solid #294b66;color:#b9c8d6;font-size:10px;line-height:1.8;word-spacing:1px}
.xrayColumnForecast span{display:inline;white-space:nowrap;margin-right:5px}
.xrayColumnForecast b{color:#eef7ff}
.xrayColumnForecast i{font-style:normal;color:#ff5b67}
.xrayFactNums span.layerHit{background:#1e7e38;border:1px solid #59d978;color:#fff;font-weight:900}
.xrayFactNums span.layerMiss{background:#081827;border:1px solid #294b66;color:#b8c9d7;font-weight:900}
.xrayForecastLayer{margin-top:9px;padding:8px;border:1px dashed #8e761d;border-radius:10px;background:#081827}
.xrayForecastLayerTitle{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#b8c9d7;font-size:10px;line-height:1.25}
.xrayForecastLayerTitle b{color:#eef7ff;font-size:11px}
.xrayForecastLayerTitle span{color:#9eb0c1;text-align:right}
.xrayForecastNums{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
.xrayForecastNums span{min-width:34px;text-align:center;padding:5px 6px;border-radius:7px;font-size:10px;font-weight:900;box-sizing:border-box}
.xrayForecastNums span.pending,.xrayForecastNums span.miss{background:linear-gradient(180deg,#f1ca36,#b78900);border:1px solid #ffe45d;color:#171d2b}
.xrayForecastNums span.hit{background:linear-gradient(180deg,#46b84e,#228036);border:1px solid #71f081;color:#fff}
`;document.head.appendChild(__xrayPatchStyle);

const $=id=>document.getElementById(id);
const fmt=n=>String(n).padStart(2,'0');
const money=v=>Number(v||0).toLocaleString('ru-RU')+' ₽';
const RUNTIME_URL='data/xray-runtime.json';
let runtime=null,refreshing=false,lastGeneration='',panel={grid:true,combos:true,fact:true,archive:false,payouts:false},payouts=null;

async function fetchJSON(url){
  const r=await fetch(url+(url.includes('?')?'&':'?')+'ts='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
  if(!r.ok)throw new Error(`${url}: HTTP ${r.status}`);
  return await r.json();
}
async function loadPayouts(){if(!payouts)payouts=await fetchJSON('keno-payouts-v1.json');return payouts}
function head(title,key,extra=''){return `<div class="xrayPanelHead"><div><b>${title}</b>${extra?`<small>${extra}</small>`:''}</div><button class="xrayFold ${panel[key]?'on':''}" data-xfold="${key}" type="button">▼</button></div>`}
function targetLabel(r){return `№${r?.targetDraw||'—'} · ${r?.targetDate||'—'} ${r?.targetTime||'—'}`}
function sourceLabel(r){return `№${r?.sourceDraw||'—'} · ${r?.sourceDate||'—'} ${r?.sourceTime||'—'}${r?.sourceColumn?` · столб ${r.sourceColumn}`:''}`}
function gridHeadLabel(f){return f?`Источник ${sourceLabel(f)} → прогноз на ${targetLabel(f)}`:'ожидаю прогноз'}
function columnForecastHTML(f){
  const pred=(f?.predicted20||[]).map(Number);
  const cols=Array.from({length:10},()=>[]);
  for(const n of pred){
    const c=((n-1)%10);
    if(c>=0&&c<10)cols[c].push(n);
  }
  return `<div class="xrayColumnForecast">${cols.map((a,i)=>`<span><b>Ст${i+1}</b>(${a.length?a.join('.'): '<i>🔺</i>'})</span>`).join(' ')}</div>`;
}
function gridHTML(f){
  const cur=new Set((f?.current20||runtime?.latestOfficial?.balls||[]).map(Number)),pred=new Set((f?.predicted20||[]).map(Number));
  return Array.from({length:80},(_,i)=>i+1).map(n=>{
    const cls=cur.has(n)&&pred.has(n)?'both':cur.has(n)?'current':pred.has(n)?'predicted':'';
    return `<button class="xrayCell ${cls}" type="button" data-xcell="${n}">${n}</button>`;
  }).join('');
}
function renderOverlay(f){
  const svg=$('xrayOverlay'),stage=$('xrayStage');if(!svg||!stage)return;
  svg.innerHTML='<defs><marker id="xrayArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z"></path></marker></defs>';
  if(!f)return;
  const rect=stage.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
  for(const p of (f.transitions||[]).filter(x=>x.kind==='change')){
    const s=stage.querySelector(`[data-xcell="${p.from}"]`),t=stage.querySelector(`[data-xcell="${p.to}"]`);if(!s||!t)continue;
    const a=s.getBoundingClientRect(),b=t.getBoundingClientRect(),el=document.createElementNS('http://www.w3.org/2000/svg','line');
    el.setAttribute('x1',a.left+a.width/2-rect.left);el.setAttribute('y1',a.top+a.height/2-rect.top);
    el.setAttribute('x2',b.left+b.width/2-rect.left);el.setAttribute('y2',b.top+b.height/2-rect.top);
    el.setAttribute('class','xrayArrowLine');el.setAttribute('marker-end','url(#xrayArrow)');svg.appendChild(el);
  }
}
function comboBox(title,cls,nums,f){return `<div class="xrayCombo ${cls}"><div class="xrayComboTop"><b>${title}</b><span>на ${targetLabel(f)}</span></div><div class="xrayComboNums">${(nums||[]).map(n=>`<span>${fmt(n)}</span>`).join('')}</div></div>`}
function forecastLayerHTML(e,settled=false){
  if(!e)return '';
  const hits=new Set((e.layerHits||[]).map(Number));
  const nums=(e.predicted20||[]).map(Number);
  const count=settled?hits.size:0;
  return `<div class="xrayForecastLayer"><div class="xrayForecastLayerTitle"><b>Переходы 20</b><span>${settled?`выпало ${count}/20`:`на ${targetLabel(e)}`}</span></div><div class="xrayForecastNums">${nums.map(n=>`<span class="${settled?(hits.has(n)?'hit':'miss'):'pending'}">${fmt(n)}</span>`).join('')}</div></div>`;
}
function factBlock(e){
  if(!e)return '';
  const c5=new Set(e.combo5Hits||[]),c7=new Set(e.combo7Hits||[]),layer=new Set(e.layerHits||[]);
  return `<div class="xrayFactBlock">${head(`Факт тиража №${e.factDraw}`,'fact',`${e.factDate||'—'} ${e.factTime||'—'} · столб ${e.factColumn||'—'}`)}
  <div class="xrayPanelBody ${panel.fact?'':'hiddenX'}"><div class="xrayFactNums">${(e.factBalls||[]).map(n=>`<span class="${layer.has(n)?'layerHit':'layerMiss'}">${fmt(n)}</span>`).join('')}</div>
  <div class="xrayFactCombos"><div><b>COMBO-5 · ${(e.combo5Hits||[]).length}/5</b><div class="xrayCheckedNums">${(e.combo5||[]).map(n=>`<span class="${c5.has(n)?'hit':'miss'}">${fmt(n)} ${c5.has(n)?'✓':'×'}</span>`).join('')}</div>${e.combo5Payout?`<strong class="xrayWin">🔥 ${money(e.combo5Payout)}</strong>`:''}</div>
  <div><b>COMBO-7 · ${(e.combo7Hits||[]).length}/7</b><div class="xrayCheckedNums">${(e.combo7||[]).map(n=>`<span class="${c7.has(n)?'hit':'miss'}">${fmt(n)} ${c7.has(n)?'✓':'×'}</span>`).join('')}</div>${e.combo7Payout?`<strong class="xrayWin">🔥 ${money(e.combo7Payout)}</strong>`:''}</div></div>
  ${forecastLayerHTML(e,true)}</div></div>`;
}
function archiveItem(e){
  const c5=new Set(e.combo5Hits||[]),c7=new Set(e.combo7Hits||[]);
  const nums=(a,h)=>a.map(n=>`<span class="${h.has(n)?'hit':'miss'}">${fmt(n)}${h.has(n)?'✓':'×'}</span>`).join(' ');
  return `<div class="xrayArchiveItem"><div class="xrayArchiveTop"><b>На №${e.targetDraw} · ${e.targetDate||'—'} ${e.targetTime||'—'}</b><span class="done">проверен</span></div>
  <div class="xrayArchiveSource">Источник: ${sourceLabel(e)}</div>
  <div class="xrayArchiveLine"><b>COMBO-5:</b> ${nums(e.combo5||[],c5)} ${e.combo5Payout?`<strong>🔥 ${money(e.combo5Payout)}</strong>`:''}</div>
  <div class="xrayArchiveLine"><b>COMBO-7:</b> ${nums(e.combo7||[],c7)} ${e.combo7Payout?`<strong>🔥 ${money(e.combo7Payout)}</strong>`:''}</div>
  <div class="xrayArchiveFact">Факт: №${e.factDraw} · ${e.factDate||'—'} ${e.factTime||'—'} · столб ${e.factColumn||'—'} · слой ${(e.layerHits||[]).length}/20</div></div>`;
}
function payoutRows(size){const m=payouts?.combination?.[String(size)]||{};return Object.keys(m).map(Number).sort((a,b)=>a-b).map(h=>`<span><b>${h}/${size}</b> — ${money(m[h])}</span>`).join('')}
function bind(){document.querySelectorAll('[data-xfold]').forEach(b=>b.onclick=()=>{panel[b.dataset.xfold]=!panel[b.dataset.xfold];render()})}
function render(){
  const root=$('xrayRoot');if(!root)return;
  if(!runtime){root.innerHTML='<div class="card"><h2>🔬 Рентген структуры</h2><div class="msg">Загружаю SERVER LIVE…</div></div>';return}
  const f=runtime.forecast,h=runtime.history||[],last=h[0]||null;
  root.innerHTML=`<div class="card"><h2>🔬 Рентген структуры</h2>
  <div class="muted">SERVER LIVE · архив и прогнозы ведутся автоматически, даже когда приложение закрыто.</div>
  <div class="xrayLiveLine">LIVE ${runtime.latestOfficial?`№${runtime.latestOfficial.draw} · ${runtime.latestOfficial.date} ${runtime.latestOfficial.time}`:'—'} · история ${h.length}</div></div>
  <div class="card">${head('Поле 1–80','grid',gridHeadLabel(f))}
  <div class="xrayPanelBody ${panel.grid?'':'hiddenX'}"><div class="xrayLegend"><span class="current">Тираж</span><span class="predicted">Прогноз</span><span class="both">Совпало</span></div>
  <div id="xrayStage" class="xrayStage"><div class="xrayGrid">${gridHTML(f)}</div><svg id="xrayOverlay" class="xrayOverlay"></svg></div>
  ${f?columnForecastHTML(f):''}</div></div>
  <div class="card">${head('COMBO','combos',f?targetLabel(f):'ожидаю SERVER LIVE')}<div class="xrayPanelBody ${panel.combos?'':'hiddenX'}">${f?comboBox('COMBO-5','combo5',f.combo5,f)+comboBox('COMBO-7','combo7',f.combo7,f)+forecastLayerHTML(f,false):'<div class="msg">Модель ещё не сформировала следующий frozen-прогноз.</div>'}</div></div>
  ${factBlock(last)}
  <div id="xrayArchiveBox" class="card">${head('История Рентгена','archive',`${h.length} записей`)}<div class="xrayPanelBody ${panel.archive?'':'hiddenX'}">${h.length?h.map(archiveItem).join(''):'<div class="xrayEmpty">Пока нет завершённых прогнозов.</div>'}</div></div>
  <div class="card">${head('Таблица выигрышей','payouts',`версия ${payouts?.version||'—'}`)}<div class="xrayPanelBody ${panel.payouts?'':'hiddenX'}"><div class="xrayPayoutCols"><div><b>COMBO-5</b>${payoutRows(5)}</div><div><b>COMBO-7</b>${payoutRows(7)}</div></div></div></div>`;
  bind();requestAnimationFrame(()=>renderOverlay(f));
}
async function refresh(){
  if(refreshing)return;refreshing=true;
  try{
    await loadPayouts();
    const x=await fetchJSON(RUNTIME_URL);
    if(!x||x.version!==1||!Array.isArray(x.history))throw new Error('XRAY runtime повреждён');
    const changed=x.generation!==lastGeneration;runtime=x;lastGeneration=x.generation||'';render();
    if(changed)window.dispatchEvent(new CustomEvent('xray:runtime',{detail:x}));
  }catch(e){
    const root=$('xrayRoot');if(root)root.innerHTML=`<div class="card"><h2>🔬 Рентген структуры</h2><div class="msg err">SERVER LIVE: ${e.message}</div></div>`;
  }finally{refreshing=false}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
window.addEventListener('focus',refresh);window.addEventListener('online',refresh);
setInterval(()=>{if(!document.hidden)refresh()},10000);
window.ComboXrayUI={refresh,getRuntime:()=>runtime};
refresh();
})();
