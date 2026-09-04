'use strict';

const fs=require('fs');
const SEARCH='combo-search-v1.js';
const INDEX='index.html';
const VERSION='app-version.json';

function fail(m){throw new Error('COMBO INPUT FINAL FIX FAIL: '+m);}

let js=fs.readFileSync(SEARCH,'utf8');
let html=fs.readFileSync(INDEX,'utf8');

if(!js.includes("const EXT_VERSION='v4.1.30';"))fail('ожидалась v4.1.30');

/* 1. CLEAN MOBILE INPUT: no focus/select JS at all */
const oldInput='<label class="csDrawCount">Тиражей <input id="csDrawCount" type="tel" inputmode="numeric" pattern="[0-9]*" value="${count}" aria-label="Количество тиражей"></label>';
const newInput='<label class="csDrawCount">Тиражей <input id="csDrawCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${count}" aria-label="Количество тиражей"></label>';

if(!js.includes(oldInput))fail('не найдено текущее поле v4.1.30');
js=js.replace(oldInput,newInput);

/* 2. Blur when closing detail so IME cannot leak to another screen */
const oldClose="q('csDetailClose').onclick=()=>{box.classList.add('hidden');box.innerHTML=''};";
const newClose="q('csDetailClose').onclick=()=>{try{document.activeElement?.blur()}catch(e){}box.classList.add('hidden');box.innerHTML=''};";
if(!js.includes(oldClose))fail('не найден обработчик Закрыть');
js=js.replace(oldClose,newClose);

/* 3. Blur before app section navigation */
const oldSwitch="function switchSec(id){document.querySelectorAll('.section').forEach(s=>s.classList.toggle('on',s.id===id));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('on',b.dataset.sec===id));window.scrollTo({top:0,behavior:'smooth'})}";
const newSwitch="function switchSec(id){try{document.activeElement?.blur()}catch(e){}document.querySelectorAll('.section').forEach(s=>s.classList.toggle('on',s.id===id));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('on',b.dataset.sec===id));window.scrollTo({top:0,behavior:'smooth'})}";
if(!html.includes(oldSwitch))fail('не найден switchSec в index.html');
html=html.replace(oldSwitch,newSwitch);

js=js.replace("const EXT_VERSION='v4.1.30';","const EXT_VERSION='v4.1.31';");

if(!js.includes('id="csDrawCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off"'))fail('чистое numeric text поле не установлено');
if(js.includes('input.select()')||js.includes('setSelectionRange')||js.includes("input.focus({preventScroll:true})"))fail('focus/select эксперимент остался');
if(!js.includes("input.onchange=apply;"))fail('старый onchange потерян');
if(!js.includes("input.onkeydown=e=>{if(e.key==='Enter'"))fail('старый Enter потерян');
if(!html.includes("function switchSec(id){try{document.activeElement?.blur()}"))fail('blur на навигации не установлен');

fs.writeFileSync(SEARCH,js,'utf8');
fs.writeFileSync(INDEX,html,'utf8');
fs.writeFileSync(VERSION,JSON.stringify({version:'4.1.31'},null,2)+'\n','utf8');

console.log('COMBO INPUT FINAL FIX PASS · v4.1.31');
