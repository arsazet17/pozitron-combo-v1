'use strict';
const fs=require('fs');

function rep(text,oldText,newText,label){
  if(!text.includes(oldText)) throw new Error('Не найден: '+label);
  return text.replace(oldText,newText);
}

let s=fs.readFileSync('stoloto-combo-update-v1.mjs','utf8');

if(!s.includes('function parseColumn(text)')){
  s=rep(
    s,
`function parseTime(t){const m=String(t).match(/\b([01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/);return m?normalizeTime(m[0]):null}
function findDateLabel(text){`,
`function parseTime(t){const m=String(t).match(/\b([01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/);return m?normalizeTime(m[0]):null}
function parseColumn(text){
  const m=norm(text).match(/столбец\s*([1-9]|10)\b/i);
  return m?Number(m[1]):null;
}
function findDateLabel(text){`,
    'parseColumn'
  );
}

s=rep(
  s,
`    const time=parseTime(text);if(!time)continue;
    const date=normalizeDateLabel(local||carry);if(!date)continue;
    let balls=(row.buttons||[]).map(x=>Number(norm(x))).filter(n=>Number.isInteger(n)&&n>=1&&n<=80);`,
`    const time=parseTime(text);if(!time)continue;
    const column=parseColumn(text);
    if(!column)throw new Error(\`FAIL: №\${draw}: Столото не отдал «Столбец N»\`);
    const date=normalizeDateLabel(local||carry);if(!date)continue;
    let balls=(row.buttons||[]).map(x=>Number(norm(x))).filter(n=>Number.isInteger(n)&&n>=1&&n<=80);`,
  'parseRows'
);

s=rep(s,`    out.push({draw,date,time,balls});`,`    out.push({draw,date,time,column,balls});`,'save column');

s=rep(
  s,
`function canon(d){return JSON.stringify({draw:d.draw,date:d.date,time:d.time,balls:d.balls})}`,
`function canon(d){return JSON.stringify({draw:d.draw,date:d.date,time:d.time,column:d.column,balls:d.balls})}
function canonCore(d){return JSON.stringify({draw:d.draw,date:d.date,time:d.time,balls:d.balls})}`,
  'canon'
);

s=rep(
  s,
`  return {
    draw:Number(d?.draw??d?.number??d?.id),
    date:norm(d?.date),
    time:normalizeTime(d?.time),
    balls:Array.isArray(d?.balls)?d.balls.map(Number):Array.isArray(d?.numbers)?d.numbers.map(Number):[]
  };`,
`  return {
    draw:Number(d?.draw??d?.number??d?.id),
    date:norm(d?.date),
    time:normalizeTime(d?.time),
    column:Number(d?.column)||null,
    balls:Array.isArray(d?.balls)?d.balls.map(Number):Array.isArray(d?.numbers)?d.numbers.map(Number):[]
  };`,
  'normalizeHistory'
);

s=rep(
  s,
`  if(anchor){
    if(canon(anchor)!==canon(last))throw new Error(\`FAIL: anchor №\${last.draw} не совпал со Столото\`);
  }else if(oldest.draw!==last.draw+1){`,
`  if(anchor){
    if(canonCore(anchor)!==canonCore(last))throw new Error(\`FAIL: anchor №\${last.draw} не совпал со Столото\`);
  }else if(oldest.draw!==last.draw+1){`,
  'anchor'
);

s=rep(
  s,
`  let merged=historyRaw;
  if(fresh.length){
    const source='Официальный Столото · OAuth · tail10 · тройная проверка';
    const additions=fresh.map(d=>({...d,source}));
    merged=[...historyRaw,...additions].sort((a,b)=>Number(a.draw??a.number??a.id)-Number(b.draw??b.number??b.id));
    await fs.writeFile(HISTORY_FILE,JSON.stringify(merged)+'\\n');
  }

  const finalLast=merged.at(-1);`,
`  const source='Официальный Столото · OAuth · tail10 · тройная проверка';
  const officialMap=new Map(stoloto.map(d=>[Number(d.draw),d]));
  const mergedMap=new Map();

  for(const old of historyRaw){
    const id=Number(old?.draw??old?.number??old?.id);
    const official=officialMap.get(id);
    if(official){
      mergedMap.set(id,{
        ...old,
        draw:official.draw,
        date:official.date,
        time:official.time,
        balls:official.balls,
        column:official.column,
        source
      });
    }else{
      mergedMap.set(id,old);
    }
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

  const finalLast=merged.at(-1);`,
  'merge tail10'
);

