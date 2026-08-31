'use strict';

const fs = require('fs');

function must(cond, msg){
  if(!cond) throw new Error(msg);
}

function replaceOnceRegex(text, regex, replacement, label, alreadyOk){
  if(alreadyOk && alreadyOk(text)) return text;
  const next=text.replace(regex,replacement);
  if(next===text) throw new Error('Не найдена точка установки: '+label);
  return next;
}

function replaceBetween(text,startMarker,endMarker,replacement,label,alreadyOk){
  if(alreadyOk && alreadyOk(text)) return text;
  const a=text.indexOf(startMarker);
  const b=a>=0?text.indexOf(endMarker,a):-1;
  if(a<0||b<0) throw new Error('Не найдены границы: '+label);
  return text.slice(0,a)+replacement+text.slice(b+endMarker.length);
}

// ============================================================
// STOLOTO SYNC
// Официальный «Столбец N» — единственный источник победившего столба.
// ============================================================
let s=fs.readFileSync('stoloto-combo-update-v1.mjs','utf8');

s=replaceOnceRegex(
  s,
  /(function parseTime\(t\)\{[^\n]+\}\n)/,
  `$1function parseColumn(text){const m=norm(text).match(/столбец\\s*([1-9]|10)\\b/i);return m?Number(m[1]):null}\n`,
  'parseColumn после parseTime',
  x=>x.includes('function parseColumn(text)')
);

s=replaceOnceRegex(
  s,
  /const time=parseTime\(text\);if\(!time\)continue;\n\s*const date=/,
  `const time=parseTime(text);if(!time)continue;\n    const column=parseColumn(text);if(!column)throw new Error(\`FAIL: №\${draw}: Столото не отдал «Столбец N»\`);\n    const date=`,
  'чтение официального column',
  x=>x.includes('const column=parseColumn(text);')
);

if(!s.includes('out.push({draw,date,time,column,balls});')){
  s=replaceOnceRegex(
    s,
    /out\.push\(\{draw,date,time,balls\}\);/,
    'out.push({draw,date,time,column,balls});',
    'сохранение column в parsed tail10'
  );
}

s=replaceOnceRegex(
  s,
  /(function canon\(d\)\{[^\n]+\}\n)/,
  `$1function canonOfficial(d){return JSON.stringify({draw:d.draw,date:d.date,time:d.time,column:d.column,balls:d.balls})}\n`,
  'canonOfficial',
  x=>x.includes('function canonOfficial(d)')
);

// Тройная проверка должна сравнивать также официальный столб.
s=s.replace(/reads\[0\]\.map\(canon\)/g,'reads[0].map(canonOfficial)');
s=s.replace(/reads\[i\]\.map\(canon\)/g,'reads[i].map(canonOfficial)');

must(
  s.includes('reads[0].map(canonOfficial)') && s.includes('reads[i].map(canonOfficial)'),
  'Не удалось переключить тройную проверку на canonOfficial'
);

// Последние 10 официальных тиражей не только добавляются,
// но и обновляют уже существующие записи official column.
const mergeBlock=`const source='Официальный Столото · OAuth · tail10 · тройная проверка';
  const officialMap=new Map(stoloto.map(d=>[Number(d.draw),d]));
  const mergedMap=new Map();

  for(const old of historyRaw){
    const id=Number(old?.draw??old?.number??old?.id);
    const official=officialMap.get(id);

    mergedMap.set(id, official ? {
      ...old,
      draw:official.draw,
      date:official.date,
      time:official.time,
      balls:official.balls,
      column:official.column,
      source
    } : old);
  }

  for(const official of stoloto){
    const id=Number(official.draw);
    if(!mergedMap.has(id)) mergedMap.set(id,{...official,source});
  }

  const merged=[...mergedMap.values()]
    .sort((a,b)=>Number(a.draw??a.number??a.id)-Number(b.draw??b.number??b.id));

  if(JSON.stringify(merged)!==JSON.stringify(historyRaw)){
    await fs.writeFile(HISTORY_FILE,JSON.stringify(merged)+'\\n');
  }

  const finalLast=merged.at(-1);`;

s=replaceBetween(
  s,
  'let merged=historyRaw;',
  '  const finalLast=merged.at(-1);',
  mergeBlock,
  'официальное обновление tail10',
  x=>x.includes('const officialMap=new Map(stoloto.map') && x.includes('column:official.column')
);

s=s.replace(
  /latestOfficial:\{draw:newest\.draw,date:newest\.date,time:newest\.time\}/,
  'latestOfficial:{draw:newest.draw,date:newest.date,time:newest.time,column:newest.column}'
);

fs.writeFileSync('stoloto-combo-update-v1.mjs',s,'utf8');

// ============================================================
// INDEX
// Приложение больше НИКОГДА не вычисляет победивший столб по 20 числам.
// ============================================================
let h=fs.readFileSync('index.html','utf8');

h=h.replace(/Версия v4\.1\.\d+/g,'Версия v4.1.15');

h=replaceOnceRegex(
  h,
  /function drawColumn\(d\)\{[^\n]+\}/,
`function drawColumn(d){
 const c=Number(d?.column);
 return Number.isInteger(c)&&c>=1&&c<=10?c:null;
}`,
  'drawColumn = только официальный column',
  x=>x.includes('const c=Number(d?.column);')
);

// В старых строках без official column показываем тире, а не вычисляем.
h=h.replace(
  '${drawColumn(d)}</div>',
  '${drawColumn(d)??\'—\'}</div>'
);

fs.writeFileSync('index.html',h,'utf8');
fs.writeFileSync('app-version.json',JSON.stringify({version:'4.1.15'},null,2)+'\n','utf8');

console.log('INSTALL PATCH PASS');
