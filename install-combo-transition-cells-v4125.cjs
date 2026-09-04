'use strict';

const fs = require('fs');

const SEARCH='combo-search-v1.js';
const VERSION='app-version.json';

function fail(msg){ throw new Error('COMBO TRANSITION CELLS FAIL: '+msg); }

let js=fs.readFileSync(SEARCH,'utf8');

const oldCss=".csDetail .dn{position:relative;overflow:visible}.csDetail .dn.transition::after{content:'◆';position:absolute;right:-2px;top:-7px;color:#ff9800;font-size:8px;line-height:1;text-shadow:0 1px 2px #000;z-index:2}.csDetail .dn.hit.transition{box-shadow:0 0 0 1px #72e34d inset}";

const newCss=[
".csDetail .drawnums{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px 4px;align-items:center}",
".csDetail .dn{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:0;height:22px;padding:0 3px;border:1px solid transparent;border-radius:6px;box-sizing:border-box;line-height:1}",
".csDetail .dn.transition{padding-right:11px;background:#3a2a15;border-color:#d89a2b;color:#fff}",
".csDetail .dn.transition::after{content:'◆';position:absolute;right:2px;top:50%;transform:translateY(-50%);color:#ff9800;font-size:7px;line-height:1;text-shadow:none;z-index:2}",
".csDetail .dn.hit.transition{background:var(--green)!important;border-color:#d89a2b!important;color:#fff!important;box-shadow:0 0 0 1px rgba(216,154,43,.45) inset}"
].join('');

if(!js.includes(oldCss)) fail('не найден текущий CSS переходов v4.1.24');

js=js.replace(oldCss,newCss);
js=js.replace("const EXT_VERSION='v4.1.24';","const EXT_VERSION='v4.1.25';");

if(!js.includes("const EXT_VERSION='v4.1.25';")) fail('версия JS не обновилась');
if(!js.includes(".dn.transition{padding-right:11px;background:#3a2a15")) fail('новый стиль ячеек не установлен');
if(!js.includes(".dn.hit.transition{background:var(--green)!important")) fail('нет совместного зелёного+переходного состояния');

fs.writeFileSync(SEARCH,js,'utf8');
fs.writeFileSync(VERSION,JSON.stringify({version:'4.1.25'},null,2)+'\n','utf8');

console.log('COMBO TRANSITION CELLS PASS · v4.1.25');
