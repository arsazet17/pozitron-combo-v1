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


/* COMBO · Матрица «дата × время» v1
   Кнопка «Д×В» рядом с МАТР / TRG / Линии. Открывает отдельный блок под таблицей:
   строки — дни (новые внизу), колонки — время тиража. В ячейке: столб тиража (С)
   и числа главной концентрации (K1–K9, по цифровому корню; при равенстве — та,
   что набрала максимум раньше). Ничего в остальных блоках не меняет. */
(() => {
  'use strict';
  if(window.__comboDayMatrixV1)return;
  window.__comboDayMatrixV1=true;

  const KEY='combo-day-matrix-v1',DAYS_KEY='combo-day-matrix-days-v1',SEL_KEY='combo-day-matrix-k-v1';
  const SELC_KEY='combo-day-matrix-st-v1',PAR_KEY='combo-day-matrix-par-v1',OPEN_KEY='combo-day-matrix-open-v1',ACT_KEY='combo-day-matrix-act-v1';
  const KC=['#ff8a7a','#ffc14d','#e6e05a','#6fd68a','#4fd1c5','#5aa2ff','#a78bfa','#f472b6','#cbd5e1'];
  const WD=['вс','пн','вт','ср','чт','пт','сб'];
  // sel — выбранные концентрации (0..8 = K1..K9). Пусто: в ячейке главная концентрация тиража.
  // selC — выбранные столбы (1..10), par — '' | 'even' | 'odd', open — какие группы кнопок развёрнуты (КЦ / СТ / Ч-Н).
  let on=false,days=3,picked=0,lastSig='',needScroll=false,sel=new Set(),selC=new Set(),par='',selA=new Set(),open={k:false,c:false,p:false,a:false};
  try{
    on=localStorage.getItem(KEY)==='1';
    const sc=JSON.parse(localStorage.getItem(SELC_KEY)||'[]');
    if(Array.isArray(sc))sc.forEach(c=>{if(Number.isInteger(c)&&c>=1&&c<=10)selC.add(c)});
    const pv=localStorage.getItem(PAR_KEY);
    if(pv==='even'||pv==='odd')par=pv;
    const ov=JSON.parse(localStorage.getItem(OPEN_KEY)||'{}');
    if(ov&&typeof ov==='object'){open.k=ov.k===true;open.c=ov.c===true;open.p=ov.p===true;open.a=ov.a===true}
    const av=JSON.parse(localStorage.getItem(ACT_KEY)||'[]');
    if(Array.isArray(av))av.forEach(n=>{if(Number.isInteger(n)&&n>=1&&n<=80)selA.add(n)});
    const d=Number(localStorage.getItem(DAYS_KEY));
    if(Number.isInteger(d)&&d>=1&&d<=30)days=d;
    const s=JSON.parse(localStorage.getItem(SEL_KEY)||'[]');
    if(Array.isArray(s))s.forEach(k=>{if(Number.isInteger(k)&&k>=0&&k<=8)sel.add(k)});
  }catch(e){}

  const allDraws=()=>{try{return Array.isArray(DRAWS)?DRAWS:[]}catch(e){return[]}};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const kOf=n=>((n-1)%9);
  // Числа, отмеченные кнопкой АКТ, подсвечиваются в ячейках матрицы.
  const markNum=n=>selA.has(n)?'<em class="dmA">'+n+'</em>':String(n);

  // Главная концентрация: больше всего чисел; при равенстве — раньше набравшая максимум (порядок выпадения).
  function domK(balls){
    const c=new Array(9).fill(0);let best=0,w=0;
    for(const b of balls){const k=kOf(b);c[k]++;if(c[k]>best){best=c[k];w=k}}
    return w;
  }
  function colOf(d){
    const v=Number(d.column);
    if(Number.isInteger(v)&&v>=1&&v<=10)return v;
    const c=new Array(11).fill(0);let best=0,w=1;
    for(const b of d.balls||[]){const k=((Number(b)-1)%10)+1;c[k]++;if(c[k]>best){best=c[k];w=k}}
    return w;
  }
  function weekday(date){
    const m=String(date).match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    return m?WD[new Date(2000+Number(m[3]),Number(m[2])-1,Number(m[1])).getDay()]:'';
  }

  function injectStyle(){
    if(document.getElementById('comboDayMatrixStyle'))return;
    const st=document.createElement('style');
    st.id='comboDayMatrixStyle';
    st.textContent=[
      '#tableDayMatrixPanel{width:100%;min-width:0;box-sizing:border-box;margin:8px 0 14px;padding:8px;border:1px solid #365b78;border-radius:12px;background:#091d30}',
      '#tableDayMatrixPanel.hidden{display:none}',
      '#tableDayMatrixPanel .dmHead{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px}',
      '#tableDayMatrixPanel .dmHead b{font-size:15px;margin-right:auto}',
      '#tableDayMatrixPanel .dmHead button{min-width:34px;height:34px;padding:0 8px;border:1px solid #406783;background:#14324b;border-radius:9px;font-weight:800;color:#fff}',
      '#tableDayMatrixPanel .dmHead span{font-size:12px;color:#b8cde0}',
      '#tableDayMatrixPanel .dmScroll{overflow-x:auto;overflow-y:hidden;padding-bottom:6px;-webkit-overflow-scrolling:touch}',
      '#tableDayMatrixPanel table{border-collapse:separate;border-spacing:4px;width:max-content}',
      '#tableDayMatrixPanel th{font-size:11px;font-weight:800;color:#b8cde0;text-align:center;padding:0 0 2px;white-space:nowrap}',
      '#tableDayMatrixPanel th.dmDate,#tableDayMatrixPanel td.dmDate{position:sticky;left:0;z-index:2;background:#091d30;text-align:left;min-width:46px;padding-right:4px}',
      '#tableDayMatrixPanel td.dmDate{font-size:13px;font-weight:800;color:#fff;line-height:1.15}',
      '#tableDayMatrixPanel td.dmDate small{display:block;font-size:10px;font-weight:600;color:#8fa9c2}',
      '#tableDayMatrixPanel td{vertical-align:top;padding:0;height:1px}',
      '#tableDayMatrixPanel td>.dmc,#tableDayMatrixPanel td>.dmEmpty{height:100%}',
      '#tableDayMatrixPanel.dmWide .dmc,#tableDayMatrixPanel.dmWide .dmEmpty{width:122px}',
      '#tableDayMatrixPanel.dmWide .dmc i{word-spacing:3px}',
      '#tableDayMatrixPanel .dmc{box-sizing:border-box;width:78px;min-height:66px;border:1px solid #2b4a68;border-radius:9px;background:#10263d;padding:5px;display:flex;flex-direction:column;gap:4px;color:#fff;text-align:left;font:inherit}',
      '#tableDayMatrixPanel .dmc.last{border-color:#f2c230}',
      '#tableDayMatrixPanel .dmc.sel{outline:2px solid #fff;outline-offset:-2px}',
      '#tableDayMatrixPanel .dmc b{align-self:flex-start;font-size:13px;font-weight:900;background:#1b3550;border-radius:6px;padding:1px 6px}',
      '#tableDayMatrixPanel .dmc i{font-style:normal;font-size:13px;font-weight:800;line-height:1.2;word-spacing:5px}',
      '#tableDayMatrixPanel .dmTop{display:flex;align-items:center;justify-content:space-between;gap:4px}',
      '#tableDayMatrixPanel .dmc u{text-decoration:none;font-size:12px;font-weight:900}',
      '#tableDayMatrixPanel .dmLine{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 4px}',
      '#tableDayMatrixPanel .dmNone{font-size:13px;color:#5d7690}',
      '#tableDayMatrixPanel .dmK{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 8px}',
      '#tableDayMatrixPanel .dmc em.dmA{font-style:normal;background:#fff;color:#06121f;border-radius:5px;padding:0 3px;margin:0 -1px}',
      '#tableDayMatrixPanel .dmAct{margin:0 0 8px;padding:8px;border:1px solid #365b78;border-radius:10px;background:#0a1c2d}',
      '#tableDayMatrixPanel .dmActHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:12px;font-weight:800;color:#b8cde0}',
      '#tableDayMatrixPanel .dmActHead button{height:30px;padding:0 10px;border:1px solid #8fa9c2;background:#14324b;border-radius:8px;font-weight:800;font-size:12px;color:#fff}',
      '#tableDayMatrixPanel .dmActGrid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px}',
      '#tableDayMatrixPanel .dmActGrid button{height:34px;padding:0;border:1px solid #2b4a68;border-radius:7px;background:#0f2236;font-weight:800;font-size:13px}',
      '#tableDayMatrixPanel .dmActGrid button.on{background:#fff;color:#06121f!important;border-color:#fff}',
      '#tableDayMatrixPanel .dmK button{min-width:38px;height:34px;padding:0 6px;border:2px solid;border-radius:9px;background:#0a1c2d;font-weight:900;font-size:13px}',
      '#tableDayMatrixPanel .dmK button.on{color:#06121f!important}',
      '#tableDayMatrixPanel .dmTools{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}',
      '#tableDayMatrixPanel .dmTools button{min-width:46px;height:34px;padding:0 12px;border:1px solid #406783;background:#14324b;border-radius:9px;font-weight:800;font-size:13px;color:#fff}',
      '#tableDayMatrixPanel .dmTools button.open{background:#2b7041;border-color:#69c781}',
      '#tableDayMatrixPanel .dmTools button.has{border-color:#ffc14d;color:#ffc14d}',
      '#tableDayMatrixPanel .dmTools button.open.has{color:#fff}',
      '#tableDayMatrixPanel .dmEmpty{width:78px;min-height:66px;border:1px dashed #20364d;border-radius:9px;box-sizing:border-box}',
      '#tableDayMatrixPanel button.dmEmpty{display:block;padding:0;background:transparent;cursor:pointer}',
      '#tableDayMatrixPanel button.dmEmpty.peeked{border-style:solid;border-color:#8fa9c2}',
      '#tableDayMatrixPanel .dmPeek{display:flex;gap:10px;align-items:stretch;margin-top:6px}',
      '#tableDayMatrixPanel .dmPeek .dmc{width:96px;flex:0 0 auto;cursor:default}',
      '#tableDayMatrixPanel .dmInfo{margin-top:8px;padding:8px;border:1px solid #2b4a68;border-radius:9px;background:#0d2236;font-size:12px;color:#b8cde0;line-height:1.5}',
      '#tableDayMatrixPanel .dmInfo b{color:#fff}',
      '#tableDayMatrixPanel .dmInfo span{font-weight:800;margin-right:6px;font-size:14px}',
      '#tableDayMatrixPanel .dmNote{margin-top:6px;font-size:11px;color:#8fa9c2}'
    ].join('');
    document.head.appendChild(st);
  }

  function ensureButton(){
    const bar=document.querySelector('.tableFeatureControls');
    if(!bar)return null;
    let b=document.getElementById('tableDayMatrixBtn');
    if(!b){
      b=document.createElement('button');
      b.id='tableDayMatrixBtn';
      b.type='button';
      b.title='Открыть или закрыть матрицу дата × время';
      b.textContent='Д×В';
      bar.appendChild(b);
      if(typeof MutationObserver==='function'){
        new MutationObserver(()=>{if(b.parentNode===bar&&bar.lastElementChild!==b)bar.appendChild(b)}).observe(bar,{childList:true});
      }
    }
    b.classList.toggle('active',on);
    b.setAttribute('aria-pressed',on?'true':'false');
    return b;
  }

  function ensurePanel(){
    let p=document.getElementById('tableDayMatrixPanel');
    if(p)return p;
    const anchor=document.getElementById('tableMatrixPanel')||document.getElementById('tableDrawerBody');
    if(!anchor)return null;
    p=document.createElement('div');
    p.id='tableDayMatrixPanel';
    p.className='hidden';
    anchor.after(p);
    p.addEventListener('click',onPanelClick);
    return p;
  }

  // Проходит ли тираж текущие фильтры (КЦ, СТ, Ч-Н): возвращает {k,nums} или null.
  function passes(d){
    const balls=(d.balls||[]).map(Number);
    if(!balls.length)return null;
    const k=domK(balls);
    if(sel.size&&!sel.has(k))return null;
    if(selC.size&&!selC.has(colOf(d)))return null;
    let nums=balls.filter(n=>kOf(n)===k).sort((a,b)=>a-b);
    if(par==='even')nums=nums.filter(n=>n%2===0);
    else if(par==='odd')nums=nums.filter(n=>n%2===1);
    if(par&&!nums.length)return null;
    return{k,nums};
  }
  const cellInner=(d,p)=>'<span class="dmTop"><b>С'+colOf(d)+'</b><u style="color:'+KC[p.k]+'">K'+(p.k+1)+'</u></span><i style="color:'+KC[p.k]+'">'+p.nums.map(markNum).join(' ')+'</i>';
  let peek=null,peekTimer=0;

  function collect(){
    const all=allDraws();
    const rows=[];const seen=new Map();
    for(let i=all.length-1;i>=0;i--){
      const d=all[i];if(!d||!d.date)continue;
      let r=seen.get(d.date);
      if(!r){
        if(rows.length>=days)break;
        r={date:d.date,list:new Map()};seen.set(d.date,r);rows.unshift(r);
      }
      r.list.set(String(d.time),d);
    }
    const times=[...new Set(rows.flatMap(r=>[...r.list.keys()]))].sort();
    return{rows,times,last:all.length?all[all.length-1]:null};
  }

  function render(){
    ensureButton();
    const panel=ensurePanel();
    if(!panel)return;
    if(!on){panel.classList.add('hidden');return}
    injectStyle();
    const keep=panel.querySelector('.dmScroll');
    const prevLeft=keep?keep.scrollLeft:0;
    const {rows,times,last}=collect();
    panel.classList.remove('hidden');
    if(!rows.length||!times.length){
      panel.innerHTML='<div class="dmHead"><b>Дата × время</b><button type="button" data-dm="close" aria-label="Закрыть">✕</button></div><div class="dmNote">Нет данных тиражей</div>';
      return;
    }
    const head='<tr><th class="dmDate">дата</th>'+times.map(t=>'<th>'+esc(t)+'</th>').join('')+'</tr>';
    const body=rows.map(r=>{
      const cells=times.map(t=>{
        const d=r.list.get(t);
        if(!d)return'<td><div class="dmEmpty"></div></td>';
        const cls='dmc'+(last&&d.draw===last.draw?' last':'')+(picked===d.draw?' sel':'');
        const p=passes(d);
        // Не подошло под фильтры — пустой квадрат; нажатие покажет следующий подходящий тираж.
        if(!p)return'<td><button type="button" class="dmEmpty'+(peek&&peek.from===d.draw?' peeked':'')+'" data-dm-empty="'+d.draw+'" aria-label="Пустая клетка, показать следующий"></button></td>';
        const inner=cellInner(d,p);
        return'<td><button type="button" class="'+cls+'" data-dm-draw="'+d.draw+'" aria-label="Тираж '+d.draw+'">'+inner+'</button></td>';
      }).join('');
      return'<tr><td class="dmDate">'+esc(r.date.slice(0,5))+'<small>'+esc(weekday(r.date))+'</small></td>'+cells+'</tr>';
    }).join('');
    panel.innerHTML=
      '<div class="dmHead"><b>Дата × время</b><button type="button" data-dm="minus" aria-label="Меньше дней">−</button><span>дни '+days+'</span><button type="button" data-dm="plus" aria-label="Больше дней">+</button><button type="button" data-dm="close" aria-label="Закрыть">✕</button></div>'+
      '<div class="dmTools" role="group" aria-label="Фильтры матрицы">'+
        '<button type="button" data-dm-tg="k" aria-pressed="'+open.k+'" class="'+(open.k?'open ':'')+(sel.size?'has':'')+'" title="Концентрации K1–K9">КЦ'+(sel.size?' '+sel.size:'')+'</button>'+
        '<button type="button" data-dm-tg="c" aria-pressed="'+open.c+'" class="'+(open.c?'open ':'')+(selC.size?'has':'')+'" title="Столбы 1–10">СТ'+(selC.size?' '+selC.size:'')+'</button>'+
        '<button type="button" data-dm-tg="p" aria-pressed="'+open.p+'" class="'+(open.p?'open ':'')+(par?'has':'')+'" title="Только чётные или нечётные числа">Ч-Н'+(par?' '+(par==='even'?'ЧЁТ':'НЕЧЁТ'):'')+'</button>'+
        '<button type="button" data-dm-tg="a" aria-pressed="'+open.a+'" class="'+(open.a?'open ':'')+(selA.size?'has':'')+'" title="Отметить числа на матрице">АКТ'+(selA.size?' '+selA.size:'')+'</button>'+
        ((sel.size||selC.size||par)?'<button type="button" data-dm="reset" aria-label="Сбросить все фильтры" style="border-color:#8fa9c2">Сброс</button>':'')+
      '</div>'+
      (open.k?'<div class="dmK" role="group" aria-label="Концентрации K1–K9">'+KC.map((c,k)=>{
        const a=sel.has(k);
        return'<button type="button" data-dm-k="'+k+'" aria-pressed="'+a+'" class="'+(a?'on':'')+'" style="border-color:'+c+';color:'+c+(a?';background:'+c:'')+'">K'+(k+1)+'</button>';
      }).join('')+'</div>':'')+
      (open.c?'<div class="dmK" role="group" aria-label="Столбы 1–10">'+[1,2,3,4,5,6,7,8,9,10].map(c=>{
        const a=selC.has(c);
        return'<button type="button" data-dm-c="'+c+'" aria-pressed="'+a+'" class="'+(a?'on':'')+'" style="border-color:#7fb8ff;color:#7fb8ff'+(a?';background:#7fb8ff':'')+'">СТ'+c+'</button>';
      }).join('')+'</div>':'')+
      (open.p?'<div class="dmK" role="group" aria-label="Чётные и нечётные числа">'+[['even','ЧЁТ'],['odd','НЕЧЁТ']].map(x=>{
        const a=par===x[0];
        return'<button type="button" data-dm-p="'+x[0]+'" aria-pressed="'+a+'" class="'+(a?'on':'')+'" style="border-color:#7ee0a8;color:#7ee0a8;padding:0 14px'+(a?';background:#7ee0a8':'')+'">'+x[1]+'</button>';
      }).join('')+'</div>':'')+
      (open.a?'<div class="dmAct"><div class="dmActHead"><span>АКТИВНЫЕ ЧИСЛА · 1–80</span><span>Выбрано: '+selA.size+'</span>'+(selA.size?'<button type="button" data-dm="aclear">Очистить</button>':'')+'</div><div class="dmActGrid">'+
        Array.from({length:80},(_,i)=>i+1).map(n=>{
          const a=selA.has(n);
          return'<button type="button" data-dm-a="'+n+'" aria-pressed="'+a+'" class="'+(a?'on':'')+'" style="color:'+KC[kOf(n)]+'">'+n+'</button>';
        }).join('')+'</div></div>':'')+
      '<div class="dmScroll"><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>'+
      '<div class="dmInfo" id="dmInfo"></div>'+
      '<div class="dmNote">В ячейке: столб тиража и числа главной концентрации. КЦ — выбрать концентрации K1–K9, СТ — столбы 1–10, Ч-Н — только чётные или нечётные числа; можно сочетать, пустой квадрат — тираж не подходит. Жёлтая рамка — последний тираж. Нажмите на ячейку — весь тираж.</div>';
    const sc=panel.querySelector('.dmScroll');
    if(sc){
      if(needScroll){
        const cell=sc.querySelector('.dmc.last')||[...sc.querySelectorAll('.dmc')].pop();
        if(cell)sc.scrollLeft=Math.max(0,cell.offsetLeft+cell.offsetWidth-sc.clientWidth+8);
        needScroll=false;
      }else sc.scrollLeft=prevLeft;
    }
    showInfo();
  }

  function showInfo(){
    const box=document.getElementById('dmInfo');
    if(!box)return;
    if(peek){
      const f=allDraws().find(x=>x&&x.draw===peek.from);
      const t=peek.to?allDraws().find(x=>x&&x.draw===peek.to):null;
      box.style.display='';
      const fs=f?esc(f.date)+' '+esc(f.time):'';
      if(!t){box.innerHTML='Пусто '+fs+'. <b>После этого подходящих тиражей пока нет.</b>';return}
      const p=passes(t);
      box.innerHTML='Пусто '+fs+'. Следующий в этом режиме: <b>№'+t.draw+'</b> · '+esc(t.date)+' '+esc(t.time)+
        '<div class="dmPeek"><div class="dmc">'+(p?cellInner(t,p):'')+'</div></div>';
      return;
    }
    const d=allDraws().find(x=>x&&x.draw===picked);
    if(!d){box.style.display='none';return}
    box.style.display='';
    const balls=(d.balls||[]).map(Number).sort((a,b)=>a-b);
    box.innerHTML='<b>№'+d.draw+'</b> · '+esc(d.date)+' '+esc(d.time)+' · столб <b>'+colOf(d)+'</b><br>'+
      balls.map(n=>'<span style="color:'+KC[kOf(n)]+'">'+n+'</span>').join('');
  }

  function save(){peek=null;clearTimeout(peekTimer);try{
    localStorage.setItem(KEY,on?'1':'0');localStorage.setItem(DAYS_KEY,String(days));
    localStorage.setItem(SEL_KEY,JSON.stringify([...sel]));localStorage.setItem(SELC_KEY,JSON.stringify([...selC]));
    localStorage.setItem(PAR_KEY,par);localStorage.setItem(OPEN_KEY,JSON.stringify(open));localStorage.setItem(ACT_KEY,JSON.stringify([...selA]));
  }catch(e){}}

  function onPanelClick(e){
    const b=e.target.closest('button');
    if(!b)return;
    const act=b.dataset.dm;
    if(b.dataset.dmEmpty){
      const id=Number(b.dataset.dmEmpty);
      clearTimeout(peekTimer);
      if(peek&&peek.from===id){peek=null;render();return}
      const all=allDraws();
      const i=all.findIndex(x=>x&&x.draw===id);
      let to=null;
      for(let j=i+1;j<all.length;j++){const x=all[j];if(x&&passes(x)){to=x.draw;break}}
      peek={from:id,to};picked=0;render();
      peekTimer=setTimeout(()=>{peek=null;render()},8000);
      return;
    }
    if(b.dataset.dmK!==undefined){
      const k=Number(b.dataset.dmK);
      if(sel.has(k))sel.delete(k);else sel.add(k);
      save();render();return;
    }
    if(b.dataset.dmTg){
      const g=b.dataset.dmTg;
      if(g==='k'||g==='c'||g==='p'||g==='a'){open[g]=!open[g];save();render()}
      return;
    }
    if(b.dataset.dmA!==undefined){
      const n=Number(b.dataset.dmA);
      if(selA.has(n))selA.delete(n);else selA.add(n);
      save();render();return;
    }
    if(act==='aclear'){selA.clear();save();render();return}
    if(b.dataset.dmC!==undefined){
      const c=Number(b.dataset.dmC);
      if(selC.has(c))selC.delete(c);else selC.add(c);
      save();render();return;
    }
    if(b.dataset.dmP){
      par=par===b.dataset.dmP?'':b.dataset.dmP;
      save();render();return;
    }
    if(act==='reset'){sel.clear();selC.clear();par='';save();render();return}
    if(act==='close'){on=false;save();render();return}
    if(act==='minus'){days=Math.max(1,days-1);save();needScroll=true;render();return}
    if(act==='plus'){days=Math.min(30,days+1);save();needScroll=true;render();return}
    if(b.dataset.dmDraw){
      const id=Number(b.dataset.dmDraw);
      peek=null;clearTimeout(peekTimer);picked=picked===id?0:id;
      render();
    }
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b||b.id!=='tableDayMatrixBtn')return;
    on=!on;save();needScroll=on;render();
    if(on){
      const p=document.getElementById('tableDayMatrixPanel');
      if(p&&p.scrollIntoView)p.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
  });

  // Новые тиражи появляются сами: обновляем блок только если он открыт и данные изменились.
  setInterval(()=>{
    const all=allDraws(),last=all.length?all[all.length-1]:null;
    const sig=all.length+':'+(last?last.draw:0);
    if(sig===lastSig)return;
    lastSig=sig;
    if(on)render();
  },3000);

  const start=()=>{ensureButton();ensurePanel();render()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
