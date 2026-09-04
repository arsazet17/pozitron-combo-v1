'use strict';

const fs=require('fs');
const SEARCH='combo-search-v1.js';
const VERSION='app-version.json';

function fail(msg){throw new Error('COMBO DRAW COUNT ROLLBACK FAIL: '+msg);}

let js=fs.readFileSync(SEARCH,'utf8');

if(!js.includes("const EXT_VERSION='v4.1.28';")){
  fail('ожидалась текущая версия v4.1.28');
}

const currentInput = '<label class="csDrawCount">Тиражей <input id="csDrawCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" value="${count}" aria-label="Количество тиражей"></label>';
const originalInput = '<label class="csDrawCount">Тиражей <input id="csDrawCount" type="number" min="${DETAIL_MIN_DRAWS}" step="1" inputmode="numeric" value="${count}" aria-label="Количество тиражей"></label>';

if(!js.includes(currentInput)) fail('не найдено текущее поле v4.1.28');
js=js.replace(currentInput,originalInput);

const currentHandlers = `      const input=q('csDrawCount');
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
          const len=String(input.value||'').length;
          requestAnimationFrame(()=>input.setSelectionRange(len,len));
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

const originalHandlers = `      const input=q('csDrawCount');
      const apply=()=>{let v=Math.floor(Number(input.value));if(!Number.isFinite(v)||v<DETAIL_MIN_DRAWS)v=DETAIL_MIN_DRAWS;count=v;detailDrawCounts.set(key,v);render()};
      input.onchange=apply;
      input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();apply()}};`;

if(!js.includes(currentHandlers)) fail('не найден текущий обработчик v4.1.28');
js=js.replace(currentHandlers,originalHandlers);

js=js.replace("const EXT_VERSION='v4.1.28';","const EXT_VERSION='v4.1.29';");

if(js.includes("setSelectionRange")) fail('setSelectionRange остался');
if(js.includes("input.focus({preventScroll:true})")) fail('программный focus остался');
if(js.includes("const normalize=()=>")) fail('normalize остался');
if(!js.includes('type="number" min="${DETAIL_MIN_DRAWS}" step="1" inputmode="numeric"')) fail('оригинальное поле не восстановлено');
if(!js.includes("input.onchange=apply;")) fail('оригинальный onchange не восстановлен');

fs.writeFileSync(SEARCH,js,'utf8');
fs.writeFileSync(VERSION,JSON.stringify({version:'4.1.29'},null,2)+'\n','utf8');

console.log('COMBO DRAW COUNT ROLLBACK PASS · v4.1.29');
