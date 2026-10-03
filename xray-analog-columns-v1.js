// XRAY-AI 2.0 compatibility file.
// Старый поиск дальних аналогов и геометрических столбцов отключён.
window.ComboXrayAnalogColumns={disabled:true,version:'XRAY-AI-2.0.0'};

/* COMBO KENO · XRAY archive controls · 03.10.2026
   - Явно показывает столб источника и столб факта/цели.
   - Один toggle: По возрастанию ↔ По выпадению.
   - Применяет порядок к факту, frozen и проверяемым комбо.
   - «Удалить запись» сохраняет скрытие в Supabase xray_archive_prefs.
   - «Отследить» открывает историю frozen-комбинации по последующим тиражам.
*/
(() => {
  'use strict';
  if (window.__comboXrayArchiveControlsV1) return;
  window.__comboXrayArchiveControlsV1 = true;

  const ENDPOINT='https://oviqrkdkahammpuyreil.supabase.co/functions/v1/combo-history';
  const API_KEY='sb_publishable_1m9JJLimTkluI2uS0r5VXA_EF3trjvU';
  const COLLECTION='xray_archive_prefs';

  let runtime=null;
  let sortMode='asc';
  let hiddenTargets=new Set();
  let patchBusy=false;
  let prefsLoading=null;

  const style=document.createElement('style');
  style.textContent=`
    .xrayExplicitMeta{margin:8px 0;padding:8px 9px;border:1px solid #315b7d;border-radius:10px;background:#071a2b;font-size:11px;line-height:1.5;color:#dbe8f2}
    .xrayExplicitMeta b{color:#fff}.xraySortBar{display:flex;justify-content:flex-end;margin:7px 0;gap:6px}.xraySortToggle{padding:8px 10px!important;border-radius:9px!important;font-size:11px!important;background:#0a1c2d!important;color:#dceaf4!important}.xraySortToggle.active{background:linear-gradient(180deg,#2c7d40,#1e5b32)!important;border-color:#55c876!important;color:#fff!important}
    .xrayArchiveActions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px;padding-top:8px;border-top:1px solid #294b66}.xrayArchiveActions button{padding:9px 8px;font-size:11px;border-radius:9px}.xrayTrackBtn{background:#0a2740;border-color:#35698f}.xrayDeleteBtn{background:#321720;border-color:#7c3848;color:#ffd5db}.xrayCloudNote{font-size:9px;color:#8fa7ba;margin-top:5px;text-align:right}
    @media(max-width:380px){.xrayExplicitMeta{font-size:10px}.xrayArchiveActions button,.xraySortToggle{font-size:10px!important;padding:8px 5px!important}}
  `;
  document.head.appendChild(style);

  const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const col=v=>{const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=10?n:'—'};
  const targetId=e=>String(Number(e?.targetDraw||e?.factDraw||0)||'');

  async function cloud(method,id='',payload=null){
    const qs=new URLSearchParams({collection:COLLECTION});
    if(id)qs.set('id',String(id));
    const opts={method,headers:{'content-type':'application/json','apikey':API_KEY},cache:'no-store'};
    if(payload!==null)opts.body=JSON.stringify(payload);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    opts.signal=controller.signal;
    try{
    const r=await fetch(`${ENDPOINT}?${qs.toString()}`,opts);
    let data={};try{data=await r.json()}catch(_){ }
    if(!r.ok)throw new Error(data?.detail||data?.error||`HTTP ${r.status}`);
    return data;
    }finally{clearTimeout(timer)}
  }

  async function loadPrefs(){
    if(prefsLoading)return prefsLoading;
    prefsLoading=(async()=>{try{
      const data=await cloud('GET');
      // Both previously published controllers wrote hide preferences; retain both formats.
      for(const row of data.items||[]){const p=row.payload||{};if(p.hidden===true||p.type==='hidden'){
        const id=Number(p.targetDraw||p.factDraw||String(row.item_id).replace(/^hide-/,''));if(id)hiddenTargets.add(id);
      }}
      window.ComboXrayUI?.setHiddenTargets(hiddenTargets);
    }catch(e){console.warn('XRAY prefs load',e)}finally{prefsLoading=null}})();
    return prefsLoading;
  }

  function metaHTML(e,isOpenForecast=false){
    const sourceDraw=e?.sourceDraw||'—';
    const sourceDate=e?.sourceDate||'—';
    const sourceTime=e?.sourceTime||'—';
    const sourceColumn=col(e?.sourceColumn);
    if(isOpenForecast){
      return `<div><b>Источник:</b> №${esc(sourceDraw)} · ${esc(sourceDate)} ${esc(sourceTime)} · столб ${sourceColumn}</div><div><b>Цель:</b> №${esc(e?.targetDraw)} · ${esc(e?.targetDate)} ${esc(e?.targetTime)} · столб ${col(e?.factColumn??e?.targetColumn)}</div>`;
    }
    return `<div><b>Источник:</b> №${esc(sourceDraw)} · ${esc(sourceDate)} ${esc(sourceTime)} · столб ${sourceColumn}</div><div><b>Факт:</b> №${esc(e?.factDraw||e?.targetDraw)} · ${esc(e?.targetDate||e?.factDate)} ${esc(e?.targetTime||e?.factTime)} · столб ${col(e?.factColumn)}</div>`;
  }

  function addMeta(host,e,isOpenForecast=false){
    if(!host||!e)return;
    let box=host.querySelector(':scope > .xrayExplicitMeta');
    if(!box){box=document.createElement('div');box.className='xrayExplicitMeta';const head=host.querySelector(':scope > .xrayPanelHead, :scope > .xrayArchiveTop');if(head)head.insertAdjacentElement('afterend',box);else host.prepend(box)}
    const html=metaHTML(e,isOpenForecast);if(box.innerHTML!==html)box.innerHTML=html;
  }

  function sortButtonHTML(){return `<button type="button" class="xraySortToggle active" title="Факт — в порядке выпадения; прогноз и комбы — в сохранённом порядке или по возрастанию" data-xray-sort-toggle>${sortMode==='asc'?'➡️ По возрастанию':'🎲 По выпадению'}</button>`}
  function ensureSortBar(host){
    if(!host)return;
    let bar=host.querySelector(':scope > .xraySortBar');
    if(!bar){bar=document.createElement('div');bar.className='xraySortBar';const meta=host.querySelector(':scope > .xrayExplicitMeta');if(meta)meta.insertAdjacentElement('afterend',bar);else host.prepend(bar)}
    const html=sortButtonHTML();if(bar.innerHTML!==html)bar.innerHTML=html;
    const b=bar.querySelector('[data-xray-sort-toggle]');
    if(b)b.onclick=()=>{sortMode=sortMode==='asc'?'draw':'asc';patch()};
  }

  function reorder(container,original){
    if(!container||!Array.isArray(original))return;
    const nodes=[...container.children];
    if(!nodes.length)return;
    const buckets=new Map();
    for(const node of nodes){const m=String(node.textContent||'').match(/\d+/);if(!m)continue;const n=Number(m[0]);if(!buckets.has(n))buckets.set(n,[]);buckets.get(n).push(node)}
    const wanted=sortMode==='asc'?[...original].map(Number).sort((a,b)=>a-b):original.map(Number);
    const current=nodes.map(n=>Number(String(n.textContent||'').match(/\d+/)?.[0]));
    if(current.length===wanted.length&&current.every((n,i)=>n===wanted[i]))return;
    for(const n of wanted){const bucket=buckets.get(Number(n));const node=bucket?.shift();if(node)container.appendChild(node)}
  }

  function applyOrderToFact(card,e){
    if(!card||!e)return;
    const groups=[...card.querySelectorAll('.xray20Nums')];
    reorder(groups[0],e.factBalls||[]);
    reorder(groups[1],e.predicted20||[]);
    const combos=[e.combo5A||e.combo5||[],e.combo5B||[],e.combo7A||e.combo7||[],e.combo7B||[]];
    [...card.querySelectorAll('.xrayComboRow .xrayComboRowNums')].forEach((el,i)=>reorder(el,combos[i]||[]));
  }

  function applyOrderToArchive(item,e){
    if(!item||!e)return;
    const groups=[...item.querySelectorAll('.xray20Nums')];
    reorder(groups[0],e.factBalls||[]);
    reorder(groups[1],e.predicted20||[]);
    const combos=[e.combo5A||e.combo5||[],e.combo5B||[],e.combo7A||e.combo7||[],e.combo7B||[]];
    [...item.querySelectorAll('.xrayComboRow .xrayComboRowNums')].forEach((el,i)=>reorder(el,combos[i]||[]));
  }

  async function deleteArchive(e,item){
    const id=targetId(e);if(!id)return;
    if(!confirm('Скрыть запись №'+id+' из истории на всех устройствах? Сам frozen-прогноз и результат останутся в архиве.'))return;
    const button=item.querySelector('.xrayDeleteBtn');button.disabled=true;button.textContent='Сохраняю…';
    const payload={id,targetDraw:Number(e.targetDraw)||null,factDraw:Number(e.factDraw)||null,hidden:true,updatedAt:Date.now()};
    try{await cloud('POST','',{collection:COLLECTION,id,payload});hiddenTargets.add(Number(id));window.ComboXrayUI?.setHiddenTargets(hiddenTargets)}
    catch(err){alert('Не удалось скрыть запись. Попробуйте ещё раз.\n'+String(err?.message||err))}
    finally{button.disabled=false;button.textContent='Скрыть запись'}
  }

  function ensureActions(item,e){
    if(!item||!e)return;
    let box=item.querySelector(':scope > .xrayArchiveActions');
    if(!box){box=document.createElement('div');box.className='xrayArchiveActions';item.appendChild(box)}
    if(!box.children.length)box.innerHTML='<button type="button" class="xrayTrackBtn">🔎 Отследить 20 чисел</button><button type="button" class="xrayDeleteBtn">Скрыть запись</button>';
    const track=box.querySelector('.xrayTrackBtn');track.onclick=()=>window.ComboXrayTracking?.open(item,e,'20',track);
    box.querySelector('.xrayDeleteBtn').onclick=()=>deleteArchive(e,item);
    let note=item.querySelector(':scope > .xrayCloudNote');if(!note){note=document.createElement('div');note.className='xrayCloudNote';item.appendChild(note)}if(!note.textContent)note.textContent='Скрытие синхронизируется между устройствами';
  }

  function patchTableCard(f){
    if(!f)return;
    const heads=[...document.querySelectorAll('#xrayRoot .xrayPanelHead')];
    const head=heads.find(h=>h.textContent.includes('Таблица 1–80 · столбы концентрации'));
    const card=head?.closest('.card');if(card)addMeta(card,f,true);
    const forecastHead=heads.find(h=>h.textContent.includes('FROZEN-прогноз на следующий тираж'));
    const forecastCard=forecastHead?.closest('.card');if(forecastCard)addMeta(forecastCard,f,true);
  }

  function patchFact(h){
    const e=h?.[0],card=document.querySelector('#xrayRoot .xrayFactBlock');
    if(!e||!card)return;
    addMeta(card,e,false);ensureSortBar(card);applyOrderToFact(card,e);
  }

  function patchArchive(h){
    const archiveHead=[...document.querySelectorAll('#xrayRoot .xrayPanelHead')].find(x=>x.textContent.includes('История проверенных frozen-прогнозов'));
    const archiveCard=archiveHead?.closest('.card');
    if(archiveCard)ensureSortBar(archiveCard);
    const items=[...document.querySelectorAll('#xrayRoot .xrayArchiveItem')];
    const byTarget=new Map(h.map(e=>[Number(e.targetDraw||e.factDraw),e]));
    items.forEach(item=>{
      const e=byTarget.get(Number(item.dataset.target));if(!e)return;
      addMeta(item,e,false);applyOrderToArchive(item,e);ensureActions(item,e);
    });
  }

  function patch(){
    runtime=window.ComboXrayUI?.getRuntime();if(patchBusy||!runtime)return;patchBusy=true;
    try{const f=runtime.forecast||null,h=Array.isArray(runtime.history)?runtime.history:[];patchTableCard(f);patchFact(h);patchArchive(h)}finally{patchBusy=false}
  }
  const boot=()=>{
    window.addEventListener('combo:xray-render',patch);
    window.addEventListener('focus',()=>void loadPrefs());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void loadPrefs()});
    patch();void loadPrefs();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
