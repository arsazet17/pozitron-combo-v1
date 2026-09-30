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
            echo
          ].filter(Boolean).join(' ');
          return '<span class="' + cls + '">' + fmt(n) + '</span>';
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
        const out = original();
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
      ? '<a href="./k7-interval-builder.html">← Сохранённые K7 · Интервалы</a>'
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
