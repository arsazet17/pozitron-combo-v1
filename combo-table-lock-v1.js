/* COMBO KENO · TABLE LOCK v1
   🔒 фиксирует текущее цветное состояние чисел в Таблице.
   Закреплённые числа переживают «Очистить», сохраняют цвет
   и подсвечиваются в показанных тиражах ниже.
*/
(() => {
  'use strict';
  if (window.__comboTableLockV1) return;
  window.__comboTableLockV1 = true;

  const STORAGE_KEY = 'comboKenoTablePinnedV1';
  const ALLOWED = new Set(['manual','c1','c2','c3','c4','c5','overlap']);
  let pinned = new Map();

  function loadPinned(){
    try{
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      pinned = new Map(
        (Array.isArray(raw) ? raw : [])
          .map(x => [Number(x?.n), String(x?.cls || 'manual')])
          .filter(([n, cls]) =>
            Number.isInteger(n) && n >= 1 && n <= 80 && ALLOWED.has(cls)
          )
      );
    }catch(e){
      pinned = new Map();
    }
  }

  function savePinned(){
    try{
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...pinned.entries()].map(([n, cls]) => ({n, cls})))
      );
    }catch(e){}
  }

  function baseClass(meta){
    if(!meta) return '';
    const raw = String(
      meta.pinnedClass ||
      meta.manualColor ||
      (meta.colors?.length > 1 ? 'overlap' : meta.colors?.[0]) ||
      (meta.manual ? 'manual' : '')
    );
    return raw.split(/\s+/).find(x => ALLOWED.has(x)) || '';
  }

  function pinnedMeta(cls){
    const base = ALLOWED.has(cls) ? cls : 'manual';
    return {
      manual: true,
      manualColor: `${base} pinned`,
      colors: [],
      pinned: true,
      pinnedClass: base
    };
  }

  function currentSnapshot(){
    const recent = typeof getRecentVisibleDraws === 'function'
      ? getRecentVisibleDraws()
      : [];
    const map = new Map();

    for(const n of tableManualSelected){
      map.set(Number(n), {
        manual: true,
        manualColor: tableManualColors[n] || '',
        colors: []
      });
    }

    recent.forEach((d, idx) => {
      if(!tableActiveDrawIds.includes(d.draw)) return;
      const cls = TABLE_DRAW_COLORS[idx % TABLE_DRAW_COLORS.length];
      for(const raw of (d.balls || [])){
        const n = Number(raw);
        if(!map.has(n)){
          map.set(n, {manual:false, manualColor:'', colors:[]});
        }
        map.get(n).colors.push(cls);
      }
    });

    const snap = new Map();
    for(const [n, meta] of map){
      let cls = '';
      try{ cls = baseClass(meta) || tableClassForNumber(meta); }catch(e){}
      cls = String(cls).split(/\s+/).find(x => ALLOWED.has(x)) || 'manual';
      snap.set(Number(n), cls);
    }
    return snap;
  }

  function syncLockButton(){
    const b = document.getElementById('tableLockBtn');
    if(!b) return;
    const on = pinned.size > 0;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.title = on
      ? `Закреплено ${pinned.size} чисел · нажмите, чтобы снять`
      : 'Закрепить текущие цветные числа';
  }

  function togglePinned(){
    if(pinned.size){
      pinned.clear();
      savePinned();
      syncLockButton();
      renderTableDrawer();
      return;
    }

    const snap = currentSnapshot();
    if(!snap.size){
      alert('Сначала выберите цветные числа для закрепления.');
      return;
    }

    pinned = snap;
    savePinned();
    syncLockButton();
    renderTableDrawer();
  }

  function bindLockButton(){
    const b = document.getElementById('tableLockBtn');
    if(!b || b.dataset.lockBound === '1') return;
    b.dataset.lockBound = '1';
    b.onclick = togglePinned;
  }

  function installWrappers(){
    if(typeof getTableEffectiveSelected === 'function' &&
       !getTableEffectiveSelected.__tableLockV1){
      const original = getTableEffectiveSelected;
      const wrapped = function(){
        const set = new Set(original());
        for(const n of pinned.keys()) set.add(Number(n));
        return [...set].sort((a,b)=>a-b);
      };
      wrapped.__tableLockV1 = true;
      getTableEffectiveSelected = wrapped;
    }

    if(typeof getTableNumberMap === 'function' &&
       !getTableNumberMap.__tableLockV1){
      const original = getTableNumberMap;
      const wrapped = function(recent){
        const map = original(recent);
        for(const [n, cls] of pinned.entries()){
          map.set(Number(n), pinnedMeta(cls));
        }
        return map;
      };
      wrapped.__tableLockV1 = true;
      getTableNumberMap = wrapped;
    }

    if(typeof getTableOverlapNumbers === 'function' &&
       !getTableOverlapNumbers.__tableLockV1){
      const original = getTableOverlapNumbers;
      const wrapped = function(recent){
        const set = new Set(original(recent));
        for(const [n, cls] of pinned.entries()){
          if(cls === 'overlap') set.add(Number(n));
        }
        return [...set].sort((a,b)=>a-b);
      };
      wrapped.__tableLockV1 = true;
      getTableOverlapNumbers = wrapped;
    }

    if(typeof comboRecentNumbersHTML === 'function' &&
       !comboRecentNumbersHTML.__tableLockV1){
      const wrapped = function(draw, numberMap){
        const source = comboSourceHighlightSetForDraw(draw);
        const balls = tableRecentOrder === 'asc'
          ? [...(draw.balls || [])].sort((a,b)=>a-b)
          : (draw.balls || []);
        const mirrorNumbers = typeof tableMirrorPairs !== 'undefined' && tableMirrorPairs &&
          typeof getTableMirrorPairNumbers === 'function'
          ? getTableMirrorPairNumbers(draw) : new Set();

        return balls.map(raw => {
          const n = Number(raw);
          const meta = numberMap.get(n);
          const isPinned = !!meta?.pinned;
          const echo = (isPinned || tableHighlightActive)
            ? tableClassForNumber(meta)
            : '';
          const cls = [
            'recentDrawNum',
            source.has(n) ? 'sourceOn' : '',
            echo ? 'tableEcho' : '',
            echo,
            mirrorNumbers.has(n) ? 'mirrorPair' : '',
            tableMarkedNumbers.has(n) ? 'numberPicked' : ''
          ].filter(Boolean).join(' ');
          return '<span class="' + cls + '" data-dnum="' + n + '"' +
            (typeof tableParityVisible === 'function' && !tableParityVisible(n)
              ? ' style="visibility:hidden"' : '') + '>' + (typeof tableReverseDisplay === 'function' ? tableReverseDisplay(n) : fmt(n)) + '</span>';
        }).join(' ');
      };
      wrapped.__tableLockV1 = true;
      comboRecentNumbersHTML = wrapped;
    }

    if(typeof syncTableHeadButtons === 'function' &&
       !syncTableHeadButtons.__tableLockV1){
      const original = syncTableHeadButtons;
      const wrapped = function(){
        original();
        bindLockButton();
        syncLockButton();
      };
      wrapped.__tableLockV1 = true;
      syncTableHeadButtons = wrapped;
    }

    if(typeof renderTableDrawer === 'function' &&
       !renderTableDrawer.__tableLockV1){
      const original = renderTableDrawer;
      const wrapped = function(){
        const out = original.apply(this, arguments);
        bindLockButton();
        syncLockButton();
        return out;
      };
      wrapped.__tableLockV1 = true;
      renderTableDrawer = wrapped;
    }
  }

  loadPinned();
  bindLockButton();
  installWrappers();
  syncLockButton();
})();

