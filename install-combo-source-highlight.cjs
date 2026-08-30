'use strict';

const fs = require('fs');

let h = fs.readFileSync('index.html', 'utf8');

function rep(oldText, newText, label) {
  if (!h.includes(oldText)) throw new Error('Не найден фрагмент: ' + label);
  h = h.replace(oldText, newText);
}

// Версия.
h = h.replace(/Версия v4\.1\.\d+/g, 'Версия v4.1.14');

// CSS подсветки.
rep(
  ".recentDrawNums{font-size:11px;color:#d9e6f2;margin-top:4px;line-height:1.35}",
  ".recentDrawNums{font-size:11px;color:#d9e6f2;margin-top:4px;line-height:1.65}.recentDrawNum{display:inline-block;padding:1px 3px;border-radius:5px;margin:0 1px}.recentDrawNum.sourceOn{background:linear-gradient(180deg,#54c95a,#258a37);color:#fff;font-weight:950;box-shadow:0 0 0 1px #8df49b inset,0 0 7px rgba(75,220,100,.45)}",
  'source highlight CSS'
);

// Логика подсветки источника.
rep(
  "function comboDrawDetailsHTML(draw){\n const x=comboDrawGroupDetails(draw);\n return '<div class=\"recentDrawDetails\"><div class=\"rdMain\"><span>Столб: '+x.winner+'</span><span>Группа: '+x.group+'</span></div><div>Вышел из группы: <b>'+x.group+'</b></div><div class=\"rdCols\">В этой группе были: '+(x.columns.length?x.columns.map(c=>'ст'+c).join(' · '):'—')+'</div><div class=\"rdNums\">Числа победившего столба: '+(x.numbers.length?x.numbers.map(fmt).join(' · '):'—')+'</div></div>';\n}\nconst TABLE_DRAW_COLORS=['c1','c2','c3','c4','c5'];",
  `function comboDrawDetailsHTML(draw){
 const x=comboDrawGroupDetails(draw);
 return '<div class="recentDrawDetails"><div class="rdMain"><span>Столб: '+x.winner+'</span><span>Группа: '+x.group+'</span></div><div>Вышел из группы: <b>'+x.group+'</b></div><div class="rdCols">В этой группе были: '+(x.columns.length?x.columns.map(c=>'ст'+c).join(' · '):'—')+'</div><div class="rdNums">В предыдущем тираже в ст'+x.winner+' было: '+(x.numbers.length?x.numbers.map(fmt).join(' · '):'—')+'</div></div>';
}
function comboSourceHighlightSetForDraw(draw){
 const out=new Set();
 const drawId=Number(draw?.draw);
 for(const activeId of tableActiveDrawIds){
   const idx=DRAWS.findIndex(x=>Number(x.draw)===Number(activeId));
   if(idx<=0) continue;
   const current=DRAWS[idx];
   const prev=DRAWS[idx-1];
   if(Number(prev.draw)!==drawId) continue;
   const info=comboDrawGroupDetails(current);
   info.numbers.forEach(n=>out.add(Number(n)));
 }
 return out;
}
function comboRecentNumbersHTML(draw){
 const source=comboSourceHighlightSetForDraw(draw);
 return (draw.balls||[]).map(n=>'<span class="recentDrawNum '+(source.has(Number(n))?'sourceOn':'')+'">'+fmt(n)+'</span>').join(' ');
}
const TABLE_DRAW_COLORS=['c1','c2','c3','c4','c5'];`,
  'source highlight logic'
);

// Важно: здесь используем обычные строки, чтобы ${...} не вычислялись в установщике.
const oldCard = '<div class="recentDrawTop"><span>№${d.draw}</span><span>${d.date} ${d.time}</span></div><div class="recentDrawNums">${d.balls.map(fmt).join(\' \')}</div>${comboDrawDetailsHTML(d)}</button>';
const newCard = '<div class="recentDrawTop"><span>№${d.draw}</span><span>${d.date} ${d.time}</span></div><div class="recentDrawNums">${comboRecentNumbersHTML(d)}</div>${comboDrawDetailsHTML(d)}</button>';

rep(oldCard, newCard, 'recent card numbers');

fs.writeFileSync('index.html', h, 'utf8');

let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const CACHE='[^']+';/, "const CACHE='combo-keno-shell-v19-source-highlight';");
fs.writeFileSync('sw.js', sw, 'utf8');

console.log('PASS COMBO v4.1.14 source highlight');
