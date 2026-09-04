'use strict';

const fs = require('fs');

const SEARCH = 'combo-search-v1.js';
const VERSION = 'app-version.json';

function fail(msg){
  throw new Error('COMBO DRAW COUNT TEL FIX FAIL: ' + msg);
}

let js = fs.readFileSync(SEARCH, 'utf8');

if (!js.includes("const EXT_VERSION='v4.1.29';")) {
  fail('ожидалась текущая версия v4.1.29');
}

const oldInput =
  '<label class="csDrawCount">Тиражей <input id="csDrawCount" type="number" min="${DETAIL_MIN_DRAWS}" step="1" inputmode="numeric" value="${count}" aria-label="Количество тиражей"></label>';

const newInput =
  '<label class="csDrawCount">Тиражей <input id="csDrawCount" type="tel" inputmode="numeric" pattern="[0-9]*" value="${count}" aria-label="Количество тиражей"></label>';

if (!js.includes(oldInput)) {
  fail('не найдено текущее поле csDrawCount v4.1.29');
}

js = js.replace(oldInput, newInput);
js = js.replace("const EXT_VERSION='v4.1.29';", "const EXT_VERSION='v4.1.30';");

if (!js.includes('id="csDrawCount" type="tel" inputmode="numeric" pattern="[0-9]*"')) {
  fail('type=tel не установлен');
}

if (js.includes('id="csDrawCount" type="number"')) {
  fail('старый type=number остался');
}

if (js.includes('input.select()') || js.includes('setSelectionRange') || js.includes('preventScroll:true')) {
  fail('обнаружены нежелательные обработчики фокуса/выделения');
}

if (!js.includes("input.onchange=apply;")) {
  fail('старый onchange должен сохраниться');
}

fs.writeFileSync(SEARCH, js, 'utf8');
fs.writeFileSync(
  VERSION,
  JSON.stringify({version:'4.1.30'}, null, 2) + '\n',
  'utf8'
);

console.log('COMBO DRAW COUNT TEL FIX PASS · v4.1.30');
