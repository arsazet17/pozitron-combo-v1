/* COMBO KENO · XRAY archive tools v1 · 03.10.2026
   - ОТС: отследить конкретную frozen-комбу по каждому следующему тиражу.
   - УДЛ: скрыть архивную запись во всех устройствах через Supabase.
   - Явные столбы источника/факта.
   - Переключатель порядка: по выпадению / по возрастанию.
*/
(() => {
  'use strict';
  if (window.__xrayArchiveToolsV1) return;
  window.__xrayArchiveToolsV1 = true;

  const COLLECTION = 'xray_archive_prefs';
  const RUNTIME_URL = 'data/xray-runtime.json';
  const PAYOUT_URL = 'keno-payouts-v1.json';
  const HISTORY_URL = 'combo-history-v1.json';
  const fmt = n => String(Number(n)).padStart(2,'0');
  const rub = n => Number(n||0).toLocaleString('ru-RU') + ' ₽';
  let runtime = null;
  let payouts = null;
  let drawsFallback = null;
  let hidden = new Set();
  let applying = false;
  let scheduled = false;
  let cloudReady = false;

  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function getJSON(url){
    const r = await fetch(url + (url.includes('?')?'&':'?') + '_xat=' + Date.now(), {cache:'no-store'});
    if(!r.ok) throw new Error(url + ': HTTP ' + r.status);
    return r.json();
  }

  async function refreshData(){
    try { runtime = await getJSON(RUNTIME_URL); } catch(e) { console.warn('XRAY archive tools runtime',e); }
    try { payouts ||= await getJSON(PAYOUT_URL); } catch(e) { console.warn('XRAY archive tools payouts',e); }
    scheduleApply();
  }

  function recordMap(){
    const m = new Map();
    for(const e of (runtime?.history||[])) m.set(Number(e.targetDraw||e.factDraw), e);
    return m;
  }

  function drawColumn(d){
    const c = Number(d?.column);
    return Number.isInteger(c) && c>=1 && c<=10 ? c : '—';
  }

  async function allDraws(){
    try {
      const a = typeof window.getComboDraws === 'function' ? window.getComboDraws() : [];
      if(Array.isArray(a) && a.length) return a.slice().sort((x,y)=>Number(x.draw)-Number(y.draw));
    } catch(_) {}
    if(!drawsFallback){
      try { drawsFallback = await getJSON(HISTORY_URL); } catch(e) { console.warn('XRAY tracking history',e); drawsFallback=[]; }
    }
    return (Array.isArray(drawsFallback)?drawsFallback:[]).slice().sort((x,y)=>Number(x.draw)-Number(y.draw));
  }

  function payoutFor(size,hits){
    return Number(payouts?.combination?.[String(size)]?.[String(hits)] || 0);
  }

  function comboFor(rec,label){
    if(!rec) return [];
    if(label==='5A') return rec.combo5A || rec.combo5 || [];
    if(label==='5B') return rec.combo5B || [];
    if(label==='7A') return rec.combo7A || rec.combo7 || [];
    if(label==='7B') return rec.combo7B || [];
    return [];
  }

  function normalizeLabel(text){
    const s=String(text||'').toUpperCase().replace('COMBO-','').trim();
    return ['5A','5B','7A','7B'].includes(s)?s:'';
  }

  function installCss(){
    if(document.getElementById('xrayArchiveToolsStyles')) return;
    const s=document.createElement('style');
    s.id='xrayArchiveToolsStyles';
    s.textContent=`
      #xrayRoot .xatColumnStrip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;padding:8px 9px;border:1px solid #315b7d;border-radius:10px;background:#081d2f;font-size:12px;font-weight:850;color:#dcecf7}
      #xrayRoot .xatColumnStrip b{color:#7fd8ff}.xatArrow{color:#7894a9}
      #xrayRoot .xatOrderBtn,#xrayRoot .xatTrackBtn,#xrayRoot .xatDeleteBtn,#xrayRoot .xatMoreBtn{min-height:34px;border-radius:9px;font-size:11px;font-weight:900;padding:7px 10px}
      #xrayRoot .xatTrackBtn{margin-left:auto;background:#0e4568;border-color:#3e8cbd;color:#e8f8ff;min-width:48px}
      #xrayRoot .xatTrackBtn.on{background:#1f6838;border-color:#64c77b;color:#fff}
      #xrayRoot .xatOrderBtn{background:#0b2a41;border-color:#37627f;color:#d9eefb}
      #xrayRoot .xatDeleteBtn{background:#351722;border-color:#7d3b4d;color:#ffd4db;margin-left:auto}
      #xrayRoot .xatArchiveActions,#xrayRoot .xatFactActions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:9px;padding-top:8px;border-top:1px solid #28475f}
      #xrayRoot .xrayComboRow{grid-template-columns:auto minmax(0,1fr) auto auto!important;gap:7px!important;align-items:center}
      #xrayRoot .xatTrackPanel{margin:7px 0 10px;padding:9px;border:1px solid #39759b;border-radius:11px;background:#061b2c}
      #xrayRoot .xatTrackHead{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;font-size:12px}
      #xrayRoot .xatTrackHead b{font-size:13px;color:#fff}.xatTrackSub{font-size:10px;color:#9fb7c9;margin-top:2px}
      #xrayRoot .xatTrackNums{display:flex;gap:4px;flex-wrap:wrap;margin-top:7px}.xatTrackNums span{padding:4px 6px;border-radius:7px;background:#173c28;border:1px solid #4c9664;color:#e7ffed;font-size:11px;font-weight:900}
      #xrayRoot .xatTrackSummary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:8px 0}.xatTrackStat{padding:7px 4px;border:1px solid #294d67;border-radius:9px;background:#0a2539;text-align:center}.xatTrackStat b{display:block;font-size:14px;color:#7fd8ff}.xatTrackStat span{font-size:8.5px;color:#9fb4c5}
      #xrayRoot .xatTrackRows{display:grid;gap:4px}.xatTrackRow{display:grid;grid-template-columns:74px 86px 44px minmax(0,1fr) auto;gap:5px;align-items:center;padding:6px;border:1px solid #203e54;border-radius:8px;background:#081827;font-size:10px}.xatTrackRow.win{border-color:#4f7d2c;background:#0d2117}.xatTrackDraw{font-weight:950}.xatTrackWhen{color:#9fb4c5}.xatTrackHits{font-weight:950;color:#dceaf4}.xatHitNums{color:#82ef79;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.xatMoney{font-weight:950;color:#ffcf54;white-space:nowrap}.xatZero{color:#73899b}
      #xrayRoot .xatMoreBtn{width:100%;margin-top:7px;background:#0a2a42;color:#d7eafa}
      #xrayRoot .xatHiddenNote{font-size:10px;color:#9fb4c5}
      @media(max-width:520px){
        #xrayRoot .xatColumnStrip{font-size:11.5px;padding:7px}
        #xrayRoot .xrayComboRow{grid-template-columns:30px minmax(0,1fr) auto auto!important}
        #xrayRoot .xrayComboRow>b{font-size:12px!important}
        #xrayRoot .xrayComboRowNums span{font-size:11px!important;padding:5px 6px!important}
        #xrayRoot .xatTrackBtn{padding:6px 8px;min-width:44px}
        #xrayRoot .xatTrackSummary{grid-template-columns:repeat(2,1fr)}
        #xrayRoot .xatTrackRow{grid-template-columns:70px 1fr 42px;grid-template-areas:'draw when money' 'hits nums nums';font-size:10.5px;padding:7px}
        #xrayRoot .xatTrackDraw{grid-area:draw}.xatTrackWhen{grid-area:when}.xatMoney{grid-area:money;text-align:right}.xatTrackHits{grid-area:hits}.xatHitNums{grid-area:nums;white-space:normal}
      }
    `;
    document.head.appendChild(s);
  }

  function captureOrder(box){
    if(box.dataset.xatOrig) return;
    const nums=[...box.children].map(x=>Number(String(x.textContent||'').match(/\d+/)?.[0])).filter(Number.isFinite);
    if(nums.length) box.dataset.xatOrig=JSON.stringify(nums);
  }

  function reorderBox(box,mode){
    captureOrder(box);
    let order=[];try{order=JSON.parse(box.dataset.xatOrig||'[]')}catch{}
    if(!order.length)return;
    if(mode==='asc')order=[...order].sort((a,b)=>a-b);
    const nodes=[...box.children],by=new Map(nodes.map(n=>[Number(String(n.textContent||'').match(/\d+/)?.[0]),n]));
    for(const n of order){const el=by.get(n);if(el)box.appendChild(el)}
  }

  function setCardOrder(card,mode){
    card.dataset.xatOrder=mode;
    card.querySelectorAll('.xray20Nums').forEach(b=>reorderBox(b,mode));
    card.querySelectorAll('.xatOrderBtn').forEach(b=>b.textContent=mode==='asc'?'По возрастанию':'По выпадению');
  }

  function addOrderButton(card,holder){
    if(holder.querySelector('.xatOrderBtn'))return;
    const b=document.createElement('button');b.type='button';b.className='xatOrderBtn';b.textContent='По выпадению';
    b.onclick=e=>{e.stopPropagation();setCardOrder(card,card.dataset.xatOrder==='asc'?'draw':'asc')};
    holder.appendChild(b);setCardOrder(card,card.dataset.xatOrder||'draw');
  }

  function columnStrip(rec){
    const d=document.createElement('div');d.className='xatColumnStrip';
    d.innerHTML=`<span>Источник: <b>столб ${esc(rec?.sourceColumn??'—')}</b></span><span class="xatArrow">→</span><span>Факт: <b>столб ${esc(rec?.factColumn??'—')}</b></span>`;
    return d;
  }

  async function renderTrack(card,rec,label,btn){
    const old=card.querySelector('.xatTrackPanel');
    if(old && old.dataset.key===label){old.remove();btn.classList.remove('on');return}
    if(old)old.remove();card.querySelectorAll('.xatTrackBtn').forEach(x=>x.classList.remove('on'));btn.classList.add('on');
    const combo=(comboFor(rec,label)||[]).map(Number).filter(Number.isFinite);
    if(!combo.length)return;
    const panel=document.createElement('div');panel.className='xatTrackPanel';panel.dataset.key=label;
    panel.innerHTML=`<div class="xatTrackHead"><div><b>ОТС · ${label} · после №${Number(rec.factDraw||rec.targetDraw)}</b><div class="xatTrackSub">Показывает каждый следующий тираж этой же комбы.</div></div><span>загрузка…</span></div>`;
    const actions=card.querySelector('.xatArchiveActions');card.insertBefore(panel,actions||null);
    const draws=await allDraws(),after=draws.filter(d=>Number(d.draw)>Number(rec.factDraw||rec.targetDraw));
    const rows=after.map(d=>{const s=new Set((d.balls||[]).map(Number)),hitNums=combo.filter(n=>s.has(n)),hits=hitNums.length,payout=payoutFor(combo.length,hits);return{d,hitNums,hits,payout}});
    const wins=rows.filter(x=>x.payout>0).length,total=rows.reduce((a,x)=>a+x.payout,0),best=rows.reduce((m,x)=>Math.max(m,x.hits),0);
    let shown=Math.min(50,rows.length);
    const renderRows=()=>{
      panel.innerHTML=`<div class="xatTrackHead"><div><b>ОТС · ${label} · после №${Number(rec.factDraw||rec.targetDraw)}</b><div class="xatTrackSub">${combo.map(fmt).join(' · ')}</div></div><span>${rows.length} тир.</span></div><div class="xatTrackNums">${combo.map(n=>`<span>${fmt(n)}</span>`).join('')}</div><div class="xatTrackSummary"><div class="xatTrackStat"><b>${rows.length}</b><span>ТИРАЖЕЙ ДАЛЬШЕ</span></div><div class="xatTrackStat"><b>${wins}</b><span>С ВЫПЛАТОЙ</span></div><div class="xatTrackStat"><b>${best}/${combo.length}</b><span>ЛУЧШЕЕ ПОПАДАНИЕ</span></div><div class="xatTrackStat"><b>${rub(total)}</b><span>СУММА ВЫПЛАТ</span></div></div><div class="xatTrackRows">${rows.slice(0,shown).map(x=>`<div class="xatTrackRow ${x.payout>0?'win':''}"><span class="xatTrackDraw">№${Number(x.d.draw)}</span><span class="xatTrackWhen">${esc(x.d.date||'')} ${esc(x.d.time||'')} · ст${drawColumn(x.d)}</span><span class="xatTrackHits">${x.hits}/${combo.length}</span><span class="xatHitNums ${x.hitNums.length?'':'xatZero'}">${x.hitNums.length?'попали '+x.hitNums.map(fmt).join(' '):'попаданий нет'}</span><span class="xatMoney">${x.payout>0?'🔥 '+rub(x.payout):'—'}</span></div>`).join('')}</div>${shown<rows.length?`<button class="xatMoreBtn" type="button">Ещё 50 · показано ${shown}/${rows.length}</button>`:''}`;
      const more=panel.querySelector('.xatMoreBtn');if(more)more.onclick=()=>{shown=Math.min(rows.length,shown+50);renderRows()};
    };
    renderRows();
  }

  function patchComboButtons(card,rec){
    card.querySelectorAll('.xrayComboRow').forEach(row=>{
      if(row.querySelector('.xatTrackBtn'))return;
      const label=normalizeLabel(row.querySelector('b')?.textContent);if(!label)return;
      const combo=comboFor(rec,label);if(!Array.isArray(combo)||!combo.length)return;
      const b=document.createElement('button');b.type='button';b.className='xatTrackBtn';b.textContent='ОТС';b.title='Отследить эту комбу по всем следующим тиражам';
      b.onclick=e=>{e.stopPropagation();void renderTrack(card,rec,label,b)};
      row.appendChild(b);
    });
  }

  async function deleteArchiveRecord(card,rec,btn){
    const target=Number(rec?.targetDraw||rec?.factDraw);if(!target)return;
    if(!confirm(`Удалить №${target} из отображаемого архива XRAY на всех устройствах?\nСерверный frozen-аудит останется нетронут.`))return;
    btn.disabled=true;btn.textContent='…';
    const id='hide-'+target,payload={id,type:'hidden',targetDraw:target,hiddenAt:Date.now()};
    const ok=await window.ComboCloudHistory?.upsert?.(COLLECTION,id,payload);
    if(!ok){btn.disabled=false;btn.textContent='УДЛ';alert('Не удалось сохранить удаление в Supabase.');return}
    hidden.add(target);card.remove();
  }

  function patchArchiveCard(card,rec){
    const target=Number(rec?.targetDraw||rec?.factDraw);if(hidden.has(target)){card.remove();return}
    if(!card.querySelector('.xatColumnStrip')){
      const top=card.querySelector('.xrayArchiveTop');if(top)top.insertAdjacentElement('afterend',columnStrip(rec));
    }
    patchComboButtons(card,rec);
    let actions=card.querySelector('.xatArchiveActions');
    if(!actions){
      actions=document.createElement('div');actions.className='xatArchiveActions';
      card.appendChild(actions);
      addOrderButton(card,actions);
      const del=document.createElement('button');del.type='button';del.className='xatDeleteBtn';del.textContent='УДЛ';del.title='Убрать эту запись из архива XRAY';del.onclick=e=>{e.stopPropagation();void deleteArchiveRecord(card,rec,del)};actions.appendChild(del);
    }
    setCardOrder(card,card.dataset.xatOrder||'draw');
  }

  function patchFactBlock(map){
    const card=document.querySelector('#xrayRoot .xrayFactBlock');if(!card)return;
    const title=card.querySelector('.xrayPanelHead b')?.textContent||'';
    const n=Number(title.match(/№(\d+)/)?.[1]);const rec=map.get(n)||runtime?.history?.[0];if(!rec)return;
    const body=card.querySelector('.xrayPanelBody');if(!body)return;
    if(!body.querySelector('.xatColumnStrip'))body.insertBefore(columnStrip(rec),body.firstChild);
    let actions=body.querySelector('.xatFactActions');if(!actions){actions=document.createElement('div');actions.className='xatFactActions';body.appendChild(actions);addOrderButton(card,actions)}
    setCardOrder(card,card.dataset.xatOrder||'draw');
  }

  function patchLiveColumn(){
    const line=document.querySelector('#xrayRoot .xrayLiveLine');if(!line||line.dataset.xatColumn==='1')return;
    const latest=runtime?.latestOfficial;if(!latest)return;
    let col=drawColumn(latest);
    if(col==='—'){
      const r=(runtime?.history||[]).find(x=>Number(x.factDraw)===Number(latest.draw));if(r)col=r.factColumn??'—';
    }
    line.append(document.createTextNode(` · столб ${col}`));line.dataset.xatColumn='1';
  }

  function apply(){
    if(applying)return;applying=true;
    try{
      installCss();const root=document.getElementById('xrayRoot');if(!root||!runtime)return;
      const map=recordMap();patchLiveColumn();patchFactBlock(map);
      root.querySelectorAll('.xrayArchiveItem').forEach(card=>{
        const title=card.querySelector('.xrayArchiveTop b')?.textContent||'';const target=Number(title.match(/№(\d+)/)?.[1]);const rec=map.get(target);if(rec)patchArchiveCard(card,rec);
      });
    } finally {applying=false}
  }

  function scheduleApply(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()})}

  async function refreshCloud(){
    if(!window.ComboCloudHistory)return;
    try{
      const rows=await window.ComboCloudHistory.list(COLLECTION);
      hidden=new Set((rows||[]).filter(x=>x?.type==='hidden').map(x=>Number(x.targetDraw)).filter(Number.isFinite));
      cloudReady=true;scheduleApply();
    }catch(e){console.warn('XRAY archive prefs cloud',e)}
  }

  async function boot(){
    installCss();
    await refreshData();
    try{await Promise.resolve(window.ComboCloudHistory?.ready)}catch{}
    await refreshCloud();
    const root=document.getElementById('xrayRoot');
    if(root)new MutationObserver(scheduleApply).observe(root,{childList:true,subtree:true});
    window.addEventListener('combo:xray-refresh',()=>{void refreshData()});
    window.addEventListener('focus',()=>{void refreshData();void refreshCloud()});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){void refreshData();void refreshCloud()}});
    setInterval(()=>{if(!document.hidden){void refreshData();if(cloudReady)void refreshCloud()}},30000);
    scheduleApply();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else void boot();
})();
