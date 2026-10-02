/* COMBO KENO · 3 БЛОКА + Supabase archive · UI v3 · 02.10.2026 */
(() => {
  'use strict';
  if(window.__comboThreeBlocksUIV3)return;
  window.__comboThreeBlocksUIV3=true;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const f2=n=>String(Number(n)).padStart(2,'0');
  const money=v=>`${Number(v||0).toLocaleString('ru-RU')} ₽`;
  let openIds=new Set(),showLegacy=false,ticking=false,lastLatest=0;

  function chips(list,cls='',hitNums=[]){
    const a=Array.isArray(list)?list:[];
    if(!a.length)return '<span class="tbNone">нет</span>';
    const hs=new Set((hitNums||[]).map(Number));
    return `<div class="tbChips">${a.map(n=>`<span class="tbChip ${cls} ${hs.has(Number(n))?'hit':''}">${f2(n)}</span>`).join('')}</div>`;
  }

  function installCss(){
    if(document.getElementById('comboThreeBlocksStylesV3'))return;
    const s=document.createElement('style');s.id='comboThreeBlocksStylesV3';s.textContent=`
      #comboThreeBlocksRoot{display:grid;gap:9px;margin:0}.tbPanel{border:1px solid #315b7d;border-radius:14px;background:linear-gradient(180deg,#0d2940,#071725);overflow:hidden}.tbPanelHead{padding:11px 12px;background:#102a43}.tbPanelHead b{font-size:17px}.tbPanelHead small{display:block;margin-top:2px;color:#9eb0c1;font-size:10px;line-height:1.3}.tbBody{padding:9px;display:grid;gap:8px}
      .tbTarget{padding:9px;border:1px solid #294b66;border-radius:10px;background:#081827;font-size:11px;line-height:1.45;color:#c7d7e6}.tbTarget b{color:#fff}.tbBlocks{display:grid;grid-template-columns:1fr;gap:8px}.tbBlock{padding:10px;border:1px solid #294b66;border-radius:11px;background:#081827}.tbBlock.good{border-color:#4f7f43}.tbBlock.hot{border-color:#8f6d23}.tbBlockTop{display:flex;align-items:center;justify-content:space-between;gap:7px}.tbBlockTitle{font-size:14px;font-weight:950}.tbBadge{padding:3px 7px;border:1px solid #3d6686;border-radius:7px;font-size:9px;font-weight:950;color:#a9d7f7;white-space:nowrap}.tbBadge.good{border-color:#4f8a45;color:#9cff78}.tbBadge.hot{border-color:#9a7624;color:#ffd65b}.tbPurpose{margin-top:5px;color:#9fb2c4;font-size:10px;line-height:1.4}.tbMetric{margin-top:7px;padding:7px;border:1px solid #203d55;border-radius:8px;background:#071725;font-size:10px;line-height:1.45}.tbMetric b{color:#fff}.tbLabel{margin-top:7px;font-size:9px;font-weight:950;color:#c5d5e4}.tbChips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.tbChip{padding:4px 6px;border:1px solid #315b7d;border-radius:6px;background:#0a2135;color:#d4e8f7;font-size:11px;font-weight:950}.tbChip.max{border-color:#b8653c;background:#412118;color:#ffd2a3}.tbChip.strong{border-color:#9a7624;background:#352510;color:#ffe08a}.tbChip.watch{border-color:#315b7d;background:#0a2135;color:#b9dfff}.tbChip.hit{border-color:#72d35b!important;background:linear-gradient(180deg,#4a9e26,#236d22)!important;color:#fff!important;box-shadow:0 0 0 1px rgba(150,255,130,.22) inset}.tbNone{display:inline-block;margin-top:4px;color:#71879a;font-size:10px}.tbNoBet{margin-top:7px;padding:7px 8px;border:1px dashed #315677;border-radius:8px;color:#9fb2c4;font-size:10px;line-height:1.4}.tbComboNow{margin-top:7px;padding:7px;border:1px solid #294b66;border-radius:9px;background:#071725}.tbComboName{font-size:10px;font-weight:950}
      .tbCompareNote{padding:8px 9px;border:1px solid #294b66;border-radius:9px;background:#071725;color:#aebfce;font-size:10px;line-height:1.45}.tbArchiveStats{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.tbStat{padding:8px;border:1px solid #294b66;border-radius:9px;background:#081827}.tbStat b{display:block;font-size:15px;color:#fff}.tbStat span{font-size:9px;color:#9eb0c1}.tbStat.money b{color:#ffd65b}.tbArchiveList{display:grid;gap:8px}.tbRow{border:1px solid #294b66;border-radius:11px;background:#081827;overflow:hidden}.tbRowHead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;padding:9px}.tbRowTitle{font-size:12px;font-weight:950}.tbRowSub{margin-top:2px;font-size:9px;color:#9fb2c4}.tbActions{display:flex;gap:4px}.tbOpen,.tbDel{padding:6px 7px;border-radius:8px;font-size:9px}.tbOpen{background:#0a2135}.tbDel{background:#281520;border-color:#6d3343;color:#ffd2d7}.tbSignalRows{border-top:1px solid #203c54;padding:7px 9px;display:grid;gap:4px}.tbSignalRow{display:grid;grid-template-columns:78px 1fr auto;gap:5px;align-items:center;font-size:10px}.tbSignalRow b{font-size:10px}.tbState{color:#9eb0c1}.tbState.hit{color:#9cff78;font-weight:950}.tbState.miss{color:#ff9f9f;font-weight:950}.tbMiniCombos{border-top:1px solid #203c54;padding:7px 9px;display:grid;gap:6px}.tbComboResult{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:6px;align-items:center}.tbComboResult .name{font-size:10px;font-weight:950;color:#fff}.tbComboResult .score{text-align:right;font-size:10px;font-weight:950;color:#b9c9d8;white-space:nowrap}.tbComboResult.win .score{color:#ffd65b}.tbPrize{display:inline-block;margin-left:4px;color:#ffd65b}.tbDetail{border-top:1px solid #203c54;padding:8px;display:grid;gap:7px}.tbDetailBox{padding:8px;border:1px solid #294b66;border-radius:9px;background:#071725}.tbDetailTitle{font-size:10px;font-weight:950}.tbDetailText{margin-top:4px;font-size:10px;color:#b8c9d8;line-height:1.45}.tbFactNums{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px;margin-top:6px}.tbFactNum{text-align:center;padding:3px 0;border-radius:5px;background:#0a1c2d;font-size:9px}.tbFactNum.hit{background:#236d22;color:#fff;font-weight:950}.tbCloud{font-size:9px;color:#7fd8ff}.tbCloud.err{color:#ff9f9f}.tbEmpty{padding:10px;border:1px dashed #315677;border-radius:9px;color:#9fb2c4;font-size:10px;line-height:1.4}.tbLegacyBar{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:7px 8px;border:1px solid #294b66;border-radius:9px;background:#071725;color:#9fb2c4;font-size:9px}.tbLegacyBar button{padding:5px 7px;font-size:9px}.tbLegacyList{display:grid;gap:5px}.tbLegacyRow{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:7px;border:1px solid #294b66;border-radius:8px;background:#071725;font-size:9px;color:#9fb2c4}
      @media(min-width:560px){.tbBlocks{grid-template-columns:repeat(3,minmax(0,1fr))}.tbArchiveStats{grid-template-columns:repeat(4,1fr)}}@media(max-width:380px){.tbChip{padding:4px 5px;font-size:10px}.tbSignalRow{grid-template-columns:69px 1fr auto}.tbComboResult{grid-template-columns:30px minmax(0,1fr) auto}}
    `;document.head.appendChild(s);
  }

  function ensureRoot(){
    let root=document.getElementById('comboThreeBlocksRoot');if(root)return root;
    const host=document.getElementById('threeBlocksDrawerBody')||document.querySelector('.app');if(!host)return null;
    root=document.createElement('div');root.id='comboThreeBlocksRoot';host.appendChild(root);return root;
  }

  function comboNow(label,list,cls='strong'){
    if(!Array.isArray(list)||!list.length)return '';
    return `<div class="tbComboNow"><div class="tbComboName">${esc(label)}</div>${chips(list,cls)}</div>`;
  }

  function currentHtml(a){
    if(!a)return '<div class="tbEmpty">Жду загрузку архива КЕНО.</div>';
    const b1=a.blocks.b1,b2=a.blocks.b2,b3=a.blocks.b3;
    const b1Badge=b1.level==='MAX'?'MAX':b1.level==='STRONG'?'STRONG':b1.level==='WATCH'?'WATCH':'ФОН';
    const b1Good=b1.signal;
    return `<div class="tbTarget"><b>ПРОГНОЗ НА №${a.target.draw} · ${esc(a.target.date||'—')} ${esc(a.target.time||'')}</b><br>Расчёт сделан после №${a.source.draw} · ${esc(a.source.date)} ${esc(a.source.time)} и заморожен до результата.</div>
      <div class="tbBlocks">
        <div class="tbBlock ${b1Good?'good':''}">
          <div class="tbBlockTop"><span class="tbBlockTitle">1. ВХОД K7</span><span class="tbBadge ${b1Good?'good':''}">${b1Badge}</span></div>
          <div class="tbPurpose">Отвечает только на вопрос: повышен ли сейчас шанс получить K7+ в следующем тираже.</div>
          <div class="tbMetric"><b>N∩N−2:</b> ${b1.interN2}<br><b>J3:</b> ${b1.j3}</div>
          <div class="tbLabel">Числа N∩N−2</div>${chips(b1.nN2,'watch')}
          <div class="tbLabel">Числа J3</div>${chips(b1.j3Numbers,'strong')}
          <div class="tbNoBet">Этот блок не выдаёт выдуманную K7. В архиве проверяется сам сигнал: получился ли по факту K7+.</div>
        </div>
        <div class="tbBlock ${b2.signal?'good':''}">
          <div class="tbBlockTop"><span class="tbBlockTitle">2. МОЩНОСТЬ K7</span><span class="tbBadge ${b2.signal?'good':''}">${b2.signal?'36+ СИГНАЛ':'ФОН'}</span></div>
          <div class="tbPurpose">Отвечает на другой вопрос: если узел формируется, есть ли усиление к 9+ общим числам, то есть к 36 и более K7 внутри узла.</div>
          <div class="tbMetric"><b>U2 = |N−1 ∪ N−2|:</b> ${b2.u2}<br><b>Порог:</b> ${b2.threshold}</div>
          <div class="tbNoBet">Точную семёрку этот блок не сочиняет. После факта архив покажет реальное пересечение K и число K7-узлов.</div>
        </div>
        <div class="tbBlock ${b3.flow==='HOT'?'hot':''}">
          <div class="tbBlockTop"><span class="tbBlockTitle">3. ПЕРЕХОДЫ</span><span class="tbBadge ${b3.flow==='HOT'?'hot':''}">${b3.flow}</span></div>
          <div class="tbPurpose">Это блок конкретных чисел. Комбы собираются только из STRONG/MAX. Слабые числа для количества не добавляются.</div>
          <div class="tbMetric"><b>Перешло:</b> ${b3.transitionCount}<br><b>Σ переходов:</b> ${b3.sumT}</div>
          <div class="tbLabel">MAX</div>${chips(b3.max,'max')}<div class="tbLabel">STRONG</div>${chips(b3.strong,'strong')}<div class="tbLabel">WATCH</div>${chips(b3.watch,'watch')}
          ${comboNow('K3',b3.k3)}${comboNow('K4',b3.k4)}${comboNow('K5',b3.k5)}${(!b3.k3?.length&&!b3.k4?.length&&!b3.k5?.length)?'<div class="tbNoBet">Сейчас STRONG/MAX меньше трёх — комба не сформирована.</div>':''}
        </div>
      </div>
      <div class="tbCompareNote">После выхода следующего тиража: Блок 1 получает HIT/MISS по факту K7+, Блок 2 — по факту 9+/36+, а каждая конкретная K3/K4/K5 Блока 3 получает свои зелёные попадания, счёт и сумму выигрыша.</div>`;
  }

  function stateText(signal,hit,positive='HIT'){
    if(!signal)return '<span class="tbState">сигнала не было</span>';
    return hit?`<span class="tbState hit">${positive}</span>`:'<span class="tbState miss">MISS</span>';
  }

  function comboResult(label,score){
    if(!score?.size)return '';
    const win=Number(score.prize)>0;
    return `<div class="tbComboResult ${win?'win':''}"><span class="name">${esc(label)}</span><div>${chips(score.numbers,'',score.hitNums)}</div><div class="score">${score.hits}/${score.size}${win?` <span class="tbPrize">🔥 ${money(score.prize)}</span>`:''}</div></div>`;
  }

  function archiveStats(rows){
    const b1=rows.filter(r=>r.result?.b1?.signal),b2=rows.filter(r=>r.result?.b2?.signal);
    const b1h=b1.filter(r=>r.result.b1.hit).length,b2h=b2.filter(r=>r.result.b2.hit).length;
    let combos=0,wins=0,total=0;
    for(const r of rows){for(const k of ['k3','k4','k5']){const x=r.result?.b3?.[k];if(x?.size){combos++;if(x.prize>0)wins++;total+=Number(x.prize||0)}}}
    return `<div class="tbArchiveStats"><div class="tbStat"><b>${rows.length}</b><span>закрыто тиражей</span></div><div class="tbStat"><b>${b1h}/${b1.length||0}</b><span>Вход K7 · сильные сигналы</span></div><div class="tbStat"><b>${b2h}/${b2.length||0}</b><span>Мощность · 36+ сигналы</span></div><div class="tbStat money"><b>${money(total)}</b><span>B3 · ${wins}/${combos} выигрышных комб</span></div></div>`;
  }

  function detailHtml(rec){
    const r=rec.result,b1=rec.blocks?.b1||{},b2=rec.blocks?.b2||{},b3=rec.blocks?.b3||{};
    const hitAll=new Set([...(r?.b3?.k3?.hitNums||[]),...(r?.b3?.k4?.hitNums||[]),...(r?.b3?.k5?.hitNums||[])]);
    return `<div class="tbDetail">
      <div class="tbDetailBox"><div class="tbDetailTitle">Блок 1 · что было до факта</div><div class="tbDetailText">Уровень: ${esc(b1.level||'NONE')} · N∩N−2=${Number(b1.interN2)||0} · J3=${Number(b1.j3)||0}.<br>J3: ${(b1.j3Numbers||[]).map(f2).join(' ')||'нет'}.</div></div>
      <div class="tbDetailBox"><div class="tbDetailTitle">Блок 2 · что было до факта</div><div class="tbDetailText">U2=${Number(b2.u2)||0} · ${b2.signal?'сигнал 36+ был':'сигнала 36+ не было'}.</div></div>
      <div class="tbDetailBox"><div class="tbDetailTitle">Блок 3 · что было до факта</div><div class="tbDetailText">Поток ${esc(b3.flow||'—')} · MAX: ${(b3.max||[]).map(f2).join(' ')||'нет'} · STRONG: ${(b3.strong||[]).map(f2).join(' ')||'нет'} · WATCH: ${(b3.watch||[]).map(f2).join(' ')||'нет'}.</div></div>
      <div class="tbDetailBox"><div class="tbDetailTitle">ФАКТ №${r.draw} · ${esc(r.date)} ${esc(r.time)} · K=${r.overlapK}</div><div class="tbFactNums">${(r.balls||[]).map(n=>`<span class="tbFactNum ${hitAll.has(Number(n))?'hit':''}">${f2(n)}</span>`).join('')}</div></div>
    </div>`;
  }

  function archiveRow(rec){
    const r=rec.result,id=esc(rec.id),opened=openIds.has(String(rec.id));
    return `<div class="tbRow">
      <div class="tbRowHead"><div><div class="tbRowTitle">№${r.draw} · ${esc(r.date)} ${esc(r.time)}</div><div class="tbRowSub">Прогноз был заморожен после №${rec.sourceDraw} · пересечение N→N+1: K=${r.overlapK} · K7-узлов: ${r.k7Nodes}</div></div><div class="tbActions"><button class="tbOpen" data-tbopen="${id}" type="button">${opened?'Свернуть':'Открыть'}</button><button class="tbDel" data-tbdel="${id}" type="button">УДЛ</button></div></div>
      <div class="tbSignalRows"><div class="tbSignalRow"><b>Вход K7</b><span>${esc(rec.blocks?.b1?.level||'NONE')} · факт K=${r.overlapK}</span>${stateText(r.b1.signal,r.b1.hit)}</div><div class="tbSignalRow"><b>Мощность</b><span>U2=${r.b2.u2} · факт ${r.overlapK>=9?'9+':'<9'} · узлов ${r.k7Nodes}</span>${stateText(r.b2.signal,r.b2.hit)}</div></div>
      <div class="tbMiniCombos">${comboResult('K3',r.b3?.k3)}${comboResult('K4',r.b3?.k4)}${comboResult('K5',r.b3?.k5)}${(!r.b3?.k3?.size&&!r.b3?.k4?.size&&!r.b3?.k5?.size)?'<div class="tbNone">Блок 3 в этом тираже комбу не формировал.</div>':''}</div>
      ${opened?detailHtml(rec):''}
    </div>`;
  }

  function legacyHtml(rows){
    if(!rows.length)return '';
    return `<div class="tbLegacyBar"><span>Старые тестовые записи до TB3: ${rows.length}. Они не входят в новую статистику.</span><button id="tbLegacyToggle" type="button">${showLegacy?'Скрыть':'Показать'}</button></div>${showLegacy?`<div class="tbLegacyList">${rows.map(r=>`<div class="tbLegacyRow"><span>№${Number(r.targetDraw)||'—'} · ${esc(r.algorithmVersion||'old')}</span><button class="tbDel" data-tbdel="${esc(r.id)}" type="button">УДЛ</button></div>`).join('')}</div>`:''}`;
  }

  function render(){
    const root=ensureRoot();if(!root||!window.ComboThreeBlocksEngine)return;
    const engine=window.ComboThreeBlocksEngine,a=engine.currentAnalysis();
    const all=window.ComboCloudHistory?.cached?.('three_blocks')||[];
    const completed=all.filter(r=>r.algorithmVersion===engine.VERSION&&r.result).sort((x,y)=>Number(y.targetDraw)-Number(x.targetDraw));
    const legacy=all.filter(r=>r.algorithmVersion!==engine.VERSION).sort((x,y)=>Number(y.targetDraw)-Number(x.targetDraw));
    const st=window.ComboCloudHistory?.status?.('three_blocks');
    root.innerHTML=`<section class="tbPanel"><div class="tbPanelHead"><b>3 БЛОКА · СЕЙЧАС</b><small>Три разных анализа. Никакого общего рейтинга чисел.</small></div><div class="tbBody">${currentHtml(a)}</div></section>
      <section class="tbPanel"><div class="tbPanelHead"><b>АРХИВ 3 БЛОКОВ</b><small>В архив попадает только уже закрытый факт. Попавшие числа зелёные; выигрышная комба отмечается огнём и суммой.</small></div><div class="tbBody"><div class="tbCloud ${st?.error?'err':''}">${st?.error?'Supabase: ошибка синхронизации':'Supabase: синхронизировано'}</div>${archiveStats(completed)}${completed.length?`<div class="tbArchiveList">${completed.map(archiveRow).join('')}</div>`:'<div class="tbEmpty">Закрытых записей новой версии пока нет. Текущий прогноз сохранён FROZEN и появится здесь после выхода факта.</div>'}${legacyHtml(legacy)}</div></section>`;

    root.querySelectorAll('[data-tbopen]').forEach(b=>b.onclick=()=>{const id=b.dataset.tbopen;openIds.has(id)?openIds.delete(id):openIds.add(id);render()});
    root.querySelectorAll('[data-tbdel]').forEach(b=>b.onclick=async()=>{const id=b.dataset.tbdel;b.disabled=true;b.textContent='…';const ok=await window.ComboCloudHistory?.remove?.('three_blocks',id);if(!ok){b.disabled=false;b.textContent='УДЛ';alert('Не удалось удалить запись из Supabase.');return}openIds.delete(id);render()});
    const lg=document.getElementById('tbLegacyToggle');if(lg)lg.onclick=()=>{showLegacy=!showLegacy;render()};
  }

  async function refresh(){
    try{await Promise.resolve(window.ComboCloudHistory?.ready);await window.ComboThreeBlocksEngine?.reconcile?.();await window.ComboCloudHistory?.refresh?.('three_blocks');}catch(e){console.error('3 BLOCKS refresh',e)}
    render();
  }

  async function tick(force=false){
    if(ticking||document.hidden)return;ticking=true;
    try{const a=window.ComboThreeBlocksEngine?.draws?.()||[],latest=Number(a.at(-1)?.draw||0);if(force||latest!==lastLatest){lastLatest=latest;await refresh()}}finally{ticking=false}
  }

  async function boot(){
    installCss();ensureRoot();render();await refresh();
    window.addEventListener('combo:three-blocks-cloud',render);
    window.addEventListener('focus',()=>tick(true));window.addEventListener('online',()=>tick(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick(true)});setInterval(()=>tick(false),12000);
  }

  window.ComboThreeBlocksUI={render,refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
