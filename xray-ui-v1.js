(function(){
'use strict';
const ARCHIVE_KEY='comboKenoXrayArchiveV2';
const LEGACY_KEY='comboKenoXrayArchiveV1';
const PANEL_KEY='comboKenoXrayPanelsV2';
let lastAnalysis=null,revealPrediction=false,lastKnownDraw=null,payouts=null,renderBusy=false;
const $=id=>document.getElementById(id);
const fmt=n=>String(n).padStart(2,'0');
const money=v=>Number(v||0).toLocaleString('ru-RU')+' ₽';
function draws(){try{return typeof window.getComboDraws==='function'?window.getComboDraws():[]}catch(e){return[]}}
function latest(){return draws().at(-1)||null}
function drawByNumber(n){return draws().find(x=>Number(x.draw)===Number(n))||null}
function readJSON(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'');return v??fallback}catch(e){return fallback}}
function writeJSON(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch(e){}}
function loadArchive(){const a=readJSON(ARCHIVE_KEY,[]);return Array.isArray(a)?a:[]}
function saveArchive(a){writeJSON(ARCHIVE_KEY,(Array.isArray(a)?a:[]).slice(0,500))}
function panelState(){return Object.assign({grid:true,combos:true,fact:true,archive:false,payouts:false},readJSON(PANEL_KEY,{}))}
function setPanel(name,val){const s=panelState();s[name]=!!val;writeJSON(PANEL_KEY,s);render()}
function panelToggle(name){const s=panelState();setPanel(name,!s[name])}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function prizeFor(count,hits){return Number(payouts?.combination?.[String(count)]?.[String(hits)]||0)}
async function loadPayouts(){if(payouts)return payouts;try{const r=await fetch('keno-payouts-v1.json?t='+Date.now(),{cache:'no-store'});payouts=await r.json()}catch(e){payouts={version:'?',combination:{}}}return payouts}
function slotForSource(sourceDraw){const d=drawByNumber(sourceDraw),all=draws();return window.ComboXray?.inferNextSlot?.(all,d)||{date:null,time:null}}
function upgradeEntry(e){
  const src=drawByNumber(e.sourceDraw);if(src){if(!e.sourceDate)e.sourceDate=src.date;if(!e.sourceTime)e.sourceTime=src.time;if(!e.sourceColumn)e.sourceColumn=Number(src.column)||null}
  if(!e.targetDate||!e.targetTime){const s=slotForSource(e.sourceDraw);if(!e.targetDate)e.targetDate=s.date;if(!e.targetTime)e.targetTime=s.time}
  return e;
}
function migrateLegacy(){
  const current=loadArchive();if(current.some(x=>x.migratedLegacy))return;
  const legacy=readJSON(LEGACY_KEY,[]);if(!Array.isArray(legacy)||!legacy.length){if(current.length){current[0].migratedLegacy=true;saveArchive(current)}return;}
  const seen=new Set(current.map(x=>Number(x.sourceDraw)));
  for(const e of legacy){if(seen.has(Number(e.sourceDraw)))continue;current.push({id:e.id||('legacy-'+e.sourceDraw),createdAt:e.createdAt||0,version:e.version||'XRAY-1.x',sourceDraw:e.sourceDraw,sourceDate:e.sourceDate,sourceTime:e.sourceTime,sourceColumn:e.sourceColumn,targetDraw:e.targetDraw,targetDate:e.targetDate,targetTime:e.targetTime,combo5:(e.main||[]).map(x=>Number(x.n)).filter(Boolean),combo7:(e.reserve||[]).map(x=>Number(x.n)).filter(Boolean),predicted20:[],status:e.status||'pending',factDraw:e.factDraw,factDate:e.factDate,factTime:e.factTime,factColumn:e.factColumn,factBalls:e.factBalls||[],legacy:true});}
  current.sort((a,b)=>(Number(b.targetDraw)||0)-(Number(a.targetDraw)||0));if(current[0])current[0].migratedLegacy=true;saveArchive(current);
}
async function settleArchive(){
  await loadPayouts();const a=loadArchive(),d=draws();let changed=false;
  for(const raw of a){const e=upgradeEntry(raw);if(e.status==='settled')continue;const fact=d.find(x=>Number(x.draw)===Number(e.targetDraw));if(!fact)continue;
    e.status='settled';e.factDraw=Number(fact.draw);e.factDate=fact.date;e.factTime=fact.time;e.factColumn=Number(fact.column)||null;e.factBalls=[...(fact.balls||[])].map(Number);const fs=new Set(e.factBalls);
    e.combo5Hits=(e.combo5||[]).filter(n=>fs.has(Number(n))).map(Number);e.combo7Hits=(e.combo7||[]).filter(n=>fs.has(Number(n))).map(Number);e.layerHits=(e.predicted20||[]).filter(n=>fs.has(Number(n))).map(Number);
    e.combo5Payout=prizeFor((e.combo5||[]).length,e.combo5Hits.length);e.combo7Payout=prizeFor((e.combo7||[]).length,e.combo7Hits.length);e.payoutVersion=payouts?.version||null;e.settledAt=Date.now();changed=true;
  }
  if(changed)saveArchive(a);return a;
}
async function scan(){const box=$('xrayMsg');if(box)box.textContent='Считаю 5 последних тиражей…';try{lastAnalysis=await window.ComboXray.analyze(draws());revealPrediction=false;lastKnownDraw=Number(latest()?.draw||0)}catch(e){lastAnalysis={ok:false,error:e.message||String(e)}}render()}
function compactEntry(r){return {id:`xr2-${r.sourceDraw}-${Date.now()}`,createdAt:Date.now(),version:r.version,engine:r.engine,modelVersion:r.modelVersion||null,modelLatestDraw:r.modelLatestDraw||null,sourceDraw:r.sourceDraw,sourceDate:r.sourceDate,sourceTime:r.sourceTime,sourceColumn:r.sourceColumn||null,targetDraw:r.targetDraw,targetDate:r.targetDate||null,targetTime:r.targetTime||null,current20:[...r.current20],predicted20:[...r.predicted20],combo5:[...r.combo5],combo7:[...r.combo7],overlap:[...r.overlap],transitions:(r.transitions||[]).map(x=>({from:x.from,to:x.to,kind:x.kind})),status:'pending',payoutVersion:payouts?.version||null};}
async function freezeForecast(r){await loadPayouts();let a=await settleArchive();const existing=a.find(x=>Number(x.sourceDraw)===Number(r.sourceDraw)&&!x.legacy);if(existing)return existing;const e=compactEntry(r);a.unshift(e);saveArchive(a);return e}
async function showNext(){if(!lastAnalysis?.ok){await scan();if(!lastAnalysis?.ok)return}revealPrediction=true;await freezeForecast(lastAnalysis);render()}
function toggleArchive(){panelToggle('archive')}
function sourceLabel(r){const c=r?.sourceColumn?` · столб ${r.sourceColumn}`:'';return `№${r.sourceDraw} · ${r.sourceDate||'—'} ${r.sourceTime||'—'}${c}`}
function targetLabel(r){return `№${r.targetDraw} · ${r.targetDate||'—'} ${r.targetTime||'—'}`}
function panelHead(title,name,extra=''){const on=panelState()[name];return `<div class="xrayPanelHead"><div><b>${title}</b>${extra?`<small>${extra}</small>`:''}</div><button type="button" class="xrayFold ${on?'on':''}" data-xfold="${name}" aria-label="${on?'Свернуть':'Развернуть'}">▼</button></div>`}
function gridHTML(r){
  const current=new Set((latest()?.balls||[]).map(Number)),pred=new Set(revealPrediction&&r?.ok?r.predicted20:[]),overlap=new Set([...current].filter(n=>pred.has(n)));
  return Array.from({length:80},(_,i)=>i+1).map(n=>{let cls='';if(overlap.has(n))cls='both';else if(current.has(n))cls='current';else if(pred.has(n))cls='predicted';return `<button class="xrayCell ${cls}" type="button" data-xcell="${n}">${n}</button>`}).join('');
}
function renderOverlay(r){
  const svg=$('xrayOverlay'),stage=$('xrayStage');if(!svg||!stage)return;svg.innerHTML='<defs><marker id="xrayArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z"></path></marker></defs>';if(!revealPrediction||!r?.ok)return;
  const rect=stage.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);svg.setAttribute('width',rect.width);svg.setAttribute('height',rect.height);
  for(const p of (r.transitions||[]).filter(x=>x.kind==='change')){const s=stage.querySelector(`[data-xcell="${p.from}"]`),t=stage.querySelector(`[data-xcell="${p.to}"]`);if(!s||!t)continue;const a=s.getBoundingClientRect(),b=t.getBoundingClientRect();const el=document.createElementNS('http://www.w3.org/2000/svg','line');el.setAttribute('x1',a.left+a.width/2-rect.left);el.setAttribute('y1',a.top+a.height/2-rect.top);el.setAttribute('x2',b.left+b.width/2-rect.left);el.setAttribute('y2',b.top+b.height/2-rect.top);el.setAttribute('class','xrayArrowLine');el.setAttribute('marker-end','url(#xrayArrow)');svg.appendChild(el)}
}
function comboBox(title,cls,nums,r){return `<div class="xrayCombo ${cls}"><div class="xrayComboTop"><b>${title}</b><span>на ${targetLabel(r)}</span></div><div class="xrayComboNums">${nums.map(n=>`<span>${fmt(n)}</span>`).join('')}</div></div>`}
function factHTML(entry){if(!entry||entry.status!=='settled')return '';const fs=new Set(entry.factBalls||[]),c5=new Set(entry.combo5Hits||[]),c7=new Set(entry.combo7Hits||[]),p1=Number(entry.combo5Payout||0),p2=Number(entry.combo7Payout||0);return `<div class="xrayFactBlock">${panelHead(`Факт тиража №${entry.factDraw}`,'fact',`${entry.factDate||'—'} ${entry.factTime||'—'} · столб ${entry.factColumn||'—'}`)}<div class="xrayPanelBody ${panelState().fact?'':'hiddenX'}"><div class="xrayFactNums">${(entry.factBalls||[]).map(n=>`<span>${fmt(n)}</span>`).join('')}</div><div class="xrayFactCombos"><div><b>COMBO-5 · ${entry.combo5Hits?.length||0}/${entry.combo5?.length||0}</b><div class="xrayCheckedNums">${(entry.combo5||[]).map(n=>`<span class="${c5.has(Number(n))?'hit':'miss'}">${fmt(n)} ${c5.has(Number(n))?'✓':'×'}</span>`).join('')}</div>${p1?`<strong class="xrayWin">🔥 ${money(p1)}</strong>`:''}</div><div><b>COMBO-7 · ${entry.combo7Hits?.length||0}/${entry.combo7?.length||0}</b><div class="xrayCheckedNums">${(entry.combo7||[]).map(n=>`<span class="${c7.has(Number(n))?'hit':'miss'}">${fmt(n)} ${c7.has(Number(n))?'✓':'×'}</span>`).join('')}</div>${p2?`<strong class="xrayWin">🔥 ${money(p2)}</strong>`:''}</div></div><div class="xrayLayerResult">Прогнозный слой 20: <b>${entry.layerHits?.length||0}/20</b> совпадений</div></div></div>`}
function archiveItem(e){const settled=e.status==='settled',c5h=new Set(e.combo5Hits||[]),c7h=new Set(e.combo7Hits||[]),p1=Number(e.combo5Payout||0),p2=Number(e.combo7Payout||0);const nums=(arr,hits)=>arr.map(n=>`<span class="${settled?(hits.has(Number(n))?'hit':'miss'):''}">${fmt(n)}${settled?(hits.has(Number(n))?'✓':'×'):''}</span>`).join(' ');return `<div class="xrayArchiveItem"><div class="xrayArchiveTop"><b>На №${e.targetDraw} · ${e.targetDate||'—'} ${e.targetTime||'—'}</b><span class="${settled?'done':'pending'}">${settled?'проверен':'ожидает факт'}</span></div><div class="xrayArchiveSource">Источник: №${e.sourceDraw} · ${e.sourceDate||'—'} ${e.sourceTime||'—'}${e.sourceColumn?` · столб ${e.sourceColumn}`:''}</div><div class="xrayArchiveLine"><b>COMBO-5:</b> ${nums(e.combo5||[],c5h)} ${p1?`<strong>🔥 ${money(p1)}</strong>`:''}</div><div class="xrayArchiveLine"><b>COMBO-7:</b> ${nums(e.combo7||[],c7h)} ${p2?`<strong>🔥 ${money(p2)}</strong>`:''}</div>${settled?`<div class="xrayArchiveFact">Факт: №${e.factDraw} · ${e.factDate||'—'} ${e.factTime||'—'} · <span>столб ${e.factColumn||'—'}</span> · слой ${e.layerHits?.length||0}/20</div>`:''}${e.legacy?'<small class="xrayLegacy">старый архив XRAY</small>':''}</div>`}
async function renderArchive(){const box=$('xrayArchiveBox');if(!box)return;const a=await settleArchive();box.innerHTML=`${panelHead('История Рентгена','archive',`${a.length} записей`)}<div class="xrayPanelBody ${panelState().archive?'':'hiddenX'}">${a.length?a.map(archiveItem).join(''):'<div class="xrayEmpty">Пока frozen-прогнозов нет.</div>'}</div>`;bindFolds(box)}
function payoutRows(size){const m=payouts?.combination?.[String(size)]||{};return Object.keys(m).map(Number).sort((a,b)=>a-b).map(h=>`<span><b>${h}/${size}</b> — ${money(m[h])}</span>`).join('')||'<span>нет данных</span>'}
function payoutsHTML(){return `<div class="xrayPayoutBlock">${panelHead('Таблица выигрышей','payouts',`версия ${esc(payouts?.version||'—')}`)}<div class="xrayPanelBody ${panelState().payouts?'':'hiddenX'}"><div class="xrayPayoutCols"><div><b>COMBO-5</b>${payoutRows(5)}</div><div><b>COMBO-7</b>${payoutRows(7)}</div></div></div></div>`}
function bindFolds(scope=document){scope.querySelectorAll?.('[data-xfold]').forEach(b=>b.onclick=()=>panelToggle(b.dataset.xfold))}
async function render(){
  if(renderBusy)return;renderBusy=true;try{migrateLegacy();await loadPayouts();const root=$('xrayRoot');if(!root)return;const current=latest();if(!current){root.innerHTML='<div class="card"><h2>🔬 Рентген структуры</h2><div class="msg">База ещё не загружена.</div></div>';return}
    if(lastKnownDraw==null)lastKnownDraw=Number(current.draw||0);if(lastAnalysis?.ok&&Number(lastAnalysis.sourceDraw)!==Number(current.draw)){lastAnalysis=null;revealPrediction=false}
    const r=lastAnalysis,good=r?.ok;const a=await settleArchive();const currentEntry=a.find(x=>Number(x.sourceDraw)===Number(good?r.sourceDraw:current.draw)&&!x.legacy)||null;const latestSettled=a.find(x=>x.status==='settled'&&!x.legacy)||null;
    root.innerHTML=`<div class="card xrayCard"><div class="xrayTitleRow"><div><h2>🔬 Рентген структуры</h2><div class="muted">5 последних тиражей → следующий 20-числовый слой</div></div></div><div class="xrayToolbar"><button id="xrayScanBtn" class="primary" type="button">Сканировать</button><button id="xrayNextBtn" type="button" ${good?'':'disabled'}>Ход дальше</button><button id="xrayArchiveBtn" class="ghost ${panelState().archive?'on':''}" type="button">История Рентгена</button></div><div id="xrayMsg" class="xrayNote">${good?`Расчёт от ${sourceLabel(r)}${revealPrediction?` → ${targetLabel(r)}`:''}`:(r?.error||`Последний факт №${current.draw} · ${current.date||'—'} ${current.time||'—'} · столб ${current.column||'—'}`)}</div><div class="xrayGridBlock">${panelHead('Таблица переходов','grid',good&&revealPrediction?`${sourceLabel(r)} → ${targetLabel(r)}`:`№${current.draw} · ${current.date||'—'} ${current.time||'—'}`)}<div class="xrayPanelBody ${panelState().grid?'':'hiddenX'}"><div class="xrayLegend"><span class="current">последний тираж</span><span class="predicted">следующий прогноз</span><span class="both">пересечение</span></div><div id="xrayStage" class="xrayStage"><div class="xrayGrid">${gridHTML(r)}</div><svg id="xrayOverlay" class="xrayOverlay" aria-hidden="true"></svg></div>${good&&revealPrediction?`<div class="xrayCounts"><span>Вышедший <b>20</b></span><span>Прогноз <b>20</b></span><span>Пересечение <b>${r.overlap.length}</b></span></div>`:''}</div></div>${good&&revealPrediction?`<div class="xrayCombosBlock">${panelHead('Комбы на следующий тираж','combos',targetLabel(r))}<div class="xrayPanelBody ${panelState().combos?'':'hiddenX'}"><div class="xrayCombos">${comboBox('COMBO-5','c5',r.combo5,r)}${comboBox('COMBO-7','c7',r.combo7,r)}</div><div class="xrayFreezeNote">Прогноз frozen: после появления факта числа не переписываются.</div></div></div>`:''}${factHTML(currentEntry?.status==='settled'?currentEntry:latestSettled)}<div id="xrayArchiveBox" class="xrayArchiveBlock"></div>${payoutsHTML()}</div>`;
    $('xrayScanBtn')?.addEventListener('click',scan);$('xrayNextBtn')?.addEventListener('click',showNext);$('xrayArchiveBtn')?.addEventListener('click',toggleArchive);bindFolds(root);await renderArchive();requestAnimationFrame(()=>renderOverlay(r));
  }finally{renderBusy=false}}

function tick(){const n=Number(latest()?.draw||0);if(n&&lastKnownDraw&&n!==lastKnownDraw){lastKnownDraw=n;lastAnalysis=null;revealPrediction=false;settleArchive().then(render)}else if(n&&!lastKnownDraw){lastKnownDraw=n;render()}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{render();setInterval(tick,5000)});else{render();setInterval(tick,5000)}
window.ComboXrayUI={scan,showNext,render,settleArchive};
})();
