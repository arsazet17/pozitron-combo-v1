'use strict';

const fs=require('fs');
const SEARCH='combo-search-v1.js';
const VERSION='app-version.json';

function fail(msg){throw new Error('COMBO DRAW COUNT INPUT FAIL: '+msg);}

let js=fs.readFileSync(SEARCH,'utf8');

if(!js.includes("const EXT_VERSION='v4.1.26';")){
  fail('ожидалась текущая версия v4.1.26');
}

const oldInput = '<label class="csDrawCount">Тиражей <input id="csDrawCount" type="number" min="${DETAIL_MIN_DRAWS}" step="1" inputmode="numeric" value="${count}" aria-label="Количество тиражей"></label>';
const newInput = '<label class="csDrawCount">Тиражей <input id="csDrawCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" value="${count}" aria-label="Количество тиражей"></label>';

if(!js.includes(oldInput)){
  fail('не найдено текущее поле csDrawCount');
}
js=js.replace(oldInput,newInput);

const oldHandlers = `      const input=q('csDrawCount');
      const apply=()=>{let v=Math.floor(Number(input.value));if(!Number.isFinite(v)||v<DETAIL_MIN_DRAWS)v=DETAIL_MIN_DRAWS;count=v;detailDrawCounts.set(key,v);render()};
      input.onchange=apply;
      input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();apply()}};`;

const newHandlers = `      const input=q('csDrawCount');
      const normalize=()=>{
        const digits=String(input.value||'').replace(/\\D+/g,'');
        if(input.value!==digits)input.value=digits;
      };
      const apply=()=>{
        normalize();
        let v=Math.floor(Number(input.value));
        if(!Number.isFinite(v)||v<DETAIL_MIN_DRAWS)v=DETAIL_MIN_DRAWS;
        count=v;
        detailDrawCounts.set(key,v);
        input.value=String(v);
        render();
      };
      input.addEventListener('input',normalize);
      input.addEventListener('focus',()=>{
        try{
          requestAnimationFrame(()=>input.select());
        }catch(e){}
      });
      input.addEventListener('click',()=>{
        try{input.focus({preventScroll:true})}catch(e){input.focus()}
      });
      input.addEventListener('blur',apply);
      input.addEventListener('keydown',e=>{
        if(e.key==='Enter'){
          e.preventDefault();
          try{input.blur()}catch(_){apply()}
        }
      });`;

if(!js.includes(oldHandlers)){
  fail('не найдены текущие обработчики csDrawCount');
}
js=js.replace(oldHandlers,newHandlers);

js=js.replace("const EXT_VERSION='v4.1.26';","const EXT_VERSION='v4.1.27';");

if(!js.includes('type="text" inputmode="numeric" pattern="[0-9]*"')) fail('мобильное поле не установлено');
if(!js.includes("input.addEventListener('input',normalize)")) fail('нормализация ввода не установлена');
if(!js.includes("requestAnimationFrame(()=>input.select())")) fail('автовыделение значения не установлено');
if(!js.includes("input.addEventListener('blur',apply)")) fail('применение по blur не установлено');

fs.writeFileSync(SEARCH,js,'utf8');
fs.writeFileSync(VERSION,JSON.stringify({version:'4.1.27'},null,2)+'\n','utf8');

console.log('COMBO DRAW COUNT INPUT PASS · v4.1.27');
