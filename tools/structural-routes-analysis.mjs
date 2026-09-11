import fs from 'node:fs/promises';

const raw=JSON.parse(await fs.readFile('combo-history-v1.json','utf8'));
const draws=(Array.isArray(raw)?raw:(raw.draws||[]))
  .map(d=>({draw:Number(d.draw??d.number??d.id),balls:(d.balls||d.numbers||[]).map(Number)}))
  .filter(d=>Number.isInteger(d.draw)&&d.balls.length===20&&new Set(d.balls).size===20)
  .sort((a,b)=>a.draw-b.draw);
if(draws.length<1007) throw new Error('Not enough draws');
for(let i=1;i<draws.length;i++) if(draws[i].draw!==draws[i-1].draw+1) throw new Error(`Gap ${draws[i-1].draw}->${draws[i].draw}`);

function vector(balls,kind){
  const a=Array(9).fill(0);
  for(const n of balls){
    const k=kind==='COLUMN'?(n-1)%9:Math.floor((n-1)/9);
    if(k>=0&&k<9)a[k]++;
  }
  return a;
}
const C=draws.map(d=>vector(d.balls,'COLUMN'));
const L=draws.map(d=>vector(d.balls,'LEVEL'));
const sizes=[9,9,9,9,9,9,9,9,8];
const latest=draws.at(-1).draw;
const sourceEndIdx=draws.length-1-5;
const sourceStartIdx=sourceEndIdx-999;
if(sourceStartIdx<1) throw new Error('Need t-1');
const sourceIdx=Array.from({length:1000},(_,k)=>sourceStartIdx+k);
console.log(`RANGE sources ${draws[sourceStartIdx].draw}-${draws[sourceEndIdx].draw}; future through ${draws[sourceEndIdx+5].draw}; latest ${latest}`);

function logFact(n){let s=0;for(let i=2;i<=n;i++)s+=Math.log(i);return s}
const LF=Array.from({length:1001},(_,n)=>logFact(n));
function logChoose(n,k){if(k<0||k>n)return -Infinity;return LF[n]-LF[k]-LF[n-k]}
function fisherGreater(a,b,c,d){
  const r1=a+b,r2=c+d,c1=a+c,n=r1+r2;
  const max=Math.min(r1,c1), min=Math.max(0,c1-r2);
  let p=0;
  for(let x=a;x<=max;x++) p+=Math.exp(logChoose(c1,x)+logChoose(n-c1,r1-x)-logChoose(n,r1));
  return Math.min(1,p);
}
function bh(items){
  const sorted=[...items].sort((a,b)=>a.p-b.p);let prev=1;
  for(let i=sorted.length-1;i>=0;i--){const q=Math.min(prev,sorted[i].p*sorted.length/(i+1));sorted[i].q=q;prev=q;}
}
function fmt(x,n=3){return Number.isFinite(x)?Number(x.toFixed(n)):null}

function analyze(kind,mat){
  const routes=[];
  const self=[];
  for(const lag of [1,2,5]){
    const baseGain=Array(9).fill(0);
    for(const t of sourceIdx) for(let j=0;j<9;j++) if(mat[t+lag][j]>mat[t][j])baseGain[j]++;
    for(let i=0;i<9;i++) for(let j=0;j<9;j++){
      let n=0,hits=0,delta=0;let a=0,b=0,c=0,d=0;
      const blocks=[];
      for(let block=0;block<4;block++){
        let bn=0,bh=0,bbn=0,bbh=0;
        const lo=block*250,hi=lo+250;
        for(let k=lo;k<hi;k++){
          const t=sourceIdx[k];
          const weak=mat[t][i]<mat[t-1][i];
          const gain=mat[t+lag][j]>mat[t][j];
          if(gain)bbh++;bbn++;
          if(weak){bn++;if(gain)bh++;}
        }
        const cond=bn?bh/bn:NaN,base=bbn?bbh/bbn:NaN;
        blocks.push({n:bn,cond:fmt(cond,4),base:fmt(base,4),lift:fmt(cond/base,3)});
      }
      for(const t of sourceIdx){
        const weak=mat[t][i]<mat[t-1][i];
        const gain=mat[t+lag][j]>mat[t][j];
        if(weak){n++;if(gain)hits++;delta+=(mat[t+lag][j]-mat[t][j])/sizes[j];}
        if(weak&&gain)a++; else if(weak&&!gain)b++; else if(!weak&&gain)c++; else d++;
      }
      const cond=hits/n,base=baseGain[j]/sourceIdx.length,lift=cond/base;
      const rec={kind,from:i+1,to:j+1,lag,n,hits,cond:fmt(cond,4),base:fmt(base,4),lift:fmt(lift,3),meanDeltaDensity:fmt(delta/n,4),p:fisherGreater(a,b,c,d),blocks,blocksAbove1:blocks.filter(x=>x.lift>1).length};
      (i===j?self:routes).push(rec);
    }
  }
  bh(routes);
  bh(self);
  for(const r of [...routes,...self]){r.p=fmt(r.p,6);r.q=fmt(r.q,6)}
  const eligible=routes.filter(r=>r.n>=50);
  const top=[...eligible].sort((a,b)=>b.lift-a.lift||b.blocksAbove1-a.blocksAbove1||b.n-a.n).slice(0,15);
  const stable=[...eligible].filter(r=>r.blocksAbove1>=3).sort((a,b)=>b.lift-a.lift).slice(0,15);
  const sig=[...eligible].filter(r=>r.q!==null&&r.q<0.05&&r.lift>1).sort((a,b)=>a.q-b.q);
  const selfTop=[...self].filter(r=>r.n>=50).sort((a,b)=>b.lift-a.lift).slice(0,9);
  return {top,stable,sig,selfTop};
}

for(const [kind,mat] of [['COLUMN',C],['LEVEL',L]]){
  const out=analyze(kind,mat);
  console.log(`\n=== ${kind} TOP CROSS ===`);
  console.log(JSON.stringify(out.top.slice(0,10),null,2));
  console.log(`\n=== ${kind} STABLE 3/4+ ===`);
  console.log(JSON.stringify(out.stable.slice(0,10),null,2));
  console.log(`\n=== ${kind} FDR<0.05 ===`);
  console.log(JSON.stringify(out.sig.slice(0,20),null,2));
  console.log(`\n=== ${kind} SELF REBOUND ===`);
  console.log(JSON.stringify(out.selfTop.slice(0,9),null,2));
}
