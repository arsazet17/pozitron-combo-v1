'use strict';
const fs=require('fs');
const SEARCH='combo-search-v1.js';
const VERSION='app-version.json';
function fail(m){throw new Error('COMBO WIN STATS FAIL: '+m)}
let js=fs.readFileSync(SEARCH,'utf8');

if(!js.includes("const EXT_VERSION='v4.1.25';"))fail('ожидалась v4.1.25');

const cssOld=".csDetailHead b{font-size:15px}.csClose{margin-left:auto;padding:6px 9px;background:#281520;border-color:#6d3343;color:#ffd2d7;font-size:10px}";
const cssNew=cssOld+".csWinStats{width:100%;display:grid;gap:2px;margin-top:2px;font-size:11px;line-height:1.35;color:#c8d7e5}.csWinStats b{font-size:inherit;color:#fff}.csWinBreakdown{color:#9fb2c4;font-size:10px;white-space:normal}";
if(!js.includes(cssOld))fail('нет CSS-якоря');
js=js.replace(cssOld,cssNew);

const oldFn=`  function detailHitCell(h,k){
    const prize=prizeFor(k,h);
    const cls=prize?'fire':h===0?'z':h>=2?'h':'o';
    return \`<div class="hitbox"><div class="hits \${cls}">\${prize?'🔥 ':''}\${h}</div>\${prize?\`<div class="prize">Сумма<br>\${prize.toLocaleString('ru-RU')} ₽</div>\`:''}</div>\`;
  }
`;

const newFn=oldFn+`
  function winningStats(nums,draws){
    const k=nums.length;
    const byHits=new Map();
    let winning=0,totalPrize=0;
    for(const d of draws){
      let h=0;
      for(const n of nums)if(d.balls.includes(n))h++;
      const prize=prizeFor(k,h);
      if(prize>0){
        winning++;
        totalPrize+=prize;
        byHits.set(h,(byHits.get(h)||0)+1);
      }
    }
    const levels=[];
    for(let h=0;h<=k;h++){
      if(prizeFor(k,h)>0)levels.push(\`\${h}/\${k}: \${byHits.get(h)||0}\`);
    }
    return{winning,totalPrize,levels};
  }
`;
if(!js.includes(oldFn))fail('нет detailHitCell');
js=js.replace(oldFn,newFn);

const oldBlock=`      const detailStats=trajectory(row.nums,[...visible].sort((a,b)=>a.draw-b.draw));
      box.classList.remove('hidden');
      box.innerHTML=\`<div class="csDetailHead"><b>\${row.nums.map(f2).join(' ')}</b><span class="muted">🔥 полностью \${detailStats.full} · Σ \${detailStats.sum} · с попаданием \${detailStats.withHit}/\${visible.length}</span><button id="csDetailClose" class="csClose" type="button">✕ Закрыть</button></div><div class="csDetailTools">`;

const newBlock=`      const detailStats=trajectory(row.nums,[...visible].sort((a,b)=>a.draw-b.draw));
      const winStats=winningStats(row.nums,visible);
      box.classList.remove('hidden');
      box.innerHTML=\`<div class="csDetailHead"><b>\${row.nums.map(f2).join(' ')}</b><button id="csDetailClose" class="csClose" type="button">✕ Закрыть</button><div class="csWinStats"><div>💰 Выигрышных: <b>\${winStats.winning} / \${visible.length}</b></div><div>🔥 Сумма выигрышей: <b>\${winStats.totalPrize.toLocaleString('ru-RU')} ₽</b></div><div class="csWinBreakdown">\${winStats.levels.join(' · ')||'Выигрышных уровней нет'}</div></div></div><div class="csDetailTools">`;

if(!js.includes(oldBlock))fail('не найдена старая статистика');
js=js.replace(oldBlock,newBlock);
js=js.replace("const EXT_VERSION='v4.1.25';","const EXT_VERSION='v4.1.26';");

fs.writeFileSync(SEARCH,js,'utf8');
fs.writeFileSync(VERSION,JSON.stringify({version:'4.1.26'},null,2)+'\n','utf8');
console.log('COMBO WIN STATS PASS · v4.1.26');
