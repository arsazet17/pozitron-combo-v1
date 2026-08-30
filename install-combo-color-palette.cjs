'use strict';

const fs = require('fs');

const INDEX = 'index.html';
const SW = 'sw.js';

function mustReplace(text, oldText, newText, label) {
  if (!text.includes(oldText)) {
    throw new Error('Не найден фрагмент: ' + label);
  }
  return text.replace(oldText, newText);
}

let html = fs.readFileSync(INDEX, 'utf8');

// Версия приложения.
html = html.replace(/Версия v4\.1\.\d+/g, 'Версия v4.1.12');

// Добавляем состояние палитры.
html = mustReplace(
  html,
  "savedAnyCombos=[],tableManualSelected=[],tableActiveDrawIds=[],tableRecentWindow=0;",
  "savedAnyCombos=[],tableManualSelected=[],tableManualColors={},tablePaintColor='',tableActiveDrawIds=[],tableRecentWindow=0;",
  'state palette'
);

// Активная кнопка цвета.
html = mustReplace(
  html,
  ".tableLegend .lg{padding:5px 4px;border-radius:8px;text-align:center;font-size:10px;font-weight:900;color:#fff}",
  ".tableLegend .lg{padding:7px 4px;border-radius:8px;text-align:center;font-size:10px;font-weight:900;color:#fff;border-width:1px;border-style:solid;cursor:pointer;user-select:none;transition:transform .08s,box-shadow .12s,filter .12s}.tableLegend .lg:active{transform:scale(.96)}.tableLegend .lg.paintOn{box-shadow:0 0 0 3px #fff inset,0 0 0 2px rgba(255,255,255,.32);filter:brightness(1.16)}",
  'palette CSS'
);

// Храним ручной цвет каждого числа.
html = mustReplace(
  html,
  "for(const n of tableManualSelected) map.set(n,{manual:true,colors:[]});",
  "for(const n of tableManualSelected) map.set(n,{manual:true,manualColor:tableManualColors[n]||'',colors:[]});",
  'manual color map'
);

// Переключатель цвета + окраска числа.
html = mustReplace(
  html,
  `function toggleTableNumber(n){
  n=Number(n);
  if(!Number.isInteger(n)||n<1||n>80)return;
  if(tableManualSelected.includes(n)) tableManualSelected=tableManualSelected.filter(x=>x!==n);
  else tableManualSelected=[...tableManualSelected,n].sort((a,b)=>a-b);
  renderTableDrawer();
}`,
  `function toggleTablePaintColor(cls){
  if(!TABLE_DRAW_COLORS.includes(cls))return;
  tablePaintColor=tablePaintColor===cls?'':cls;
  renderTableDrawer();
}
function toggleTableNumber(n){
  n=Number(n);
  if(!Number.isInteger(n)||n<1||n>80)return;

  if(tablePaintColor){
    if(tableManualSelected.includes(n) && tableManualColors[n]===tablePaintColor){
      tableManualSelected=tableManualSelected.filter(x=>x!==n);
      delete tableManualColors[n];
    }else{
      if(!tableManualSelected.includes(n)){
        tableManualSelected=[...tableManualSelected,n].sort((a,b)=>a-b);
      }
      tableManualColors[n]=tablePaintColor;
    }
  }else{
    if(tableManualSelected.includes(n)){
      tableManualSelected=tableManualSelected.filter(x=>x!==n);
      delete tableManualColors[n];
    }else{
      tableManualSelected=[...tableManualSelected,n].sort((a,b)=>a-b);
      tableManualColors[n]='';
    }
  }
  renderTableDrawer();
}`,
  'palette behavior'
);

// Очистка теперь сбрасывает и цвета, и активную кисть.
html = mustReplace(
  html,
  "function clearTableAll(){tableManualSelected=[];tableActiveDrawIds=[];renderTableDrawer()}",
  "function clearTableAll(){tableManualSelected=[];tableManualColors={};tablePaintColor='';tableActiveDrawIds=[];renderTableDrawer()}",
  'clear palette'
);

// Верхняя легенда становится пятью активными кнопками.
html = mustReplace(
  html,
  `<div class="lg c1">1 зел</div>
    <div class="lg c2">2 жёлт</div>
    <div class="lg c3">3 красн</div>
    <div class="lg c4">4 голуб</div>
    <div class="lg c5">5 синий</div>`,
  `<button type="button" class="lg c1 \${tablePaintColor==='c1'?'paintOn':''}" data-paint="c1">1 зел</button>
    <button type="button" class="lg c2 \${tablePaintColor==='c2'?'paintOn':''}" data-paint="c2">2 жёлт</button>
    <button type="button" class="lg c3 \${tablePaintColor==='c3'?'paintOn':''}" data-paint="c3">3 красн</button>
    <button type="button" class="lg c4 \${tablePaintColor==='c4'?'paintOn':''}" data-paint="c4">4 голуб</button>
    <button type="button" class="lg c5 \${tablePaintColor==='c5'?'paintOn':''}" data-paint="c5">5 синий</button>`,
  'palette buttons'
);

// Ручной выбранный цвет имеет приоритет над цветами подключённых тиражей.
html = mustReplace(
  html,
  `if(meta){
      if(meta.colors.length>1) cls='overlap';
      else if(meta.colors.length===1) cls=meta.colors[0];
      else if(meta.manual) cls='manual';
    }`,
  `if(meta){
      if(meta.manualColor) cls=meta.manualColor;
      else if(meta.colors.length>1) cls='overlap';
      else if(meta.colors.length===1) cls=meta.colors[0];
      else if(meta.manual) cls='manual';
    }`,
  'manual paint priority'
);

// Обработчики кнопок цветов.
html = mustReplace(
  html,
  "box.querySelectorAll('[data-tcell]').forEach(b=>b.onclick=()=>toggleTableNumber(b.dataset.tcell));",
  "box.querySelectorAll('[data-paint]').forEach(b=>b.onclick=()=>toggleTablePaintColor(b.dataset.paint));\n  box.querySelectorAll('[data-tcell]').forEach(b=>b.onclick=()=>toggleTableNumber(b.dataset.tcell));",
  'palette handlers'
);

fs.writeFileSync(INDEX, html, 'utf8');
console.log('PASS index.html: COMBO v4.1.12 color palette');

// Обновляем Service Worker cache, чтобы телефон сразу получил новую оболочку.
let sw = fs.readFileSync(SW, 'utf8');
sw = sw.replace(/const CACHE='[^']+';/, "const CACHE='combo-keno-shell-v17-palette';");
fs.writeFileSync(SW, sw, 'utf8');
console.log('PASS sw.js: cache v17-palette');