fs.writeFileSync('stoloto-combo-update-v1.mjs',s,'utf8');

let h=fs.readFileSync('index.html','utf8');
h=h.replace(/Версия v4\.1\.\d+/g,'Версия v4.1.15');

h=rep(
  h,
` return Number.isFinite(draw)&&balls.length===20&&balls.every(n=>n>=1&&n<=80)?{draw,date,time,balls}:null;`,
` const officialColumn=Number(o.column??o.winnerColumn??o.columnNumber);
 return Number.isFinite(draw)&&balls.length===20&&balls.every(n=>n>=1&&n<=80)
   ? {draw,date,time,balls,column:(Number.isInteger(officialColumn)&&officialColumn>=1&&officialColumn<=10)?officialColumn:null}
   : null;`,
  'valid official column'
);

h=h.replace(
/function drawColumn\(d\)\{const cnt=Array\(10\)\.fill\(0\);for\(const n of d\.balls\)cnt\[\(n-1\)%10\]\+\+;const mx=Math\.max\(\.\.\.cnt\), tied=new Set\(cnt\.map\(\(c,i\)=>c===mx\?i\+1:null\)\.filter\(Boolean\)\);for\(const n of d\.balls\)\{const c=\(\(n-1\)%10\)\+1;if\(tied\.has\(c\)\)return c\}return 1\}/,
`function drawColumn(d){
 const c=Number(d?.column);
 return Number.isInteger(c)&&c>=1&&c<=10?c:null;
}`
);
if(!h.includes('const c=Number(d?.column);')) throw new Error('drawColumn replace failed');

h=rep(
  h,
`function comboDrawGroupDetails(draw){
 const idx=DRAWS.findIndex(x=>Number(x.draw)===Number(draw?.draw)),winner=drawColumn(draw),prev=idx>0?DRAWS[idx-1]:null;
 if(!prev||!winner)return{winner:winner||'—',group:'—',columns:[],numbers:[]};
 const counts=comboColumnCounts(prev),raw=counts[winner]||0,columns=[];
 for(let col=1;col<=10;col++){const v=counts[col]||0;if(raw>=4?v>=4:v===raw)columns.push(col)}
 const numbers=(prev.balls||[]).map(Number).filter(n=>comboColOf(n)===winner);
 return{winner,group:comboGroupLabel(raw),columns,numbers};
}`,
`function comboDrawGroupDetails(draw){
 const idx=DRAWS.findIndex(x=>Number(x.draw)===Number(draw?.draw));
 const winner=drawColumn(draw);
 const prev=idx>0?DRAWS[idx-1]:null;
 if(!prev||!winner)return{winner:winner||'—',group:'—',columns:[],numbers:[]};

 const counts=comboColumnCounts(prev);
 const raw=counts[winner]||0;
 const group=comboGroupLabel(raw);
 const columns=[];

 for(let col=1;col<=10;col++){
   const v=counts[col]||0;
   if(raw>=4?v>=4:v===raw)columns.push(col);
 }

 const numbers=(prev.balls||[]).map(Number).filter(n=>comboColOf(n)===winner);
 return{winner,group,columns,numbers};
}`,
  'group law'
);

h=h.replace(
`<div class="hsub">Столб ${drawColumn(d)}</div>`,
`<div class="hsub">Столб ${drawColumn(d)??'—'}</div>`
);

h=h.replace(
`<div class="rdCols">В этой группе были: '+(x.columns.length?x.columns.map(c=>'ст'+c).join(' · '):'—')+'</div>`,
`<div class="rdCols">В группе '+x.group+' были: '+(x.columns.length?x.columns.map(c=>'ст'+c).join(' · '):'—')+'</div>`
);

fs.writeFileSync('index.html',h,'utf8');
fs.writeFileSync('app-version.json',JSON.stringify({version:'4.1.15'},null,2)+'\n','utf8');

console.log('PASS COMBO v4.1.15');