/* Loader: COMBO · Разные + Свежие */
(() => {
  'use strict';
  if(window.__comboFreshSplitLoader)return;
  window.__comboFreshSplitLoader=true;
  const load=()=>{
    if(document.querySelector('script[data-combo-fresh-split]'))return;
    const s=document.createElement('script');
    const build=document.querySelector('meta[name="app-build"]')?.content||String(Date.now());
    s.src='combo-fresh-split-v1.js?v='+encodeURIComponent(build);
    s.dataset.comboFreshSplit='1';
    document.head.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,0),{once:true});
  else setTimeout(load,0);
})();

/* COMBO KENO · История: Возрастание / Переходы / Выпадение */
(() => {
  'use strict';
  if(window.__comboHistoryOrderButtonsV1)return;
  window.__comboHistoryOrderButtonsV1=true;

  const css=document.createElement('style');
  css.textContent=`
    #historyBox .historyTools{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
    #historyBox .historyTools button{min-width:0!important;padding:10px 4px!important;font-size:11px!important;white-space:nowrap!important}
    #historyBox .historyTools button.active{background:linear-gradient(180deg,#58c62b,#319020)!important;border-color:#70e342!important;color:#fff!important;box-shadow:0 0 0 1px rgba(126,236,151,.18) inset!important}
    @media(max-width:380px){#historyBox .historyTools button{font-size:10px!important;padding:9px 2px!important}}
  `;
  document.head.appendChild(css);

  function patchedOrderSwitchHTML(){
    const back=new URLSearchParams(location.search).has('intervalK7')
      ? '<a href="./k7-interval-builder.html">← K7 · Ядро</a>'
      : '';
    return `${back}<div class="historyTools historyToolsThree">
      <button type="button" data-history-order="asc" class="${historyOrder==='asc'?'active':''}" aria-pressed="${historyOrder==='asc'}">➡️ Возрастание</button>
      <button id="historyTransitionsBtn" type="button" class="${historyTransitions?'active':''}" aria-pressed="${historyTransitions}">🔸 Переходы</button>
      <button type="button" data-history-order="draw" class="${historyOrder==='draw'?'active':''}" aria-pressed="${historyOrder==='draw'}">🎲 Выпадение</button>
    </div>`;
  }

  function patchedBindHistoryOrder(){
    const transitions=document.getElementById('historyTransitionsBtn');
    if(transitions) transitions.onclick=()=>{
      historyTransitions=!historyTransitions;
      renderHistory();
    };
    document.querySelectorAll('#historyBox [data-history-order]').forEach(b=>{
      b.onclick=()=>{
        historyOrder=b.dataset.historyOrder==='asc'?'asc':'draw';
        renderHistory();
      };
    });
  }

  try{ orderSwitchHTML=patchedOrderSwitchHTML; }catch(e){ window.orderSwitchHTML=patchedOrderSwitchHTML; }
  try{ bindHistoryOrder=patchedBindHistoryOrder; }catch(e){ window.bindHistoryOrder=patchedBindHistoryOrder; }

  if(typeof renderHistory==='function' && window.lastResult){
    try{ renderHistory(); }catch(e){}
  }
})();

