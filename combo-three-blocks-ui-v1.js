/* COMBO KENO · 3 БЛОКА + Supabase archive · UI v2 · 02.10.2026 */
(() => {
  'use strict';
  if(window.__comboThreeBlocksUIV2)return;
  window.__comboThreeBlocksUIV2=true;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const f2=n=>String(Number(n)).padStart(2,'0');
  const chips=(a,cls='')=>Array.isArray(a)&&a.length?`<div class="tbChips">${a.map(n=>`<span class="tbChip ${cls}">${f2(n)}</span>`).join('')}</div>`:'<div class="tbEmptyLine">не сформирована</div>';
  let openMain=true,openArchive=true,openIds=new Set(),ticking=false,lastLatest=0;

  function installCss(){
    if(document.getElementById('comboThreeBlocksStylesV2'))return;
    const s=document.createElement('style');s.id='comboThreeBlocksStylesV2';s.textContent=`
      #comboThreeBlocksRoot{margin:0;display:grid;gap:9px}.tbCard{border:1px solid #315b7d;border-radius:14px;background:linear-gradient(180deg,#0d2940,#071725);overflow:hidden}.tbHead{width:100%;display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;border:0;border-radius:0;background:#102a43;padding:11px 12px;text-align:left}.tbHead b{font-size:16px}.tbHead small{display:block;color:#9eb0c1;font-size:9px;margin-top:2px}.tbBody{padding:9px;display:grid;gap:8px}.tbTarget{padding:9px;border:1px solid #294b66;border-radius:10px;background:#081827;font-size:11px;color:#c7d7e6;line-height:1.45}.tbTarget b{color:#fff}.tbBlocks{display:grid;grid-template-columns:1fr;gap:8px}.tbBlock{padding:10px;border:1px solid #294b66;border-radius:11px;background:#081827}.tbBlock.signal{border-color:#4d7c43}.tbBlock.hot{border-color:#876625}.tbBlockTop{display:flex;align-items:center;justify-content:space-between;gap:8px}.tbBlockTitle{font-size:13px;font-weight:950;color:#fff}.tbBadge{font-size:9px;font-weight:900;padding:3px 6px;border:1px solid #3d6686;border-radius:7px;color:#a9d7f7;white-space:nowrap}.tbBadge.on{color:#9cff78;border-color:#4f8a45}.tbBadge.hot{color:#ffd65b;border-color:#9a7624}.tbMeta{font-size:10px;color:#9fb2c4;line-height:1.4;margin-top:4px}.tbLabel{font-size:9px;color:#c5d5e4;font-weight:900;margin-top:7px}.tbMainLabel{font-size:10px;color:#fff;font-weight:950;margin-top:8px}.tbChips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.tbChip{padding:4px 6px;border-radius:6px;background:#173b1d;border:1px solid #4f8a45;color:#e4ffd9;font-size:11px;font-weight:950}.tbChip.blue{background:#0a2135;border-color:#315b7d;color:#b9dfff}.tbChip.strong{background:#352510;border-color:#9a7624;color:#ffe08a}.tbChip.max{background:#412118;border-color:#b8653c;color:#ffd2a3}.tbChip.source{background:#102a43;border-color:#315b7d;color:#e7f3fc}.tbEmptyLine{font-size:10px;color:#75899b;margin-top:4px}.tbNote{font-size:9.5px;color:#91a6b8;line-height:1.4;margin-top:5px}.tbArchiveList{display:grid;gap:7px}.tbRow{border:1px solid #294b66;border-radius:10px;background:#081827;overflow:hidden}.tbRowTop{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;padding:8px}.tbRowTitle{font-size:11px;font-weight:950}.tbScores{font-size:9px;color:#b8c9d8;margin-top:3px}.tbActions{display:flex;gap:5px}.tbOpen,.tbDel{padding:7px;border-radius:8px;font-size:9px}.tbOpen{background:#0a2135}.tbDel{background:#281520;border-color:#6d3343;color:#ffd2d7}.tbDetail{border-top:1px solid #203c54;padding:8px;display:grid;gap:7px}.tbDetailBlock,.tbFact{padding:8px;border:1px solid #294b66;border-radius:9px;background:#071725}.tbFactTitle{font-size:10px;font-weight:950}.tbScoreLine{font-size:10px;color:#c6d6e4;line-height:1.5}.tbHit{color:#9cff78;font-weight:950}.tbMiss{color:#ffb6b6;font-weight:950}.tbFactNums{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px;margin-top:5px}.tbFactNum{text-align:center;font-size:9px;padding:3px 0;border-radius:5px;background:#0a1c2d}.tbSync{font-size:9px;color:#7fd8ff;font-weight:850}.tbSync.err{color:#ffb6b6}.tbEmpty{padding:10px;border:1px dashed #315677;border-radius:9px;color:#9fb2c4;font-size:10px;line-height:1.4}
      @media(min-width:560px){.tbBlocks{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:380px){.tbChip{font-size:10px;padding:4px 5px}.tbOpen,.tbDel{padding:6px 5px;font-size:8.5px}}
    `;document.head.appendChild(s);
  }

  function ensureRoot(){
    let root=document.getElementById('comboThreeBlocksRoot');if(root)return root;
    const host=document.getElementById('threeBlocksDrawerBody')||document.querySelector('.app');if(!host)return null;
    root=document.createElement('div');root.id='comboThreeBlocksRoot';host.appendChild(root);return root;
  }

  function currentHtml(a){
    if(!a)return '<div class="tbEmpty">Жду загрузку архива КЕНО.</div>';
    const b1=a.blocks.b1,b2=a.blocks.b2,b3=a.blocks.b3;
    const target=`№${a.target.draw} · ${esc(a.target.date||'—')} ${esc(a.target.time||'')}`;
    const b3combo=(b3.k3?.length||b3.k4?.length||b3.k5?.length)
      ? `<div class="tbMainLabel">Комбы из STRONG/MAX</div><div class="tbLabel">K3</div>${chips(b3.k3,'strong')}<div class="tbLabel">K4</div>${chips(b3.k4,'strong')}<div class="tbLabel">K5</div>${chips(b3.k5,'strong')}`
      : '<div class="tbNote">STRONG/MAX сейчас меньше трёх — B3 комбу не выдумывает.</div>';
    return `<div class="tbTarget"><b>ПРОГНОЗ НА ${target}</b><br>Источник №${a.source.draw} · ${esc(a.source.date)} ${esc(a.source.time)}. Каждый блок считает по своей логике.<div class="tbLabel">20 чисел источника</div>${chips(a.source.balls,'source')}</div>
      <div class="tbBlocks">
        <div class="tbBlock ${b1.signal?'signal':''}">
          <div class="tbBlockTop"><span class="tbBlockTitle">B1 · ВХОД K7</span><span class="tbBadge ${b1.signal?'on':''}">${b1.signal?'СИГНАЛ':'ФОН'} · ${b1.level}</span></div>
          <div class="tbMeta">Логика: исторические повторы этого же времени. N∩N−2=${a.metrics.interN2}, J3=${a.metrics.j3}.</div>
          <div class="tbMainLabel">K7 по временным аналогам</div>${chips(b1.k7)}
          <div class="tbLabel">J3 числа</div>${chips(b1.j3Numbers,'blue')}
        </div>
        <div class="tbBlock ${b2.signal?'signal':''}">
          <div class="tbBlockTop"><span class="tbBlockTitle">B2 · МОЩНОСТЬ K7</span><span class="tbBadge ${b2.signal?'on':''}">${b2.signal?'36+':'ФОН'} · U2=${b2.u2}</span></div>
          <div class="tbMeta">Логика: структура N−1/N−2 и ядро мощности. Это не рейтинг B1 и не плотность B3.</div>
          <div class="tbMainLabel">K7-1</div>${chips(b2.k7a,'blue')}<div class="tbLabel">K7-2</div>${chips(b2.k7b,'blue')}<div class="tbLabel">K7-3</div>${chips(b2.k7c,'blue')}<div class="tbLabel">K4 ядра</div>${chips(b2.k4,'blue')}<div class="tbLabel">Ядро 9</div>${chips(b2.core9,'blue')}
        </div>
        <div class="tbBlock ${b3.flow==='HOT'?'hot':''}">
          <div class="tbBlockTop"><span class="tbBlockTitle">B3 · ПЕРЕХОДЫ</span><span class="tbBadge ${b3.flow==='HOT'?'hot':''}">${b3.flow}</span></div>
          <div class="tbMeta">Логика: только плотность переходов. Переходов ${b3.transitionCount}, ΣT=${b3.sumT}.</div>
          <div class="tbLabel">MAX</div>${chips(b3.max,'max')}<div class="tbLabel">STRONG</div>${chips(b3.strong,'strong')}<div class="tbLabel">WATCH</div>${chips(b3.watch,'blue')}${b3combo}
        </div>
      </div>`;
  }

  function bestB2(r){
    const xs=[r?.k7a,r?.k7b,r?.k7c].filter(x=>x?.size);if(!xs.length)return '—';
    const best=xs.reduce((p,c)=>c.hits>p.hits?c:p,xs[0]);return `${best.hits}/7`;
  }
  function bestScore(rec,block){
    const r=rec?.result?.blocks?.[block];if(!r)return 'ожид.';
    if(block==='b1')return r.k7?.size?`${r.k7.hits}/${r.k7.size}`:'—';
    if(block==='b2')return bestB2(r);
    for(const k of ['k3','k4','k5'])if(r[k]?.size)return `${r[k].hits}/${r[k].size}`;
    return 'нет комбы';
  }
  function scoreLine(label,x){
    if(!x?.size)return `<div class="tbScoreLine">${esc(label)}: —</div>`;
    const cls=x.hits>0?'tbHit':'tbMiss';
    return `<div class="tbScoreLine">${esc(label)}: <span class="${cls}">${x.hits}/${x.size}</span>${x.hitNums?.length?` · ${x.hitNums.map(f2).join(' ')}`:''}</div>`;
  }

  function detailHtml(rec){
    const r=rec.result,b1=rec.blocks?.b1||{},b2=rec.blocks?.b2||{},b3=rec.blocks?.b3||{};
    return `<div class="tbDetail">
      <div class="tbDetailBlock"><div class="tbFactTitle">B1 · временные аналоги</div><div class="tbLabel">Frozen K7</div>${chips(b1.k7)}${r?scoreLine('K7',r.blocks?.b1?.k7):'<div class="tbNote">Факт ещё не вышел.</div>'}</div>
      <div class="tbDetailBlock"><div class="tbFactTitle">B2 · мощность / ядро</div><div class="tbLabel">K7-1 / K7-2 / K7-3</div>${chips(b2.k7a||b2.k7,'blue')}${chips(b2.k7b,'blue')}${chips(b2.k7c,'blue')}<div class="tbLabel">Ядро 9</div>${chips(b2.core9,'blue')}${r?scoreLine('K7-1',r.blocks?.b2?.k7a)+scoreLine('K7-2',r.blocks?.b2?.k7b)+scoreLine('K7-3',r.blocks?.b2?.k7c)+scoreLine('Ядро 9',r.blocks?.b2?.core9):'<div class="tbNote">Факт ещё не вышел.</div>'}</div>
      <div class="tbDetailBlock"><div class="tbFactTitle">B3 · переходная плотность</div><div class="tbLabel">MAX / STRONG / WATCH</div>${chips(b3.max,'max')}${chips(b3.strong,'strong')}${chips(b3.watch,'blue')}<div class="tbLabel">K3 / K4 / K5 только из STRONG/MAX</div>${chips(b3.k3,'strong')}${chips(b3.k4,'strong')}${chips(b3.k5,'strong')}${r?scoreLine('K3',r.blocks?.b3?.k3)+scoreLine('K4',r.blocks?.b3?.k4)+scoreLine('K5',r.blocks?.b3?.k5):'<div class="tbNote">Факт ещё не вышел.</div>'}</div>
      ${r?`<div class="tbFact"><div class="tbFactTitle">ФАКТ №${r.draw} · ${esc(r.date)} ${esc(r.time)}</div><div class="tbFactNums">${(r.balls||[]).map(n=>`<span class="tbFactNum">${f2(n)}</span>`).join('')}</div></div>`:`<div class="tbFact"><div class="tbFactTitle">ФАКТ ожидается: №${rec.targetDraw} · ${esc(rec.targetDate||'—')} ${esc(rec.targetTime||'')}</div></div>`}
    </div>`;
  }

  function archiveHtml(rows){
    if(!rows.length)return '<div class="tbEmpty">Архив Supabase пока пуст. Текущий FROZEN запишется автоматически.</div>';
    return `<div class="tbArchiveList">${rows.map(rec=>{const id=esc(rec.id),opened=openIds.has(String(rec.id));const when=rec.result?`${esc(rec.result.date)} ${esc(rec.result.time)}`:`${esc(rec.targetDate||'—')} ${esc(rec.targetTime||'')}`;return `<div class="tbRow"><div class="tbRowTop"><div><div class="tbRowTitle">№${Number(rec.targetDraw)||'—'} · ${when}</div><div class="tbScores">B1 ${bestScore(rec,'b1')} · B2 ${bestScore(rec,'b2')} · B3 ${bestScore(rec,'b3')} · ${rec.result?'ФАКТ':'FROZEN'}</div></div><div class="tbActions"><button class="tbOpen" data-tbopen="${id}" type="button">${opened?'Свернуть':'Открыть'}</button><button class="tbDel" data-tbdel="${id}" type="button">УДЛ</button></div></div>${opened?detailHtml(rec):''}</div>`}).join('')}</div>`;
  }

  function render(){
    const root=ensureRoot();if(!root||!window.ComboThreeBlocksEngine)return;
    const a=window.ComboThreeBlocksEngine.currentAnalysis();
    const rows=(window.ComboCloudHistory?.cached?.('three_blocks')||[]).slice().sort((x,y)=>Number(y.targetDraw||0)-Number(x.targetDraw||0));
    const st=window.ComboCloudHistory?.status?.('three_blocks');
    root.innerHTML=`<section class="tbCard"><button class="tbHead" id="tbMainToggle" type="button"><span><b>3 БЛОКА</b><small>Три независимых анализа · frozen до факта</small></span><span>${openMain?'▼':'▶'}</span></button>${openMain?`<div class="tbBody">${currentHtml(a)}</div>`:''}</section><section class="tbCard"><button class="tbHead" id="tbArchiveToggle" type="button"><span><b>АРХИВ 3 БЛОКОВ</b><small>Общий Supabase · Открыть / УДЛ</small></span><span>${openArchive?'▼':'▶'}</span></button>${openArchive?`<div class="tbBody"><div class="tbSync ${st?.error?'err':''}">${st?.error?'Облако: ошибка синхронизации':'Облако: синхронизировано'} · ${rows.length} запис.</div>${archiveHtml(rows)}</div>`:''}</section>`;
    document.getElementById('tbMainToggle').onclick=()=>{openMain=!openMain;render()};
    document.getElementById('tbArchiveToggle').onclick=()=>{openArchive=!openArchive;render()};
    root.querySelectorAll('[data-tbopen]').forEach(b=>b.onclick=()=>{const id=b.dataset.tbopen;openIds.has(id)?openIds.delete(id):openIds.add(id);render()});
    root.querySelectorAll('[data-tbdel]').forEach(b=>b.onclick=async()=>{const id=b.dataset.tbdel;b.disabled=true;const ok=await window.ComboCloudHistory?.remove?.('three_blocks',id);if(!ok){b.disabled=false;alert('Не удалось удалить запись из Supabase.');return}openIds.delete(id);render()});
  }

  async function refresh(){
    try{await window.ComboThreeBlocksEngine?.reconcile?.();await window.ComboCloudHistory?.refresh?.('three_blocks');}catch(e){console.error('3 BLOCKS refresh',e)}render();
  }
  async function tick(force=false){
    if(ticking||document.hidden)return;ticking=true;
    try{const a=window.ComboThreeBlocksEngine?.draws?.()||[],latest=Number(a.at(-1)?.draw||0);if(force||latest!==lastLatest){lastLatest=latest;await refresh();}}finally{ticking=false}
  }
  async function boot(){
    installCss();ensureRoot();render();window.ComboThreeBlocksUI={render,refresh};
    window.addEventListener('combo:three-blocks-cloud',render);window.addEventListener('focus',()=>tick(true));window.addEventListener('online',()=>tick(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick(true)});setInterval(()=>tick(false),12000);await tick(true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
