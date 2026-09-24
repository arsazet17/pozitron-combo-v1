#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
COMBO KENO — установщик кнопки 🔒 для Таблицы.

Кладётся в корень проекта и запускается:
    python COMBO_KENO_LOCK_INSTALLER.py

Он:
1) создаёт combo-table-lock-v1.js;
2) подключает его в index.html;
3) повышает patch-версию приложения;
4) меняет build для обхода кэша;
5) обновляет app-version.json, manifest.webmanifest и sw.js;
6) сохраняет резервные копии изменённых файлов *.bak-lock.
"""

from pathlib import Path
import json
import re
import hashlib
import time
import shutil

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"
APP_VERSION = ROOT / "app-version.json"
MANIFEST = ROOT / "manifest.webmanifest"
SW = ROOT / "sw.js"
LOCK_JS = ROOT / "combo-table-lock-v1.js"

LOCK_JS_CONTENT = '/* COMBO KENO — закрепление цветных чисел в Таблице\n   Добавляет кнопку 🔒 в верхнюю строку Таблицы.\n   Закреплённые числа и их цвета:\n   - не удаляются кнопкой «Очистить»;\n   - подсвечиваются во всех показанных тиражах ниже;\n   - сохраняются после перезагрузки страницы;\n   - снимаются повторным нажатием 🔒.\n*/\n(() => {\n  \'use strict\';\n\n  const PIN_KEY = \'comboKenoTablePinnedV1\';\n  const PIN_ALLOWED = new Set([\'manual\',\'c1\',\'c2\',\'c3\',\'c4\',\'c5\',\'overlap\']);\n  let pinned = new Map();\n\n  function loadPinned(){\n    try{\n      const raw = JSON.parse(localStorage.getItem(PIN_KEY) || \'[]\');\n      pinned = new Map(\n        (Array.isArray(raw) ? raw : [])\n          .map(x => [Number(x?.n), String(x?.cls || \'manual\')])\n          .filter(([n, cls]) => Number.isInteger(n) && n >= 1 && n <= 80 && PIN_ALLOWED.has(cls))\n      );\n    }catch(e){\n      pinned = new Map();\n    }\n  }\n\n  function savePinned(){\n    try{\n      localStorage.setItem(\n        PIN_KEY,\n        JSON.stringify([...pinned.entries()].map(([n, cls]) => ({n, cls})))\n      );\n    }catch(e){}\n  }\n\n  function ensureStyle(){\n    if(document.getElementById(\'comboTableLockStyles\')) return;\n    const s = document.createElement(\'style\');\n    s.id = \'comboTableLockStyles\';\n    s.textContent = `\n      #tableLockBtn{\n        min-width:42px;\n        font-size:18px;\n        line-height:1;\n        padding:6px 8px;\n      }\n      #tableLockBtn.active{\n        background:linear-gradient(180deg,#2c7d40,#1e5b32);\n        border-color:#55c876;\n        box-shadow:0 0 0 2px rgba(85,200,118,.18);\n      }\n      .recentDrawNum.pinnedEcho{\n        outline:1px solid rgba(255,255,255,.55);\n        outline-offset:1px;\n      }\n      @media(max-width:430px){\n        #tableLockBtn{min-width:38px;padding:5px 6px;font-size:17px}\n      }\n    `;\n    document.head.appendChild(s);\n  }\n\n  function ensureButton(){\n    const head = document.querySelector(\'.tableDrawerHead\');\n    const active = document.getElementById(\'tableActiveBtn\');\n    if(!head || !active) return null;\n\n    let b = document.getElementById(\'tableLockBtn\');\n    if(!b){\n      b = document.createElement(\'button\');\n      b.id = \'tableLockBtn\';\n      b.className = \'tableHeadToggle\';\n      b.type = \'button\';\n      b.textContent = \'🔒\';\n      b.title = \'Закрепить / снять закрепление цветных чисел\';\n      b.setAttribute(\'aria-label\',\'Закрепить цветные числа\');\n      head.insertBefore(b, active);\n      b.onclick = togglePinned;\n    }\n    syncLockButton();\n    return b;\n  }\n\n  function syncLockButton(){\n    const b = document.getElementById(\'tableLockBtn\');\n    if(!b) return;\n    const on = pinned.size > 0;\n    b.classList.toggle(\'active\', on);\n    b.setAttribute(\'aria-pressed\', on ? \'true\' : \'false\');\n    b.title = on\n      ? `Закреплено: ${pinned.size}. Нажмите, чтобы снять закрепление`\n      : \'Закрепить текущие цветные числа\';\n  }\n\n  function currentSnapshot(){\n    const recent = (typeof getRecentVisibleDraws === \'function\')\n      ? getRecentVisibleDraws()\n      : [];\n\n    const map = new Map();\n\n    // Ручные цветные/отмеченные числа.\n    for(const n of tableManualSelected){\n      map.set(Number(n), {\n        manual: true,\n        manualColor: tableManualColors[n] || \'\',\n        colors: []\n      });\n    }\n\n    // Числа из выбранных цветных тиражей.\n    recent.forEach((d, idx) => {\n      if(!tableActiveDrawIds.includes(d.draw)) return;\n      const cls = TABLE_DRAW_COLORS[idx % TABLE_DRAW_COLORS.length];\n      (d.balls || []).forEach(n => {\n        n = Number(n);\n        if(!map.has(n)) map.set(n, {manual:false, manualColor:\'\', colors:[]});\n        map.get(n).colors.push(cls);\n      });\n    });\n\n    const snap = new Map();\n    for(const [n, meta] of map){\n      let cls = \'\';\n      try{ cls = tableClassForNumber(meta); }catch(e){}\n      if(!PIN_ALLOWED.has(cls)) cls = \'manual\';\n      snap.set(Number(n), cls);\n    }\n    return snap;\n  }\n\n  function togglePinned(){\n    if(pinned.size){\n      pinned.clear();\n      savePinned();\n      syncLockButton();\n      try{ renderTableDrawer(); }catch(e){}\n      return;\n    }\n\n    const snap = currentSnapshot();\n    if(!snap.size){\n      alert(\'Сначала выберите и раскрасьте числа, которые нужно закрепить.\');\n      return;\n    }\n\n    pinned = snap;\n    savePinned();\n    syncLockButton();\n    try{ renderTableDrawer(); }catch(e){}\n  }\n\n  function installWrappers(){\n    if(typeof getTableEffectiveSelected === \'function\' && !getTableEffectiveSelected.__pinWrapped){\n      const original = getTableEffectiveSelected;\n      const wrapped = function(){\n        const set = new Set(original());\n        for(const n of pinned.keys()) set.add(Number(n));\n        return [...set].sort((a,b)=>a-b);\n      };\n      wrapped.__pinWrapped = true;\n      getTableEffectiveSelected = wrapped;\n    }\n\n    if(typeof getTableNumberMap === \'function\' && !getTableNumberMap.__pinWrapped){\n      const original = getTableNumberMap;\n      const wrapped = function(recent){\n        const map = original(recent);\n\n        // Закреплённый снимок имеет приоритет над временным состоянием.\n        for(const [n, cls] of pinned.entries()){\n          map.set(Number(n), {\n            manual: true,\n            manualColor: cls === \'manual\' ? \'\' : cls,\n            colors: [],\n            pinned: true,\n            pinnedClass: cls\n          });\n        }\n        return map;\n      };\n      wrapped.__pinWrapped = true;\n      getTableNumberMap = wrapped;\n    }\n\n    if(typeof comboRecentNumbersHTML === \'function\' && !comboRecentNumbersHTML.__pinWrapped){\n      const wrapped = function(draw, numberMap){\n        const source = comboSourceHighlightSetForDraw(draw);\n        const balls = tableRecentOrder === \'asc\'\n          ? [...(draw.balls || [])].sort((a,b)=>a-b)\n          : (draw.balls || []);\n\n        return balls.map(n => {\n          n = Number(n);\n          const meta = numberMap.get(n);\n          const isPinned = !!meta?.pinned;\n          const echo = (isPinned || tableHighlightActive)\n            ? tableClassForNumber(meta)\n            : \'\';\n          const cls = [\n            \'recentDrawNum\',\n            source.has(n) ? \'sourceOn\' : \'\',\n            echo ? \'tableEcho\' : \'\',\n            echo,\n            isPinned ? \'pinnedEcho\' : \'\'\n          ].filter(Boolean).join(\' \');\n          return \'<span class="\' + cls + \'">\' + fmt(n) + \'</span>\';\n        }).join(\' \');\n      };\n      wrapped.__pinWrapped = true;\n      comboRecentNumbersHTML = wrapped;\n    }\n\n    if(typeof syncTableHeadButtons === \'function\' && !syncTableHeadButtons.__pinWrapped){\n      const original = syncTableHeadButtons;\n      const wrapped = function(){\n        original();\n        ensureButton();\n        syncLockButton();\n      };\n      wrapped.__pinWrapped = true;\n      syncTableHeadButtons = wrapped;\n    }\n\n    if(typeof renderTableDrawer === \'function\' && !renderTableDrawer.__pinWrapped){\n      const original = renderTableDrawer;\n      const wrapped = function(){\n        ensureButton();\n        const result = original();\n        syncLockButton();\n        return result;\n      };\n      wrapped.__pinWrapped = true;\n      renderTableDrawer = wrapped;\n    }\n  }\n\n  function init(){\n    loadPinned();\n    ensureStyle();\n    ensureButton();\n    installWrappers();\n    syncLockButton();\n\n    // Если Таблица уже открыта — сразу перерисуем закреплённые числа.\n    try{\n      const drawer = document.getElementById(\'tableDrawer\');\n      if(drawer && !drawer.classList.contains(\'hidden\')) renderTableDrawer();\n    }catch(e){}\n  }\n\n  if(document.readyState === \'loading\'){\n    document.addEventListener(\'DOMContentLoaded\', init, {once:true});\n  }else{\n    init();\n  }\n})();\n'

required = [INDEX, APP_VERSION, MANIFEST, SW]
missing = [p.name for p in required if not p.exists()]
if missing:
    raise SystemExit("Не найдены файлы проекта: " + ", ".join(missing))

def backup(path: Path):
    dst = path.with_name(path.name + ".bak-lock")
    if not dst.exists():
        shutil.copy2(path, dst)

def bump_patch(version: str) -> str:
    m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", version.strip())
    if not m:
        return version.strip()
    a, b, c = map(int, m.groups())
    return f"{a}.{b}.{c+1}"

for p in required:
    backup(p)

meta = json.loads(APP_VERSION.read_text(encoding="utf-8"))
old_version = str(meta.get("version", "4.3.16"))
old_build = str(meta.get("build", "")).strip()
new_version = bump_patch(old_version)

seed = LOCK_JS_CONTENT + new_version + str(time.time_ns())
new_build = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:12]

LOCK_JS.write_text(LOCK_JS_CONTENT, encoding="utf-8")

# index.html
text = INDEX.read_text(encoding="utf-8")

if old_build:
    text = text.replace(old_build, new_build)

# Меняем только отображаемую версию приложения формата "Версия vX.Y.Z".
text = re.sub(
    r"Версия v\d+\.\d+\.\d+",
    "Версия v" + new_version,
    text
)

loader = f'<script src="combo-table-lock-v1.js?v={new_build}"></script>'
if "combo-table-lock-v1.js" not in text:
    marker = '<script src="combo-search-v1.js'
    pos = text.find(marker)
    if pos < 0:
        raise SystemExit("Не найдено место подключения combo-search-v1.js в index.html")
    text = text[:pos] + loader + "\n" + text[pos:]

INDEX.write_text(text, encoding="utf-8")

# app-version.json
meta["version"] = new_version
meta["build"] = new_build
APP_VERSION.write_text(
    json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8"
)

# manifest.webmanifest
manifest = MANIFEST.read_text(encoding="utf-8")
if old_build:
    manifest = manifest.replace(old_build, new_build)
manifest = re.sub(
    r'("start_url"\s*:\s*"\.\/\?v=)[^"]+(")',
    rf'\g<1>{new_build}\2',
    manifest
)
MANIFEST.write_text(manifest, encoding="utf-8")

# sw.js
sw = SW.read_text(encoding="utf-8")
if old_build:
    sw = sw.replace(old_build, new_build)
sw = re.sub(
    r"const BUILD='[^']+';",
    f"const BUILD='{new_build}';",
    sw
)

if "combo-table-lock-v1.js" not in sw:
    needle = "'./combo-search-v1.js?v='+BUILD,"
    if needle in sw:
        sw = sw.replace(
            needle,
            needle + "'./combo-table-lock-v1.js?v='+BUILD,"
        )
    else:
        raise SystemExit("Не удалось добавить combo-table-lock-v1.js в SHELL service worker")

SW.write_text(sw, encoding="utf-8")

print("Готово.")
print("Версия:", old_version, "->", new_version)
print("Build:", old_build or "—", "->", new_build)
print("Добавлен файл:", LOCK_JS.name)
print("Кнопка 🔒 будет слева от «Актив» в окне «Таблица».")
print("«Очистить» больше не удаляет закреплённые числа.")
