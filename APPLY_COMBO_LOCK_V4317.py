#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"
LOCK = ROOT / "combo-table-lock-v1.js"
BUILD = ROOT / "refresh-combo-build.mjs"
AUTO = ROOT / ".github/workflows/combo-auto-app-build.yml"

LOCK_JS = r"""/* COMBO KENO · TABLE LOCK v1
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
"""

def require(path: Path):
    if not path.exists():
        raise SystemExit(f"Не найден {path.relative_to(ROOT)}")

for p in (INDEX, BUILD, AUTO):
    require(p)

# 1. Отдельный модуль функции.
LOCK.write_text(LOCK_JS, encoding="utf-8")

# 2. Аккуратная верхняя строка Таблицы: заголовок · 🔒 · Актив · Воз · ▼.
html = INDEX.read_text(encoding="utf-8")

html = html.replace(
    ".tableDrawerHead{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:6px;margin-bottom:6px}",
    ".tableDrawerHead{display:grid;grid-template-columns:1fr auto auto auto auto;align-items:center;gap:5px;margin-bottom:6px}"
)

html = html.replace(
    "@media(max-width:430px){.tableDrawerHead{grid-template-columns:1fr auto auto auto;gap:4px}",
    "@media(max-width:430px){.tableDrawerHead{grid-template-columns:1fr auto auto auto auto;gap:3px}"
)

style_anchor = ".tableHeadToggle.active{background:linear-gradient(180deg,#2c7d40,#1e5b32);border-color:#55c876;color:#fff}"
lock_style = (
    ".tableLockBtn{width:38px;min-width:38px;height:32px;padding:0!important;"
    "display:inline-flex;align-items:center;justify-content:center;font-size:16px!important;"
    "line-height:1;border-radius:10px}.tableLockBtn.active{"
    "background:linear-gradient(180deg,#2c7d40,#1e5b32);border-color:#55c876;"
    "box-shadow:0 0 0 1px rgba(126,236,151,.24) inset,0 0 10px rgba(61,187,96,.18)}"
    ".tcell.pinned{box-shadow:0 0 0 1px rgba(255,255,255,.62) inset}"
    ".recentDrawNum.pinned{outline:1px solid rgba(255,255,255,.46);outline-offset:0}"
)

if ".tableLockBtn{" not in html:
    if style_anchor not in html:
        raise SystemExit("Не найден CSS-якорь tableHeadToggle.active")
    html = html.replace(style_anchor, style_anchor + lock_style, 1)

mobile_anchor = ".tableDrawerHead button{padding:5px 7px;font-size:11px}"
mobile_lock = ".tableLockBtn{width:34px;min-width:34px;height:30px;padding:0!important;font-size:15px!important}"
if mobile_lock not in html:
    if mobile_anchor not in html:
        raise SystemExit("Не найден мобильный CSS-якорь")
    html = html.replace(mobile_anchor, mobile_anchor + mobile_lock, 1)

old_head = (
    '<div class="tableDrawerHead"><b>📊 Таблица</b>'
    '<button id="tableActiveBtn" class="tableHeadToggle" type="button" aria-pressed="false">Актив</button>'
)
new_head = (
    '<div class="tableDrawerHead"><b>📊 Таблица</b>'
    '<button id="tableLockBtn" class="tableHeadToggle tableLockBtn" type="button" '
    'aria-pressed="false" aria-label="Закрепить цветные числа" title="Закрепить цветные числа">🔒</button>'
    '<button id="tableActiveBtn" class="tableHeadToggle" type="button" aria-pressed="false">Актив</button>'
)

if 'id="tableLockBtn"' not in html:
    if old_head not in html:
        raise SystemExit("Не найден заголовок Таблицы")
    html = html.replace(old_head, new_head, 1)

loader = '<script src="combo-table-lock-v1.js"></script>'
if "combo-table-lock-v1.js" not in html:
    marker = '<script src="combo-search-v1.js'
    pos = html.find(marker)
    if pos < 0:
        raise SystemExit("Не найден combo-search-v1.js в index.html")
    html = html[:pos] + loader + "\n" + html[pos:]

INDEX.write_text(html, encoding="utf-8")

# 3. Новый модуль участвует в build fingerprint и shell-cache.
build = BUILD.read_text(encoding="utf-8")

old_assets = "const ASSETS=['combo-search-v1.js','xray-engine-v1.js'"
new_assets = "const ASSETS=['combo-search-v1.js','combo-table-lock-v1.js','xray-engine-v1.js'"
if "combo-table-lock-v1.js" not in build:
    if old_assets not in build:
        raise SystemExit("Не найден ASSETS-якорь в refresh-combo-build.mjs")
    build = build.replace(old_assets, new_assets, 1)

shell_old = "'./combo-search-v1.js?v='+BUILD,'./xray-engine-v1.js?v='+BUILD"
shell_new = "'./combo-search-v1.js?v='+BUILD,'./combo-table-lock-v1.js?v='+BUILD,'./xray-engine-v1.js?v='+BUILD"
if shell_new not in build:
    if shell_old not in build:
        raise SystemExit("Не найден SHELL-якорь в refresh-combo-build.mjs")
    build = build.replace(shell_old, shell_new, 1)

BUILD.write_text(build, encoding="utf-8")

# 4. Любое будущее изменение lock-модуля должно запускать штатный app publisher.
auto = AUTO.read_text(encoding="utf-8")
if '"combo-table-lock-v1.js"' not in auto:
    anchor = '"combo-search-v1.js",'
    if anchor not in auto:
        raise SystemExit("Не найден paths-якорь в combo-auto-app-build.yml")
    auto = auto.replace(anchor, anchor + '\n        "combo-table-lock-v1.js",', 1)
AUTO.write_text(auto, encoding="utf-8")

print("COMBO TABLE LOCK PATCH PASS")
