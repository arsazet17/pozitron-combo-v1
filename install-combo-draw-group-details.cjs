'use strict';
const fs=require('fs');
let h=fs.readFileSync('index.html','utf8');
function rep(a,b,n){if(!h.includes(a))throw new Error('missing '+n);h=h.replace(a,b)}
h=h.replace(/Версия v4\.1\.\d+/g,'Версия v4.1.13');
rep(".recentDrawNums{font-size:11px;color:#d9e6f2;margin-top:4px;line-height:1.35}",
".recentDrawNums{font-size:11px;color:#d9e6f2;margin-top:4px;line-height:1.35}.recentDrawDetails{margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.16);font-size:11px;line-height:1.45;text-align:left}.recentDrawDetails .rdMain{display:flex;gap:9px;flex-wrap:wrap;font-weight:950}.recentDrawDetails .rdCols{margin-top:2px;color:#b8f4ca}.recentDrawDetails .rdNums{margin-top:2px;color:#ffe28a;font-weight:900}",'css');
rep("function getDrawById(id){return DRAWS.find(d=>d.draw===Number(id))}\nconst TABLE_DRAW_COLORS=['c1','c2','c3','c4','c5'];",
`function getDrawById(id){return DRAWS.find(d=>d.draw===Number(id))}
function comboColOf(n){return ((Number(n)-1)%10)+1}
function comboColumnCounts(draw){const out=Array(11).fill(0);(draw?.balls||[]).forEach(n=>out[comboColOf(n)]++);return out}
function comboGroupLabel(count){return count>=4?'4+':String(count)}
function comboDrawGroupDetails(draw){
 const idx=DRAWS.findIndex(x=>Number(x.draw)===Number(draw?.draw)),winner=drawColumn(draw),prev=idx>0?DRAWS[idx-1]:null;
 if(!prev||!winner)return{winner:winner||'—',group:'—',columns:[],numbers:[]};
 const counts=comboColumnCounts(prev),raw=counts[winner]||0,columns=[];
 for(let col=1;col<=10;col++){const v=counts[col]||0;if(raw>=4?v>=4:v===raw)columns.push(col)}
 const numbers=(prev.balls||[]).map(Number).filter(n=>comboColOf(n)===winner);
 return{winner,group:comboGroupLabel(raw),columns,numbers};
}
function comboDrawDetailsHTML(draw){
 const x=comboDrawGroupDetails(draw);
 return '<div class="recentDrawDetails"><div class="rdMain"><span>Столб: '+x.winner+'</span><span>Группа: '+x.group+'</span></div><div>Вышел из группы: <b>'+x.group+'</b></div><div class="rdCols">В этой группе были: '+(x.columns.length?x.columns.map(c=>'ст'+c).join(' · '):'—')+'</div><div class="rdNums">Числа победившего столба: '+(x.numbers.length?x.numbers.map(fmt).join(' · '):'—')+'</div></div>';
}
const TABLE_DRAW_COLORS=['c1','c2','c3','c4','c5'];`,'logic');
rep(`<div class="recentDrawTop"><span>№\${d.draw}</span><span>\${d.date} \${d.time}</span></div><div class="recentDrawNums">\${d.balls.map(fmt).join(' ')}</div></button>`,
`<div class="recentDrawTop"><span>№\${d.draw}</span><span>\${d.date} \${d.time}</span></div><div class="recentDrawNums">\${d.balls.map(fmt).join(' ')}</div>\${comboDrawDetailsHTML(d)}</button>`,'card');
fs.writeFileSync('index.html',h);
let sw=fs.readFileSync('sw.js','utf8').replace(/const CACHE='[^']+';/,"const CACHE='combo-keno-shell-v18-group-details';");
fs.writeFileSync('sw.js',sw);
console.log('PASS');
