'use strict';

const fs=require('fs');
const SEARCH='combo-search-v1.js';
const VERSION='app-version.json';

function fail(msg){throw new Error('COMBO DRAW COUNT FOCUS FIX FAIL: '+msg);}

let js=fs.readFileSync(SEARCH,'utf8');

if(!js.includes("const EXT_VERSION='v4.1.27';")){
  fail('ожидалась текущая версия v4.1.27');
}

const oldFocus = `      input.addEventListener('focus',()=>{
        try{
          requestAnimationFrame(()=>input.select());
        }catch(e){}
      });
      input.addEventListener('click',()=>{
        try{input.focus({preventScroll:true})}catch(e){input.focus()}
      });`;

const newFocus = `      input.addEventListener('focus',()=>{
        try{
          const len=String(input.value||'').length;
          requestAnimationFrame(()=>input.setSelectionRange(len,len));
        }catch(e){}
      });
      input.addEventListener('click',()=>{
        try{input.focus({preventScroll:true})}catch(e){input.focus()}
      });`;

if(!js.includes(oldFocus)){
  fail('не найден текущий focus/select блок');
}
js=js.replace(oldFocus,newFocus);

js=js.replace("const EXT_VERSION='v4.1.27';","const EXT_VERSION='v4.1.28';");

if(js.includes("requestAnimationFrame(()=>input.select())")) fail('старый select() остался');
if(!js.includes("input.setSelectionRange(len,len)")) fail('курсор в конец не установлен');

fs.writeFileSync(SEARCH,js,'utf8');
fs.writeFileSync(VERSION,JSON.stringify({version:'4.1.28'},null,2)+'\n','utf8');

console.log('COMBO DRAW COUNT FOCUS FIX PASS · v4.1.28');
