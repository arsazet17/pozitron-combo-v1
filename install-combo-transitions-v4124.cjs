'use strict';

const fs=require('fs');
const SEARCH='combo-search-v1.js';
const VERSION='app-version.json';
function fail(m){throw new Error('COMBO TRANSITIONS INSTALL FAIL: '+m)}

let js=fs.readFileSync(SEARCH,'utf8');

if(!js.includes("function detailRow(d,nums)"))fail('не найдена detailRow(d,nums)');
if(!js.includes("⬆️ Возрастание</button>"))fail('не найдена кнопка Возрастание');
if(!js.includes("visible.map(d=>detailRow(d,row.nums))"))fail('не найден вывод detailRow');

if(!js.includes('csTransitionsBtn')){
  js=js.replace("const EXT_VERSION='v4.1.23';","const EXT_VERSION='v4.1.24';");

  js=js.replace(
    "      .csDetail{margin-top:10px}.csDetailTools{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.csDetailTools .historyTools{margin:0}.csDrawCount",
    "      .csDetail{margin-top:10px}.csDetailTools{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.csDetailTools .historyTools{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:1 1 260px}.csDetailTools .historyTools button{white-space:nowrap}.csDrawCount"
  );

  js=js.replace(
    "      .historyDismissBtn{padding:5px 8px!important;margin-left:3px;background:#281520!important;border-color:#6d3343!important;color:#ffd2d7!important;font-size:10px!important;border-radius:8px!important}",
    "      .historyDismissBtn{padding:5px 8px!important;margin-left:3px;background:#281520!important;border-color:#6d3343!important;color:#ffd2d7!important;font-size:10px!important;border-radius:8px!important}\\n      .csDetail .dn{position:relative;overflow:visible}.csDetail .dn.transition::after{content:'◆';position:absolute;right:-2px;top:-7px;color:#ff9800;font-size:8px;line-height:1;text-shadow:0 1px 2px #000;z-index:2}.csDetail .dn.hit.transition{box-shadow:0 0 0 1px #72e34d inset}"
  );

  const oldRow=`  function detailRow(d,nums){
    const balls=[...d.balls].sort((a,b)=>a-b);
    let h=0;for(const n of nums)if(d.balls.includes(n))h++;
    const col=Number.isInteger(Number(d.column))?Number(d.column):'—';
    return \`<div class="hrow"><div class="hcell"><div class="hdraw">\${d.draw}</div><div class="hsub">Столб \${col}</div><div class="hdate">\${d.date} \${d.time}</div></div><div class="hcell">\${detailHitCell(h,nums.length)}</div><div class="hcell drawnums">\${balls.map(n=>\`<span class="dn \${nums.includes(n)?'hit':''}">\${f2(n)}</span>\`).join('')}</div></div>\`;
  }`;

  const newRow=`  function transitionSetForDraw(d){
    const archive=(typeof DRAWS!=='undefined'&&Array.isArray(DRAWS)&&DRAWS.length)?DRAWS:state.draws;
    const idx=archive.findIndex(x=>Number(x.draw)===Number(d?.draw));
    if(idx<=0)return new Set();
    const prev=new Set((archive[idx-1]?.balls||[]).map(Number));
    return new Set((d?.balls||[]).map(Number).filter(n=>prev.has(Number(n))));
  }

  function detailRow(d,nums,showTransitions=false){
    const balls=[...d.balls].sort((a,b)=>a-b);
    const transitions=showTransitions?transitionSetForDraw(d):new Set();
    let h=0;for(const n of nums)if(d.balls.includes(n))h++;
    const col=Number.isInteger(Number(d.column))?Number(d.column):'—';
    return \`<div class="hrow"><div class="hcell"><div class="hdraw">\${d.draw}</div><div class="hsub">Столб \${col}</div><div class="hdate">\${d.date} \${d.time}</div></div><div class="hcell">\${detailHitCell(h,nums.length)}</div><div class="hcell drawnums">\${balls.map(n=>\`<span class="dn \${nums.includes(n)?'hit':''} \${transitions.has(Number(n))?'transition':''}">\${f2(n)}</span>\`).join('')}</div></div>\`;
  }`;

  if(!js.includes(oldRow))fail('не совпала исходная detailRow');
  js=js.replace(oldRow,newRow);

  js=js.replace(
    "    detailDrawCounts.set(key,count);\\n    const render=()=>{",
    "    detailDrawCounts.set(key,count);\\n    let showTransitions=false;\\n    const render=()=>{"
  );

  const oldButtons='<div class="csDetailTools"><div class="historyTools"><button type="button" class="active">⬆️ Возрастание</button></div><label class="csDrawCount">';
  const newButtons='<div class="csDetailTools"><div class="historyTools"><button type="button" class="active">⬆️ Возрастание</button><button id="csTransitionsBtn" type="button" class="${showTransitions?\'active\':\'\'}" aria-pressed="${showTransitions?\'true\':\'false\'}">🔸 Переходы</button></div><label class="csDrawCount">';
  if(!js.includes(oldButtons))fail('не совпала строка кнопки Возрастание');
  js=js.replace(oldButtons,newButtons);

  js=js.replace(
    "${visible.map(d=>detailRow(d,row.nums)).join('')}</div>`;",
    "${visible.map(d=>detailRow(d,row.nums,showTransitions)).join('')}</div>`;"
  );

  js=js.replace(
    "      q('csDetailClose').onclick=()=>{box.classList.add('hidden');box.innerHTML=''};\\n      const input=q('csDrawCount');",
    "      q('csDetailClose').onclick=()=>{box.classList.add('hidden');box.innerHTML=''};\\n      const transitionsBtn=q('csTransitionsBtn');\\n      if(transitionsBtn)transitionsBtn.onclick=()=>{showTransitions=!showTransitions;render()};\\n      const input=q('csDrawCount');"
  );

  if(!js.includes('transitionSetForDraw'))fail('нет расчёта переходов');
  if(!js.includes('detailRow(d,row.nums,showTransitions)'))fail('нет передачи showTransitions');
  fs.writeFileSync(SEARCH,js,'utf8');
}

fs.writeFileSync(VERSION,JSON.stringify({version:'4.1.24'},null,2)+'\\n','utf8');
console.log('COMBO TRANSITIONS INSTALL PASS · v4.1.24');