/* COMBO KENO · Карточка «Комбы»: гарантируем 3 клавиши даже после перерисовки
   ➡️ Возрастание · 🔸 Переходы · 🎲 Выпадение
*/
(() => {
  'use strict';
  if(window.__comboDetailThreeButtonsFix)return;
  window.__comboDetailThreeButtonsFix=true;

  const style=document.createElement('style');
  style.textContent=`
    #csDetail .csDetailTools .historyTools{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;flex:1 1 390px!important}
    #csDetail .csDetailTools .historyTools button{min-width:0!important;padding:9px 4px!important;font-size:10.5px!important;white-space:nowrap!important}
    #csDetail .csDetailTools .historyTools button.active{background:linear-gradient(180deg,#58c62b,#319020)!important;border-color:#70e342!important;color:#fff!important}
    @media(max-width:380px){#csDetail .csDetailTools .historyTools button{font-size:9.5px!important;padding:8px 2px!important}}
  `;
  document.head.appendChild(style);

  const archive=()=>{
    try{
      if(typeof window.getComboDraws==='function')return window.getComboDraws()||[];
      if(typeof DRAWS!=='undefined'&&Array.isArray(DRAWS))return DRAWS;
    }catch(e){}
    return [];
  };

  function drawById(id){
    return archive().find(d=>Number(d.draw)===Number(id));
  }

  function transitionSet(d){
    const a=archive();
    const i=a.findIndex(x=>Number(x.draw)===Number(d?.draw));
    if(i<=0)return new Set();
    const prev=new Set((a[i-1]?.balls||[]).map(Number));
    return new Set((d?.balls||[]).map(Number).filter(n=>prev.has(Number(n))));
  }

  function install(){
    const box=document.getElementById('csDetail');
    if(!box||box.classList.contains('hidden'))return;
    const tools=box.querySelector('.csDetailTools .historyTools');
    if(!tools)return;

    let asc=tools.querySelector('[data-combo-order="asc"]')||tools.querySelector('button:not(#csTransitionsBtn):not(#comboDetailTransitionsBtn):not([data-combo-order="draw"])');
    if(!asc)return;
    asc.dataset.comboOrder='asc';
    asc.textContent='➡️ Возрастание';

    let trans=tools.querySelector('#csTransitionsBtn')||tools.querySelector('#comboDetailTransitionsBtn');
    if(!trans){
      trans=document.createElement('button');
      trans.type='button';
      trans.id='comboDetailTransitionsBtn';
      trans.textContent='🔸 Переходы';
      tools.appendChild(trans);
    }else{
      trans.textContent='🔸 Переходы';
    }

    let draw=tools.querySelector('[data-combo-order="draw"]');
    if(!draw){
      draw=document.createElement('button');
      draw.type='button';
      draw.dataset.comboOrder='draw';
      draw.textContent='🎲 Выпадение';
      tools.appendChild(draw);
    }

    const getOrder=()=>box.dataset.comboDetailOrder==='draw'?'draw':'asc';
    const getTransitions=()=>box.dataset.comboDetailTransitions==='1';

    const apply=()=>{
      const order=getOrder();
      const showTransitions=getTransitions();
      asc.classList.toggle('active',order==='asc');
      draw.classList.toggle('active',order==='draw');
      trans.classList.toggle('active',showTransitions);
      trans.setAttribute('aria-pressed',showTransitions?'true':'false');

      box.querySelectorAll('.hist .hrow:not(.head)').forEach(row=>{
        const id=Number(row.querySelector('.hdraw')?.textContent);
        const d=drawById(id);
        const wrap=row.querySelector('.drawnums');
        if(!d||!wrap)return;
        const spans=[...wrap.querySelectorAll('.dn')];
        const byNum=new Map(spans.map(el=>[Number(String(el.textContent).trim()),el]));
        const wanted=order==='draw'
          ? (d.balls||[]).map(Number)
          : [...(d.balls||[])].map(Number).sort((a,b)=>a-b);
        const tr=showTransitions?transitionSet(d):new Set();
        for(const n of wanted){
          const el=byNum.get(Number(n));
          if(!el)continue;
          el.classList.toggle('transition',tr.has(Number(n)));
          wrap.appendChild(el);
        }
      });

      const head=box.querySelector('.hist .hrow.head .hcell:last-child');
      if(head)head.textContent=`Числа тиража · ${order==='draw'?'🎲':'⬆️'} · 2×10`;
    };

    asc.onclick=()=>{box.dataset.comboDetailOrder='asc';apply()};
    draw.onclick=()=>{box.dataset.comboDetailOrder='draw';apply()};
    trans.onclick=()=>{box.dataset.comboDetailTransitions=getTransitions()?'0':'1';apply()};
    apply();
  }

  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(install,0)};
  const observer=new MutationObserver(schedule);
  const start=()=>{
    if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    schedule();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();


/* COMBO · Линии переходов на Таблице v1
   Кнопка «Линии» рядом с МАТР / TRG. Для каждого открытого тира (5 / 10 / 20 или
   своё количество; если список свёрнут — последний тираж) берутся числа, которые
   перешли из предыдущего тиража, и соединяются ломаной в порядке выпадения.
   Цвет линии = цвет тира (1 зел, 2 жёлт, 3 красн, 4 голуб, 5 синий по кругу). */
(() => {
  'use strict';
  if(window.__comboTransitionLinesV1)return;
  window.__comboTransitionLinesV1=true;

  const KEY='combo-transition-lines-v1';
  const ORDER=['c1','c2','c3','c4','c5'];
  const COLORS={c1:'#62e06c',c2:'#ffd43b',c3:'#ff5f5f',c4:'#4fd2ff',c5:'#9aa6ff'};
  const NS='http://www.w3.org/2000/svg';
  let on=false;
  const hidden=new Set();
  try{on=localStorage.getItem(KEY)==='1'}catch(e){}

  const f2=n=>String(n).padStart(2,'0');
  const allDraws=()=>{try{return Array.isArray(DRAWS)?DRAWS:[]}catch(e){return[]}};
  const windowSize=()=>{try{return Number(tableRecentWindow)||0}catch(e){return 0}};

  function injectStyle(){
    if(document.getElementById('comboTransitionLinesStyle'))return;
    const st=document.createElement('style');
    st.id='comboTransitionLinesStyle';
    st.textContent=[
      '#tableDrawerBody .tableGrid{position:relative}',
      '#tableDrawerBody .tlSvg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:3}',
      '#tableDrawerBody .tlLegend{display:flex;flex-direction:column;gap:4px;margin:8px 0 4px}',
      '#tableDrawerBody .tlRow{display:flex;align-items:center;gap:7px;padding:5px 8px;border:1px solid #33536d;border-radius:9px;background:#0d2236;color:#fff;font-size:12px;line-height:1.3;text-align:left;width:100%}',
      '#tableDrawerBody .tlRow.off{opacity:.38}',
      '#tableDrawerBody .tlDot{flex:0 0 12px;width:12px;height:12px;border-radius:50%}',
      '#tableDrawerBody .tlRow b{white-space:nowrap}',
      '#tableDrawerBody .tlSeq{font-weight:700;letter-spacing:.2px}',
      '#tableDrawerBody .tlNone{color:#9fb3c6}'
    ].join('');
    document.head.appendChild(st);
  }

  function linesData(){
    const all=allDraws();
    if(all.length<2)return[];
    const count=Math.min(windowSize()||1,all.length-1);
    const out=[];
    for(let i=0;i<count;i++){
      const idx=all.length-1-i;
      const cur=all[idx],prev=all[idx-1];
      if(!cur||!prev)continue;
      const prevSet=new Set((prev.balls||[]).map(Number));
      const nums=(cur.balls||[]).map(Number).filter(n=>prevSet.has(n));
      out.push({draw:Number(cur.draw),prev:Number(prev.draw),nums,color:COLORS[ORDER[i%ORDER.length]]});
    }
    return out;
  }

  function ensureButton(){
    const bar=document.querySelector('.tableFeatureControls');
    if(!bar)return null;
    let b=document.getElementById('tableLinesBtn');
    if(!b){
      b=document.createElement('button');
      b.id='tableLinesBtn';
      b.type='button';
      b.title='Линии переходов чисел между тиражами';
      b.textContent='〰 Линии';
      bar.appendChild(b);
    }
    b.classList.toggle('active',on);
    b.setAttribute('aria-pressed',on?'true':'false');
    return b;
  }

  function svgEl(tag,attrs){
    const el=document.createElementNS(NS,tag);
    for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
    return el;
  }

  let observedGrid=null;
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>schedule()):null;

  function draw(){
    ensureButton();
    const box=document.getElementById('tableDrawerBody');
    if(!box)return;
    box.querySelectorAll('.tlSvg,.tlLegend').forEach(el=>el.remove());
    const grid=box.querySelector('.tableGrid');
    if(!grid)return;
    if(resizeObserver&&observedGrid!==grid){
      if(observedGrid)resizeObserver.unobserve(observedGrid);
      resizeObserver.observe(grid);
      observedGrid=grid;
    }
    if(!on)return;
    injectStyle();

    const data=linesData();
    const legend=document.createElement('div');
    legend.className='tlLegend';
    legend.innerHTML=data.length?data.map(l=>{
      const seq=l.nums.length?l.nums.map(f2).join(' → '):'<span class="tlNone">переходов нет</span>';
      return `<button type="button" class="tlRow ${hidden.has(l.draw)?'off':''}" data-tl-draw="${l.draw}"><span class="tlDot" style="background:${l.color}"></span><b>№${l.draw}</b><span>${l.nums.length}:</span><span class="tlSeq">${seq}</span></button>`;
    }).join(''):'<div class="tlRow"><span class="tlNone">Недостаточно тиражей для линий</span></div>';
    grid.after(legend);

    const w=grid.clientWidth,h=grid.clientHeight;
    if(!w||!h)return;
    const gr=grid.getBoundingClientRect();
    const ox=gr.left+grid.clientLeft,oy=gr.top+grid.clientTop;
    const centers=new Map();
    grid.querySelectorAll('[data-tcell]').forEach(c=>{
      const r=c.getBoundingClientRect();
      centers.set(Number(c.dataset.tcell),{x:r.left-ox+r.width/2,y:r.top-oy+r.height/2,s:Math.min(r.width,r.height)});
    });
    const cell=[...centers.values()][0]?.s||30;

    const svg=svgEl('svg',{class:'tlSvg',viewBox:`0 0 ${w} ${h}`,'aria-hidden':'true'});
    const defs=svgEl('defs',{});
    svg.appendChild(defs);
    const visible=data.filter(l=>!hidden.has(l.draw)&&l.nums.length);
    const step=visible.length>1?Math.min(3,cell*0.36/(visible.length-1)):0;
    // Старые тиражи рисуются первыми, свежий — сверху.
    [...visible].reverse().forEach(l=>{
      const k=visible.indexOf(l);
      const shift=(k-(visible.length-1)/2)*step;
      const pts=l.nums.map(n=>centers.get(n)).filter(Boolean).map(p=>({x:p.x+shift,y:p.y+shift}));
      if(!pts.length)return;
      const id='tlArrow'+l.draw;
      const marker=svgEl('marker',{id,viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'4.2',markerHeight:'4.2',orient:'auto-start-reverse'});
      marker.appendChild(svgEl('path',{d:'M0,0 L10,5 L0,10 z',fill:l.color}));
      defs.appendChild(marker);
      const g=svgEl('g',{});
      const r=Math.max(9,cell*0.4);
      if(pts.length>1){
        // Отрезок идёт от кольца до кольца: цифры в клетках не перекрываются, стрелка видна.
        const parts=[];
        for(let i=1;i<pts.length;i++){
          const a=pts[i-1],b=pts[i];
          const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
          const cut=Math.min(r+1,len/2-1);
          if(cut<0)continue;
          parts.push({x1:a.x+dx/len*cut,y1:a.y+dy/len*cut,x2:b.x-dx/len*cut,y2:b.y-dy/len*cut});
        }
        for(const p of parts)g.appendChild(svgEl('line',{...p,stroke:'rgba(0,0,0,.6)','stroke-width':5.5,'stroke-linecap':'round'}));
        for(const p of parts)g.appendChild(svgEl('line',{...p,stroke:l.color,'stroke-width':2.6,'stroke-linecap':'round','marker-end':`url(#${id})`}));
      }
      // Кольцо по краю клетки, чтобы цифра оставалась читаемой; старт — толстое кольцо.
      pts.forEach((p,i)=>{
        const sw=i===0?4.2:2;
        g.appendChild(svgEl('circle',{cx:p.x,cy:p.y,r,fill:'none',stroke:'rgba(0,0,0,.55)','stroke-width':sw+2.4}));
        g.appendChild(svgEl('circle',{cx:p.x,cy:p.y,r,fill:'none',stroke:l.color,'stroke-width':sw}));
      });
      svg.appendChild(g);
    });
    grid.appendChild(svg);
  }

  let raf=0;
  function schedule(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>requestAnimationFrame(draw));
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#tableLinesBtn');
    if(b){
      on=!on;
      try{localStorage.setItem(KEY,on?'1':'0')}catch(err){}
      schedule();
      return;
    }
    const row=e.target.closest?.('[data-tl-draw]');
    if(row){
      const id=Number(row.dataset.tlDraw);
      if(hidden.has(id))hidden.delete(id);else hidden.add(id);
      schedule();
    }
  });

  function wrapRender(){
    try{
      if(typeof renderTableDrawer!=='function'||renderTableDrawer.__transitionLinesV1)return;
      const original=renderTableDrawer;
      const wrapped=function(){
        const out=original.apply(this,arguments);
        schedule();
        return out;
      };
      wrapped.__transitionLinesV1=true;
      wrapped.__tableLockV1=original.__tableLockV1;
      renderTableDrawer=wrapped;
    }catch(e){console.warn('COMBO LINES WRAP',e)}
  }

  wrapRender();
  window.addEventListener('resize',schedule);
  window.addEventListener('orientationchange',schedule);
  const start=()=>{ensureButton();schedule()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
