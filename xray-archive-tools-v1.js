/* XRAY tracking: event-driven, bounded pages, cancellable work. */
(()=>{
'use strict';
if(window.__xrayArchiveToolsV1)return;window.__xrayArchiveToolsV1=true;
const fmt=n=>String(Number(n)).padStart(2,'0'),rub=n=>Number(n||0).toLocaleString('ru-RU')+' ₽',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let drawsFallback=null,drawsLoading=null;
async function allDraws(){
 const shared=typeof DRAWS!=='undefined'?DRAWS:window.getComboDraws?.();
 if(Array.isArray(shared)&&shared.length)return shared;
 if(drawsFallback)return drawsFallback;
 if(drawsLoading)return drawsLoading;
 drawsLoading=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{const response=await fetch('combo-history-v1.json?xray='+Date.now(),{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);const rows=await response.json();if(!Array.isArray(rows)||!rows.length)throw Error('Архив тиражей пуст');drawsFallback=rows;return rows}
  finally{clearTimeout(timer);drawsLoading=null}
 })();
 return drawsLoading;
}
function combo(rec,label){if(label==='20')return rec?.predicted20||[];if(label==='5A')return rec?.combo5A||rec?.combo5||[];if(label==='7A')return rec?.combo7A||rec?.combo7||[];return rec?.['combo'+label]||[]}
function col(d){const c=Number(d?.column);return Number.isInteger(c)&&c>=1&&c<=10?c:'—'}
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
function css(){if(document.getElementById('xrayArchiveToolsStyles'))return;const s=document.createElement('style');s.id='xrayArchiveToolsStyles';s.textContent=`
#xrayRoot .xatColumnStrip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;padding:8px 9px;border:1px solid #315b7d;border-radius:10px;background:#081d2f;font-size:12px;font-weight:850;color:#dcecf7}#xrayRoot .xatColumnStrip b{color:#7fd8ff}.xatArrow{color:#7894a9}
#xrayRoot .xatOrderBtn,#xrayRoot .xatTrackBtn,#xrayRoot .xatDeleteBtn,#xrayRoot .xatMoreBtn{min-height:34px;border-radius:9px;font-size:11px;font-weight:900;padding:7px 10px}#xrayRoot .xatTrackBtn{margin-left:auto;background:#0e4568;border-color:#3e8cbd;color:#e8f8ff;min-width:48px}#xrayRoot .xatTrackBtn.on{background:#1f6838;border-color:#64c77b}#xrayRoot .xatOrderBtn{background:#0b2a41;border-color:#37627f;color:#d9eefb}#xrayRoot .xatDeleteBtn{background:#351722;border-color:#7d3b4d;color:#ffd4db;margin-left:auto}
#xrayRoot .xatArchiveActions,#xrayRoot .xatFactActions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:9px;padding-top:8px;border-top:1px solid #28475f}#xrayRoot .xrayComboRow{grid-template-columns:auto minmax(0,1fr) auto auto!important;gap:7px!important;align-items:center}
#xrayRoot .xatTrackPanel{margin:7px 0 10px;padding:9px;border:1px solid #39759b;border-radius:11px;background:#061b2c}#xrayRoot .xatTrackHead{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;font-size:12px}#xrayRoot .xatTrackHead b{font-size:13px}.xatTrackSub{font-size:10px;color:#9fb7c9;margin-top:2px}.xatTrackNums{display:flex;gap:4px;flex-wrap:wrap;margin-top:7px}.xatTrackNums span{padding:4px 6px;border-radius:7px;background:#173c28;border:1px solid #4c9664;color:#e7ffed;font-size:11px;font-weight:900}
#xrayRoot .xatTrackSummary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:8px 0}.xatTrackStat{padding:7px 4px;border:1px solid #294d67;border-radius:9px;background:#0a2539;text-align:center}.xatTrackStat b{display:block;font-size:14px;color:#7fd8ff}.xatTrackStat span{font-size:8.5px;color:#9fb4c5}.xatTrackRows{display:grid;gap:4px}.xatTrackRow{display:grid;grid-template-columns:74px 86px 44px minmax(0,1fr) auto;gap:5px;align-items:center;padding:6px;border:1px solid #203e54;border-radius:8px;background:#081827;font-size:10px}.xatTrackRow.win{border-color:#4f7d2c;background:#0d2117}.xatTrackDraw{font-weight:950}.xatTrackWhen{color:#9fb4c5}.xatTrackHits{font-weight:950}.xatHitNums{color:#82ef79;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.xatMoney{font-weight:950;color:#ffcf54;white-space:nowrap}.xatZero{color:#73899b}#xrayRoot .xatMoreBtn{width:100%;margin-top:7px;background:#0a2a42;color:#d7eafa}
@media(max-width:520px){#xrayRoot .xatColumnStrip{font-size:11.5px;padding:7px}#xrayRoot .xrayComboRow{grid-template-columns:42px minmax(0,1fr) auto!important}#xrayRoot .xrayComboRow>b{font-size:12px!important}#xrayRoot .xrayComboRowNums span{font-size:11px!important;padding:5px 6px!important}#xrayRoot .xatTrackBtn{padding:6px 8px;min-width:44px}#xrayRoot .xatTrackSummary{grid-template-columns:repeat(2,1fr)}#xrayRoot .xatTrackRow{grid-template-columns:70px 1fr 42px;grid-template-areas:'draw when money' 'hits nums nums';font-size:10.5px;padding:7px}#xrayRoot .xatTrackDraw{grid-area:draw}.xatTrackWhen{grid-area:when}.xatMoney{grid-area:money;text-align:right}.xatTrackHits{grid-area:hits}.xatHitNums{grid-area:nums;white-space:normal}}
`;document.head.appendChild(s)}

async function track(card,rec,label,btn){
 const old=card.querySelector('.xatTrackPanel');
 card.querySelectorAll('.xatTrackBtn,.xrayTrackBtn').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-expanded','false')});
 if(old&&old.dataset.key===label){old.remove();return}
 old?.remove();
 const nums=[...new Set(combo(rec,label).map(Number))].filter(n=>Number.isInteger(n)&&n>=1&&n<=80);
 if(!nums.length)return;
 btn.classList.add('on');btn.setAttribute('aria-expanded','true');
 const from=Number(rec.factDraw||rec.targetDraw),title=label==='20'?'Frozen · 20 чисел':'COMBO-'+label;
 const p=document.createElement('div');p.className='xatTrackPanel';p.dataset.key=label;p.setAttribute('role','region');p.setAttribute('aria-label','Отслеживание '+title);
 p.innerHTML=`<div role="status">${title} · после №${from}. Проверяю тиражи…</div>`;
 const host=card.matches('.xrayFactBlock')?card.querySelector('.xrayPanelBody'):card;
 host.insertBefore(p,host.querySelector(':scope > .xrayArchiveActions')||null);
 const alive=()=>p.isConnected&&card.querySelector('.xatTrackPanel')===p;
 try{
  const all=await allDraws();if(!alive())return;
  const future=all.filter(d=>Number(d.draw)>from).sort((a,b)=>Number(a.draw)-Number(b.draw));
  const payouts=window.ComboXrayUI?.getPayouts()?.combination?.[String(nums.length)];
  const paid=nums.length<=10&&!!payouts,rows=[];let wins=0,total=0,best=0,sum=0;
  for(let i=0;i<future.length;i++){
   const d=future[i],balls=new Set((d.balls||[]).map(Number)),hitNums=nums.filter(n=>balls.has(n)),hits=hitNums.length,payout=paid?Number(payouts[String(hits)]||0):null;
   rows.push({d,hitNums,hits,payout});if(payout>0)wins++;total+=payout||0;best=Math.max(best,hits);sum+=hits;
   if((i+1)%250===0){p.firstElementChild.textContent=`${title} · проверено ${i+1} из ${future.length}…`;await pause();if(!alive())return}
  }
  let page=0;const size=25,pages=Math.max(1,Math.ceil(rows.length/size));
  const draw=()=>{
   if(!alive())return;
   p.innerHTML=`<div class="xatTrackHead"><div><b>${title} · после №${from}</b><div class="xatTrackSub">Проверены последующие тиражи. Исходный frozen не меняется.</div></div><button type="button" data-track-close aria-label="Закрыть отслеживание">✕</button></div><div class="xatTrackNums">${nums.map(n=>`<span>${fmt(n)}</span>`).join('')}</div><div class="xatTrackSummary"><div class="xatTrackStat"><b>${rows.length}</b><span>ТИРАЖЕЙ ДАЛЬШЕ</span></div><div class="xatTrackStat"><b>${best}/${nums.length}</b><span>МАКС. ПОПАДАНИЙ</span></div><div class="xatTrackStat"><b>${paid?wins:sum}</b><span>${paid?'С ВЫПЛАТОЙ':'ВСЕГО ПОПАДАНИЙ'}</span></div><div class="xatTrackStat"><b>${paid?rub(total):rows.length?(sum/rows.length).toFixed(2):'—'}</b><span>${paid?'СУММА ВЫПЛАТ':'СРЕДНЕЕ ПОПАДАНИЙ'}</span></div></div><div class="xatTrackSub">${paid?'Выплаты по текущей таблице, без вычета стоимости билетов.':nums.length>10?'Для набора из 20 чисел показываются совпадения, без расчёта выплат.':'Таблица выплат недоступна; показаны только совпадения.'}</div>${!rows.length?'<div class="msg">Следующих тиражей пока нет. Проверка появится после их выхода.</div>':`<div class="xrayArchivePager"><button type="button" data-track-page="-1" ${page===0?'disabled':''}>← Раньше</button><span>${page*size+1}–${Math.min((page+1)*size,rows.length)} из ${rows.length}</span><button type="button" data-track-page="1" ${page===pages-1?'disabled':''}>Позже →</button></div>`}<div class="xatTrackRows">${rows.slice(page*size,(page+1)*size).map(x=>`<div class="xatTrackRow ${x.payout?'win':''}"><span class="xatTrackDraw">№${Number(x.d.draw)}</span><span class="xatTrackWhen">${esc(x.d.date)} ${esc(x.d.time)} · ст${col(x.d)}</span><span class="xatTrackHits">${x.hits}/${nums.length}</span><span class="xatHitNums ${x.hits?'':'xatZero'}">${x.hits?'попали '+x.hitNums.map(fmt).join(' '):'попаданий нет'}</span><span class="xatMoney">${x.payout?'🔥 '+rub(x.payout):'—'}</span></div>`).join('')}</div>`;
   p.querySelector('[data-track-close]').onclick=()=>{p.remove();btn.classList.remove('on');btn.setAttribute('aria-expanded','false')};
   p.querySelectorAll('[data-track-page]').forEach(b=>b.onclick=()=>{page+=Number(b.dataset.trackPage);draw()});
  };
  draw();
 }catch(error){
  if(!alive())return;
  p.innerHTML=`<div role="alert">Не удалось проверить тиражи: ${esc(error.name==='AbortError'?'превышено время ожидания':error.message)}</div><button type="button" data-track-retry>Повторить</button>`;
  p.querySelector('[data-track-retry]').onclick=()=>{p.remove();void track(card,rec,label,btn)};
 }
}
function decorate(){
 css();const runtime=window.ComboXrayUI?.getRuntime();if(!runtime)return;
 const map=new Map((runtime.history||[]).map(e=>[Number(e.targetDraw||e.factDraw),e]));
 document.querySelectorAll('#xrayRoot .xrayArchiveItem,#xrayRoot .xrayFactBlock').forEach(card=>{
  const rec=card.matches('.xrayFactBlock')?runtime.history?.[0]:map.get(Number(card.dataset.target));if(!rec)return;
  card.querySelectorAll('.xrayComboRow').forEach(row=>{
   if(row.querySelector('.xatTrackBtn'))return;
   const label=String(row.querySelector('b')?.textContent||'').replace('COMBO-','').trim();
   if(!['5A','5B','7A','7B'].includes(label)||!combo(rec,label).length)return;
   const b=document.createElement('button');b.type='button';b.className='xatTrackBtn';b.textContent='Отследить';b.title='Проверить COMBO-'+label+' в следующих тиражах';b.setAttribute('aria-expanded','false');
   b.onclick=()=>void track(card,rec,label,b);row.appendChild(b);
  });
 });
 const line=document.querySelector('#xrayRoot .xrayLiveLine');
 if(line&&!line.dataset.xatColumn){const latest=runtime.latestOfficial;let c=col(latest);if(c==='—')c=(runtime.history||[]).find(e=>Number(e.factDraw)===Number(latest?.draw))?.factColumn??'—';line.append(document.createTextNode(' · столб '+c));line.dataset.xatColumn='1'}
}
window.ComboXrayTracking=Object.freeze({open:track});
window.addEventListener('combo:xray-render',decorate);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
})();
