/* COMBO KENO · 3 БЛОКА · clarity patch v1 · 02.10.2026
   Если сигнала/комбы нет, экран обязан прямо сказать ПРОПУСК, а не выглядеть пустым.
*/
(() => {
  'use strict';
  if (window.__comboThreeBlocksClarityV1) return;
  window.__comboThreeBlocksClarityV1 = true;

  function css(){
    if(document.getElementById('comboThreeBlocksClarityStylesV1')) return;
    const s=document.createElement('style');
    s.id='comboThreeBlocksClarityStylesV1';
    s.textContent=`
      .tbDecision{padding:10px 11px;border:1px solid #315b7d;border-radius:11px;background:#071725;display:grid;gap:5px}
      .tbDecision.skip{border-color:#6d5360;background:linear-gradient(180deg,#241821,#10151d)}
      .tbDecision.wait{border-color:#8f6d23;background:linear-gradient(180deg,#2b2412,#101a20)}
      .tbDecision.go{border-color:#4f8a45;background:linear-gradient(180deg,#17351e,#0b1d19)}
      .tbDecisionTitle{font-size:15px;font-weight:950;color:#fff}
      .tbDecision.skip .tbDecisionTitle{color:#ffb7bd}.tbDecision.wait .tbDecisionTitle{color:#ffd65b}.tbDecision.go .tbDecisionTitle{color:#9cff78}
      .tbDecisionRows{display:grid;gap:3px;font-size:10px;line-height:1.35;color:#bed0df}.tbDecisionRows b{color:#fff}
      .tbDecisionNote{font-size:10px;line-height:1.4;color:#9fb2c4}
      .tbBlockVerdict{margin-top:7px;padding:7px 8px;border-radius:8px;border:1px solid #294b66;background:#0a1c2d;font-size:10px;font-weight:900;color:#c8d7e4}
      .tbBlockVerdict.no{border-color:#654a55;color:#ffb7bd}.tbBlockVerdict.yes{border-color:#4f8a45;color:#9cff78}.tbBlockVerdict.wait{border-color:#8f6d23;color:#ffd65b}
      .tbArchiveDecision{margin-top:5px;display:inline-block;padding:3px 6px;border-radius:6px;border:1px solid #4a5966;background:#0a1c2d;font-size:9px;font-weight:950;color:#c7d7e6}
      .tbArchiveDecision.skip{border-color:#654a55;color:#ffb7bd}.tbArchiveDecision.wait{border-color:#8f6d23;color:#ffd65b}.tbArchiveDecision.go{border-color:#4f8a45;color:#9cff78}
    `;
    document.head.appendChild(s);
  }

  function decision(a){
    const b1=a?.blocks?.b1||{}, b2=a?.blocks?.b2||{}, b3=a?.blocks?.b3||{};
    const names=[];
    if(Array.isArray(b3.k3)&&b3.k3.length) names.push('K3');
    if(Array.isArray(b3.k4)&&b3.k4.length) names.push('K4');
    if(Array.isArray(b3.k5)&&b3.k5.length) names.push('K5');
    const concrete=names.length>0;
    const strongCount=(b3.max?.length||0)+(b3.strong?.length||0);
    const anySignal=Boolean(b1.signal||b2.signal||b3.flow==='HOT'||strongCount);
    if(concrete) return {kind:'go',title:'КОМБА СФОРМИРОВАНА',note:`Есть конкретные ${names.join(' / ')}. После факта они будут отдельно проверены и посчитаны.`};
    if(anySignal) return {kind:'wait',title:'СИГНАЛ ЕСТЬ, НО КОМБЫ НЕТ',note:'Числа для количества не добиваются. Этот тираж сохраняется как сигнал без конкретной комбы.'};
    return {kind:'skip',title:'ПРОПУСК — СИГНАЛА НЕТ',note:'Это нормальный результат расчёта: приложение ничего не выдумывает и не создаёт пустую ставку.'};
  }

  function current(){
    try{return window.ComboThreeBlocksEngine?.currentAnalysis?.()||null}catch(_){return null}
  }

  function patchCurrent(){
    const root=document.getElementById('comboThreeBlocksRoot');
    if(!root) return;
    const panel=root.querySelector('.tbPanel');
    const body=panel?.querySelector('.tbBody');
    const target=body?.querySelector('.tbTarget');
    const blocks=body?.querySelectorAll('.tbBlock');
    const a=current();
    if(!body||!target||!a||!blocks?.length) return;
    const b1=a.blocks.b1,b2=a.blocks.b2,b3=a.blocks.b3,d=decision(a);

    let box=body.querySelector('#tbCurrentDecision');
    if(!box){box=document.createElement('div');box.id='tbCurrentDecision';target.insertAdjacentElement('afterend',box)}
    box.className=`tbDecision ${d.kind}`;
    const b1txt=b1.signal?`${b1.level}: есть сигнал K7+`:'нет сильного сигнала K7+';
    const b2txt=b2.signal?`есть сигнал мощности 36+ (U2=${b2.u2})`:`нет сигнала мощности 36+ (U2=${b2.u2}/${b2.threshold})`;
    const nStrong=(b3.max?.length||0)+(b3.strong?.length||0);
    const b3txt=(b3.k3?.length||b3.k4?.length||b3.k5?.length)?'есть конкретная комба':`сильных чисел ${nStrong}; K3/K4/K5 не сформированы`;
    box.innerHTML=`<div class="tbDecisionTitle">ВЫВОД: ${d.title}</div><div class="tbDecisionRows"><div><b>1.</b> ${b1txt}</div><div><b>2.</b> ${b2txt}</div><div><b>3.</b> ${b3txt}</div></div><div class="tbDecisionNote">${d.note}</div>`;

    const badges=[...body.querySelectorAll('.tbBlock .tbBadge')];
    if(!b1.signal&&badges[0]) badges[0].textContent='НЕТ СИГНАЛА';
    if(!b2.signal&&badges[1]) badges[1].textContent='НЕТ СИГНАЛА';

    const verdicts=[
      {el:blocks[0],cls:b1.signal?'yes':'no',text:b1.signal?`ИТОГ БЛОКА: ${b1.level} · сигнал K7+ есть`:'ИТОГ БЛОКА: сигнала K7+ нет'},
      {el:blocks[1],cls:b2.signal?'yes':'no',text:b2.signal?'ИТОГ БЛОКА: есть усиление к 9+/36+':'ИТОГ БЛОКА: мощности 9+/36+ нет'},
      {el:blocks[2],cls:(b3.k3?.length||b3.k4?.length||b3.k5?.length)?'yes':(nStrong?'wait':'no'),text:(b3.k3?.length||b3.k4?.length||b3.k5?.length)?'ИТОГ БЛОКА: конкретная комба сформирована':(nStrong?'ИТОГ БЛОКА: сильные числа есть, но их меньше 3 — комбы нет':'ИТОГ БЛОКА: сильных чисел нет — комбы нет')}
    ];
    verdicts.forEach((v,i)=>{let e=v.el.querySelector(`[data-tbverdict="${i}"]`);if(!e){e=document.createElement('div');e.dataset.tbverdict=String(i);v.el.appendChild(e)}e.className=`tbBlockVerdict ${v.cls}`;e.textContent=v.text});
  }

  function recDecision(rec){
    const b1=rec?.blocks?.b1||{},b2=rec?.blocks?.b2||{},b3=rec?.blocks?.b3||{};
    const concrete=Boolean(b3.k3?.length||b3.k4?.length||b3.k5?.length);
    if(concrete)return {kind:'go',text:'КОМБА БЫЛА СФОРМИРОВАНА'};
    if(b1.signal||b2.signal)return {kind:'wait',text:'СИГНАЛ БЫЛ, НО БЕЗ КОМБЫ'};
    return {kind:'skip',text:'ПРОПУСК · СИГНАЛОВ НЕ БЫЛО'};
  }

  function patchArchive(){
    const root=document.getElementById('comboThreeBlocksRoot');if(!root)return;
    const recs=window.ComboCloudHistory?.cached?.('three_blocks')||[];
    const map=new Map(recs.map(r=>[String(r.id),r]));
    root.querySelectorAll('.tbRow').forEach(row=>{
      const btn=row.querySelector('[data-tbopen]');const rec=map.get(String(btn?.dataset?.tbopen||''));if(!rec)return;
      const sub=row.querySelector('.tbRowSub');if(!sub)return;
      const d=recDecision(rec);
      let e=row.querySelector('.tbArchiveDecision');if(!e){e=document.createElement('div');e.className='tbArchiveDecision';sub.insertAdjacentElement('afterend',e)}
      e.className=`tbArchiveDecision ${d.kind}`;e.textContent=d.text;
      const empty=row.querySelector('.tbMiniCombos .tbNone');
      if(empty&&!rec.blocks?.b3?.k3?.length&&!rec.blocks?.b3?.k4?.length&&!rec.blocks?.b3?.k5?.length)empty.textContent='ПРОПУСК ПО БЛОКУ 3: конкретная K3/K4/K5 не формировалась.';
    });
  }

  let scheduled=false;
  function apply(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;css();patchCurrent();patchArchive()})}
  const mo=new MutationObserver(apply);
  function boot(){css();apply();mo.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('combo:three-blocks-cloud',apply);window.addEventListener('focus',apply);window.addEventListener('pageshow',apply)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
