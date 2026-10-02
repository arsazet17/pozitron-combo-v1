/* COMBO KENO · 3 БЛОКА + облачный архив · UI v1.1 · 02.10.2026 */
(() => {
  'use strict';
  if(window.__comboThreeBlocksUIV11)return;
  window.__comboThreeBlocksUIV11=true;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const f2=n=>String(Number(n)).padStart(2,'0');
  const chips=(a,cls='')=>Array.isArray(a)&&a.length
    ? `<div class="tbChips">${a.map(n=>`<span class="tbChip ${cls}">${f2(n)}</span>`).join('')}</div>`
    : '<div class="tbEmptyLine">нет</div>';
  let openMain=true, openArchive=true, openIds=new Set(), ticking=false, lastLatest=0;

  function installCss(){
    if(document.getElementById('comboThreeBlocksStyles'))return;
    const s=document.createElement('style');s.id='comboThreeBlocksStyles';s.textContent=`
      #comboThreeBlocksRoot{margin:0;display:grid;gap:9px}
      #comboThreeBlocksRoot .tbCard{border:1px solid #315b7d;border-radius:14px;background:linear-gradient(180deg,#0d2940,#071725);overflow:hidden;box-shadow:0 9px 28px rgba(0,0,0,.18)}
      #comboThreeBlocksRoot .tbHead{width:100%;display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;border:0;border-radius:0;background:#102a43;padding:11px 12px;text-align:left}
      #comboThreeBlocksRoot .tbHead b{font-size:16px}#comboThreeBlocksRoot .tbHead small{display:block;color:#9eb0c1;font-size:9px;margin-top:2px;line-height:1.25}
      #comboThreeBlocksRoot .tbBody{padding:9px;display:grid;gap:8px}.tbTarget{padding:9px;border:1px solid #294b66;border-radius:10px;background:#081827;font-size:11px;color:#c7d7e6;line-height:1.45}.tbTarget b{color:#fff}.tbSourceNums{margin-top:6px}
      #comboThreeBlocksRoot .tbBlocks{display:grid;grid-template-columns:1fr;gap:7px}.tbBlock{padding:9px;border:1px solid #294b66;border-radius:11px;background:#081827}.tbBlock.signal{border-color:#56722b}.tbBlock.hot{border-color:#7b5a17;background:linear-gradient(180deg,#1e2112,#081827)}
      .tbBlockTop{display:flex;align-items:center;justify-content:space-between;gap:8px}.tbBlockTitle{font-size:13px;font-weight:950;color:#fff}.tbBadge{font-size:10px;font-weight:950;padding:3px 6px;border:1px solid #3d6686;border-radius:7px;color:#9fdcff;white-space:nowrap}.tbBadge.on{color:#9cff78;border-color:#4f8a45}.tbBadge.hot{color:#ffd65b;border-color:#9a7624}.tbMeta{font-size:10px;color:#9fb2c4;line-height:1.35;margin-top:4px}.tbLabel{font-size:9px;color:#c5d5e4;font-weight:900;margin-top:7px}.tbMainLabel{font-size:10px;color:#fff;font-weight:950;margin-top:8px}.tbChips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.tbChip{padding:4px 6px;border-radius:6px;background:#173b1d;border:1px solid #4f8a45;color:#dfffd4;font-size:11px;font-weight:950}.tbChip.strong{background:#352510;border-color:#9a7624;color:#ffe08a}.tbChip.max{background:#412118;border-color:#b8653c;color:#ffd2a3}.tbChip.watch{background:#0a2135;border-color:#315b7d;color:#b9dfff}.tbChip.source{background:#102a43;border-color:#315b7d;color:#e7f3fc}.tbEmptyLine{font-size:10px;color:#75899b;margin-top:3px}.tbNote{font-size:9.5px;color:#91a6b8;line-height:1.35;margin-top:5px}
      .tbArchiveList{display:grid;gap:7px}.tbRow{border:1px solid #294b66;border-radius:10px;background:#081827;overflow:hidden}.tbRowTop{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;padding:8px}.tbRowInfo{min-width:0}.tbRowTitle{font-size:11px;font-weight:950;color:#fff}.tbScores{font-size:9px;color:#b8c9d8;margin-top:3px;line-height:1.35}.tbActions{display:flex;gap:5px}.tbOpen,.tbDel{padding:7px;border-radius:8px;font-size:9px;white-space:nowrap}.tbOpen{background:#0a2135}.tbDel{background:#281520;border-color:#6d3343;color:#ffd2d7}.tbDetail{border-top:1px solid #203c54;padding:8px;display:grid;gap:7px}.tbFact,.tbDetailBlock{padding:7px;border:1px solid #294b66;border-radius:9px;background:#071725}.tbFactTitle{font-size:10px;font-weight:950;color:#fff}.tbFactNums{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px;margin-top:5px}.tbFactNum{text-align:center;font-size:9px;padding:3px 0;border-radius:5px;background:#0a1c2d;color:#d8e4ee}.tbScoreLine{font-size:10px;color:#c6d6e4;line-height:1.45}.tbHit{color:#9cff78;font-weight:950}.tbMiss{color:#ffb6b6;font-weight:950}.tbEmpty{padding:10px;border:1px dashed #315677;border-radius:9px;color:#9fb2c4;font-size:10px;line-height:1.4}.tbSync{font-size:9px;color:#7fd8ff;font-weight:800}
      @media(min-width:560px){#comboThreeBlocksRoot .tbBlocks{grid-template-columns:repeat(3,minmax(0,1fr))}.tbBlock{min-width:0}}
      @media(max-width:380px){#comboThreeBlocksRoot .tbHead{padding:10px}.tbActions{gap:3px}.tbOpen,.tbDel{padding:6px 5px;font-size:8.5px}.tbChip{font-size:10px;padding:4px 5px}}
    `;document.head.appendChild(s);
  }

  function ensureRoot(){
    let root=document.getElementById('comboThreeBlocksRoot');
    if(root)return root;
    const host=document.getElementById('threeBlocksDrawerBody')||document.querySelector('.app');
    if(!host)return null;
    root=document.createElement('div');root.id='comboThreeBlocksRoot';host.appendChild(root);return root;
  }

  function currentHtml(a){
    if(!a)return '<div class="tbEmpty">Жду загрузку архива КЕНО. Как только база загрузится, здесь появятся конкретные числа B1, B2 и B3.</div>';
    const b1=a.blocks.b1,b2=a.blocks.b2,b3=a.blocks.b3;
    const target=`№${a.target.draw}${a.target.date||a.target.time?` · ${esc(a.target.date||'—')} ${esc(a.target.time||'')}`:''}`;
    return `<div class="tbTarget"><b>ПРОГНОЗ НА ${target}</b><br>Сформирован после №${a.source.draw} · ${esc(a.source.date)} ${esc(a.source.time)} · FROZEN до результата.<div class="tbSourceNums"><div class="tbLabel">20 чисел источника</div>${chips(a.source.balls,'source')}</div></div>
      <div class="tbBlocks">
        <div class="tbBlock ${b1.signal?'signal':''}">
          <div class="tbBlockTop"><span class="tbBlockTitle">B1 · ВХОД K7</span><span class="tbBadge ${b1.signal?'on':''}">${b1.signal?'СИГНАЛ':'ФОН'} · ${b1.level}</span></div>
          <div class="tbMeta">N∩N−2=${a.metrics.interN2} · J3=${a.metrics.j3}</div>
          <div class="tbMainLabel">Прогноз K7</div>${chips(b1.k7)}
          <div class="tbLabel">Строгие кандидаты D≥9 вне N−1</div>${chips(b1.strictCandidates,'strong')}
          <div class="tbNote">Числа K7 сохраняются каждый тираж. Метка СИГНАЛ показывает, когда режим B1 усилен.</div>
        </div>
        <div class="tbBlock ${b2.signal?'signal':''}">
          <div class="tbBlockTop"><span class="tbBlockTitle">B2 · МОЩНОСТЬ K7</span><span class="tbBadge ${b2.signal?'on':''}">${b2.signal?'36+ СИГНАЛ':'ФОН'} · U2=${b2.u2}</span></div>
          <div class="tbMainLabel">Прогноз K7</div>${chips(b2.k7)}
          <div class="tbLabel">K3</div>${chips(b2.k3)}<div class="tbLabel">K4</div>${chips(b2.k4)}
          <div class="tbLabel">Ядро 9</div>${chips(b2.core9,'watch')}
          <div class="tbNote">U2≥38 усиливает режим. Конкретные числа считаются и сохраняются на каждом тираже.</div>
        </div>
        <div class="tbBlock ${b3.flow==='HOT'?'hot':''}">
          <div class="tbBlockTop"><span class="tbBlockTitle">B3 · ПЕРЕХОДЫ</span><span class="tbBadge ${b3.flow==='HOT'?'hot':''}">${b3.flow}</span></div>
          <div class="tbMeta">Переходов ${b3.transitionCount} · ΣT=${b3.sumT}</div>
          <div class="tbMainLabel">Прогноз K3</div>${chips(b3.k3)}<div class="tbLabel">K4</div>${chips(b3.k4)}<div class="tbLabel">K5</div>${chips(b3.k5)}
          <div class="tbLabel">MAX</div>${chips(b3.max,'max')}<div class="tbLabel">STRONG</div>${chips(b3.strong,'strong')}<div class="tbLabel">WATCH</div>${chips(b3.watch,'watch')}
          <div class="tbNote">MAX/STRONG — усиленные кандидаты; K3/K4/K5 frozen сохраняются каждый тираж для сравнения блока.</div>
        </div>
      </div>`;
  }

  function bestScore(rec,block){
    const r=rec?.result?.blocks?.[block];if(!r)return 'ожид.';
    const order=block==='b1'?['k7']:block==='b2'?['k7','k4','k3','core9']:['k3','k4','k5'];
    for(const k of order){const x=r[k];if(x?.size)return `${x.hits}/${x.size}`}
    return 'стар.';
  }
  function scoreLine(label,x){
    if(!x?.size)return `<div class="tbScoreLine">${esc(label)}: старый прогноз без набора</div>`;
    const cls=x.hits>0?'tbHit':'tbMiss';
    return `<div class="tbScoreLine">${esc(label)}: <span class="${cls}">${x.hits}/${x.size}</span>${x.hitNums?.length?` · попали ${x.hitNums.map(f2).join(' ')}`:''}</div>`;
  }

  function detailHtml(rec){
    const r=rec.result,b1=rec.blocks?.b1||{},b2=rec.blocks?.b2||{},b3=rec.blocks?.b3||{};
    return `<div class="tbDetail">
      <div class="tbDetailBlock"><div class="tbFactTitle">B1 · что было сказано ДО тиража</div><div class="tbLabel">K7</div>${chips(b1.k7)}${r?scoreLine('K7',r.blocks?.b1?.k7):'<div class="tbNote">Факт ещё не вышел.</div>'}</div>
      <div class="tbDetailBlock"><div class="tbFactTitle">B2 · что было сказано ДО тиража</div><div class="tbLabel">K7</div>${chips(b2.k7)}<div class="tbLabel">K3 / K4</div>${chips(b2.k3)}${chips(b2.k4)}<div class="tbLabel">Ядро 9</div>${chips(b2.core9,'watch')}${r?scoreLine('K7',r.blocks?.b2?.k7)+scoreLine('K4',r.blocks?.b2?.k4)+scoreLine('K3',r.blocks?.b2?.k3)+scoreLine('Ядро 9',r.blocks?.b2?.core9):'<div class="tbNote">Факт ещё не вышел.</div>'}</div>
      <div class="tbDetailBlock"><div class="tbFactTitle">B3 · что было сказано ДО тиража</div><div class="tbLabel">K3 / K4 / K5</div>${chips(b3.k3)}${chips(b3.k4)}${chips(b3.k5)}<div class="tbLabel">MAX / STRONG / WATCH</div>${chips(b3.max,'max')}${chips(b3.strong,'strong')}${chips(b3.watch,'watch')}${r?scoreLine('K3',r.blocks?.b3?.k3)+scoreLine('K4',r.blocks?.b3?.k4)+scoreLine('K5',r.blocks?.b3?.k5):'<div class="tbNote">Факт ещё не вышел.</div>'}</div>
      ${r?`<div class="tbFact"><div class="tbFactTitle">ФАКТ №${r.draw} · ${esc(r.date)} ${esc(r.time)} · столб ${r.column??'—'}</div><div class="tbFactNums">${(r.balls||[]).map(n=>`<span class="tbFactNum">${f2(n)}</span>`).join('')}</div></div>`:`<div class="tbFact"><div class="tbFactTitle">ФАКТ ожидается: №${rec.targetDraw} · ${esc(rec.targetDate||'—')} ${esc(rec.targetTime||'')}</div></div>`}
    </div>`;
  }

  function archiveHtml(rows){
    if(!rows.length)return '<div class="tbEmpty">Архив пока пуст. Текущий FROZEN сейчас будет записан в Supabase.</div>';
    return `<div class="tbArchiveList">${rows.map(rec=>{
      const id=esc(rec.id), opened=openIds.has(String(rec.id));
      const when=rec.result?`${esc(rec.result.date)} ${esc(rec.result.time)}`:`${esc(rec.targetDate||'—')} ${esc(rec.targetTime||'')}`;
      return `<div class="tbRow" data-tbid="${id}"><div class="tbRowTop"><div class="tbRowInfo"><div class="tbRowTitle">№${Number(rec.targetDraw)||'—'} · ${when}</div><div class="tbScores">B1 ${bestScore(rec,'b1')} · B2 ${bestScore(rec,'b2')} · B3 ${bestScore(rec,'b3')} · ${rec.result?'ФАКТ':'FROZEN'}</div></div><div class="tbActions"><button class="tbOpen" data-tbopen="${id}" type="button">${opened?'Свернуть':'Открыть'} ›</button><button class="tbDel" data-tbdel="${id}" type="button">УДЛ</button></div></div>${opened?detailHtml(rec):''}</div>`;
    }).join('')}</div>`;
  }

  function render(){
    const root=ensureRoot();if(!root)return;
    const a=window.ComboThreeBlocksEngine?.currentAnalysis?.()||null;
    const rows=(window.ComboCloudHistory?.cached?.('three_blocks')||[]).slice().sort((x,y)=>Number(y.targetDraw||0)-Number(x.targetDraw||0));
    const st=window.ComboCloudHistory?.status?.('three_blocks');
    root.innerHTML=`
      <section class="tbCard"><button class="tbHead" id="tbMainToggle" type="button"><span><b>ТЕКУЩИЙ ПРОГНОЗ · 3 БЛОКА</b><small>В каждом блоке конкретные числа на следующий тираж</small></span><span>${openMain?'▼':'▶'}</span></button>${openMain?`<div class="tbBody">${currentHtml(a)}</div>`:''}</section>
      <section class="tbCard"><button class="tbHead" id="tbArchiveToggle" type="button"><span><b>АРХИВ 3 БЛОКОВ</b><small>Что было сказано ДО факта · Supabase · Открыть / УДЛ</small></span><span>${openArchive?'▼':'▶'}</span></button>${openArchive?`<div class="tbBody"><div class="tbSync">${st?.error?'Облако: ошибка синхронизации':`Облако: синхронизировано · ${rows.length} запис.`}</div>${archiveHtml(rows)}</div>`:''}</section>`;
    const m=document.getElementById('tbMainToggle'), ar=document.getElementById('tbArchiveToggle');
    if(m)m.onclick=()=>{openMain=!openMain;render()};
    if(ar)ar.onclick=()=>{openArchive=!openArchive;render()};
    root.querySelectorAll('[data-tbopen]').forEach(b=>b.onclick=()=>{const id=b.dataset.tbopen;openIds.has(id)?openIds.delete(id):openIds.add(id);render()});
    root.querySelectorAll('[data-tbdel]').forEach(b=>b.onclick=async()=>{const id=b.dataset.tbdel;b.disabled=true;b.textContent='…';const ok=await window.ComboCloudHistory?.remove?.('three_blocks',id);if(!ok){b.disabled=false;b.textContent='УДЛ';alert('Не удалось удалить запись из Supabase. Повторите при интернете.');return;}openIds.delete(id);render()});
  }

  async function refresh(){
    try{
      await Promise.resolve(window.ComboCloudHistory?.ready);
      await window.ComboThreeBlocksEngine?.reconcile?.();
      await window.ComboCloudHistory?.refresh?.('three_blocks');
    }catch(e){console.error('COMBO 3 BLOCKS refresh',e)}
    render();
  }

  async function tick(force=false){
    if(ticking||document.hidden)return;ticking=true;
    try{
      const a=window.ComboThreeBlocksEngine?.draws?.()||[];
      const latest=Number(a.at(-1)?.draw||0);
      if(force||latest!==lastLatest){lastLatest=latest;await refresh();}
      else render();
    }finally{ticking=false}
  }

  async function boot(){
    installCss();ensureRoot();render();
    window.ComboThreeBlocksUI={render,refresh};
    window.addEventListener('combo:three-blocks-cloud',render);
    window.addEventListener('focus',()=>tick(true));window.addEventListener('online',()=>tick(true));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick(true)});
    setInterval(()=>tick(false),3000);
    await tick(true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
