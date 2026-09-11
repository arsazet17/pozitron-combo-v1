import fs from 'node:fs/promises';
const raw=JSON.parse(await fs.readFile('combo-history-v1.json','utf8'));
const draws=(Array.isArray(raw)?raw:(raw.draws||[])).map(d=>({draw:+(d.draw??d.number??d.id),balls:(d.balls||d.numbers||[]).map(Number)})).filter(d=>Number.isInteger(d.draw)&&d.balls.length===20&&new Set(d.balls).size===20).sort((a,b)=>a.draw-b.draw);
function vec(balls,kind){const a=Array(9).fill(0);for(const n of balls)a[kind==='COLUMN'?(n-1)%9:Math.floor((n-1)/9)]++;return a}
const mats={COLUMN:draws.map(d=>vec(d.balls,'COLUMN')),LEVEL:draws.map(d=>vec(d.balls,'LEVEL'))};
const end=draws.length-1-5,start=end-999,idx=Array.from({length:1000},(_,k)=>start+k);
console.log(`MATCHED RANGE ${draws[start].draw}-${draws[end].draw}; future ${draws[end+5].draw}`);
function f(x,n=3){return +x.toFixed(n)}
for(const [kind,M] of Object.entries(mats)){
 const cross=[],self=[];
 for(const lag of [1,2,5]){
  for(let i=0;i<9;i++)for(let j=0;j<9;j++){
   const byCount=new Map();
   for(const t of idx){const c=M[t][j],g=M[t+lag][j]>M[t][j];const z=byCount.get(c)||[0,0];z[0]++;if(g)z[1]++;byCount.set(c,z)}
   let n=0,h=0,exp=0;
   const block=[];
   for(let b=0;b<4;b++){
    let bn=0,bh=0,bexp=0;
    for(let k=b*250;k<(b+1)*250;k++){const t=idx[k];if(M[t][i]>=M[t-1][i])continue;const c=M[t][j],g=M[t+lag][j]>M[t][j];const z=byCount.get(c);bn++;if(g)bh++;bexp+=z[1]/z[0];}
    block.push({n:bn,cond:f(bh/bn,4),matched:f(bexp/bn,4),lift:f((bh/bn)/(bexp/bn),3)});
   }
   for(const t of idx){if(M[t][i]>=M[t-1][i])continue;const c=M[t][j],g=M[t+lag][j]>M[t][j],z=byCount.get(c);n++;if(g)h++;exp+=z[1]/z[0];}
   const r={from:i+1,to:j+1,lag,n,cond:f(h/n,4),matched:f(exp/n,4),lift:f((h/n)/(exp/n),3),blocksAbove1:block.filter(x=>x.lift>1).length,block};
   (i===j?self:cross).push(r);
  }
 }
 cross.sort((a,b)=>b.lift-a.lift||b.blocksAbove1-a.blocksAbove1);
 self.sort((a,b)=>b.lift-a.lift);
 console.log(`=== ${kind} MATCHED TOP CROSS ===`);console.log(JSON.stringify(cross.slice(0,10),null,2));
 console.log(`=== ${kind} MATCHED SELF ===`);console.log(JSON.stringify(self.slice(0,10),null,2));
}
