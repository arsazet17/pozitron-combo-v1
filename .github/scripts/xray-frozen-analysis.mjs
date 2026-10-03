import fs from 'node:fs';

const input=process.argv[2]||'data/xray-runtime.json';
const output=process.argv[3]||'xray-frozen-analysis.json';
const runtime=JSON.parse(fs.readFileSync(input,'utf8'));
const raw=Array.isArray(runtime.history)?runtime.history:[];
const seen=new Set();
const history=[];
for(const e of raw){
  const id=Number(e?.targetDraw||e?.factDraw||0);
  if(id&&seen.has(id))continue;
  if(id)seen.add(id);
  history.push(e);
}

const pct=(n,d)=>d?+(100*n/d).toFixed(2):0;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const median=a=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2};
const quantile=(a,q)=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),p=(b.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p);return +(b[lo]+(b[hi]-b[lo])*(p-lo)).toFixed(3)};
const hitCount=e=>{
  if(Array.isArray(e?.forecast20Hits))return e.forecast20Hits.length;
  if(Array.isArray(e?.layerHits))return e.layerHits.length;
  const p=new Set((e?.predicted20||[]).map(Number));
  return (e?.factBalls||[]).map(Number).filter(n=>p.has(n)).length;
};
const comboCount=(e,key)=>{
  const legacy=key==='5A'?'combo5Hits':key==='7A'?'combo7Hits':null;
  const a=e?.['combo'+key+'Hits'];
  if(Array.isArray(a))return a.length;
  if(legacy&&Array.isArray(e?.[legacy]))return e[legacy].length;
  const nums=e?.['combo'+key]||(key==='5A'?e?.combo5:key==='7A'?e?.combo7:null)||[];
  const facts=new Set((e?.factBalls||[]).map(Number));
  return nums.map(Number).filter(n=>facts.has(n)).length;
};
function dist(values,max=20){const d=Array(max+1).fill(0);for(const x of values)if(Number.isInteger(x)&&x>=0&&x<=max)d[x]++;return Object.fromEntries(d.map((n,k)=>[k,{count:n,pct:pct(n,values.length)}]));}
function summarize(rows){
  const vals=rows.map(hitCount),n=vals.length,counts=dist(vals,20),mx=Math.max(...vals,0),mn=Math.min(...vals,0);
  const modes=[];let best=-1;for(const [k,v] of Object.entries(counts)){if(v.count>best){best=v.count;modes.length=0;modes.push(Number(k))}else if(v.count===best&&v.count>0)modes.push(Number(k))}
  const bestRecords=rows.filter(e=>hitCount(e)===mx).map(e=>({targetDraw:e.targetDraw??e.factDraw,targetDate:e.targetDate??e.factDate,targetTime:e.targetTime??e.factTime,sourceDraw:e.sourceDraw,engineVersion:e.engineVersion??e.version,hits:hitCount(e),hitNumbers:e.forecast20Hits??e.layerHits??[],predicted20:e.predicted20??[],factBalls:e.factBalls??[]}));
  let longestLow={length:0,start:null,end:null},cur={length:0,start:null,end:null};
  for(const e of [...rows].reverse()){
    if(hitCount(e)<=3){if(!cur.length)cur.start=e.targetDraw??e.factDraw;cur.length++;cur.end=e.targetDraw??e.factDraw;if(cur.length>longestLow.length)longestLow={...cur};}
    else cur={length:0,start:null,end:null};
  }
  return {n,min:mn,max:mx,mean:+mean(vals).toFixed(4),median:median(vals),q25:quantile(vals,.25),q75:quantile(vals,.75),mode:modes,perNumberHitRatePct:+(mean(vals)/20*100).toFixed(3),distribution:counts,exact2:counts[2],exact3:counts[3],twoOrThree:{count:(counts[2]?.count||0)+(counts[3]?.count||0),pct:pct((counts[2]?.count||0)+(counts[3]?.count||0),n)},le3:{count:vals.filter(x=>x<=3).length,pct:pct(vals.filter(x=>x<=3).length,n)},ge4:{count:vals.filter(x=>x>=4).length,pct:pct(vals.filter(x=>x>=4).length,n)},ge5:{count:vals.filter(x=>x>=5).length,pct:pct(vals.filter(x=>x>=5).length,n)},ge6:{count:vals.filter(x=>x>=6).length,pct:pct(vals.filter(x=>x>=6).length,n)},ge7:{count:vals.filter(x=>x>=7).length,pct:pct(vals.filter(x=>x>=7).length,n)},ge8:{count:vals.filter(x=>x>=8).length,pct:pct(vals.filter(x=>x>=8).length,n)},bestRecords,longestStreakLe3:longestLow};
}
function comboSummary(rows,key,size){const vals=rows.map(e=>comboCount(e,key));const d=dist(vals,size);return {n:vals.length,size,mean:+mean(vals).toFixed(4),median:median(vals),max:Math.max(...vals,0),perNumberHitRatePct:+(mean(vals)/size*100).toFixed(3),distribution:d,ge1:{count:vals.filter(x=>x>=1).length,pct:pct(vals.filter(x=>x>=1).length,vals.length)},ge2:{count:vals.filter(x=>x>=2).length,pct:pct(vals.filter(x=>x>=2).length,vals.length)},ge3:{count:vals.filter(x=>x>=3).length,pct:pct(vals.filter(x=>x>=3).length,vals.length)}}}
function logFact(n){let s=0;for(let i=2;i<=n;i++)s+=Math.log(i);return s}
const lf=Array.from({length:81},(_,n)=>logFact(n));
const logC=(n,k)=>k<0||k>n?-Infinity:lf[n]-lf[k]-lf[n-k];
const random=[];for(let k=0;k<=20;k++)random[k]=Math.exp(logC(20,k)+logC(60,20-k)-logC(80,20));
const randomDist=Object.fromEntries(random.map((p,k)=>[k,{prob:+p.toFixed(8),pct:+(p*100).toFixed(4)}]));
const randomTail=t=>+(100*random.slice(t).reduce((a,b)=>a+b,0)).toFixed(4);

const eligible=history.filter(e=>e?.statisticsEligible!==false);
const excluded=history.filter(e=>e?.statisticsEligible===false);
const windows={};for(const n of [100,300,500])windows['last'+n]=summarize(history.slice(0,n));
const engines={};for(const e of history){const k=e?.engineVersion??e?.version??'unknown';(engines[k]??=[]).push(e)}
for(const k of Object.keys(engines))engines[k]=summarize(engines[k]);
const byFrozenHits={};for(const e of history){const k=hitCount(e);const r=byFrozenHits[k]??={n:0,combo5A:[],combo5B:[],combo7A:[],combo7B:[]};r.n++;r.combo5A.push(comboCount(e,'5A'));r.combo5B.push(comboCount(e,'5B'));r.combo7A.push(comboCount(e,'7A'));r.combo7B.push(comboCount(e,'7B'));byFrozenHits[k]=r}
for(const [k,r] of Object.entries(byFrozenHits)){for(const b of ['combo5A','combo5B','combo7A','combo7B'])r[b]={mean:+mean(r[b]).toFixed(4),max:Math.max(...r[b],0)}}

const result={generatedAt:new Date().toISOString(),runtimeGeneration:runtime.generation??null,runtimeUpdatedAt:runtime.updatedAt??null,latestOfficial:runtime.latestOfficial??null,historyRawLength:raw.length,uniqueHistoryLength:history.length,eligibleLength:eligible.length,excludedLength:excluded.length,all:summarize(history),eligible:summarize(eligible),windows,engines,combos:{combo5A:comboSummary(history,'5A',5),combo5B:comboSummary(history,'5B',5),combo7A:comboSummary(history,'7A',7),combo7B:comboSummary(history,'7B',7)},byFrozenHits,random20of80:{meanHits:5,perNumberHitRatePct:25,distribution:randomDist,le3Pct:+(100*random.slice(0,4).reduce((a,b)=>a+b,0)).toFixed(4),ge4Pct:randomTail(4),ge5Pct:randomTail(5),ge6Pct:randomTail(6),ge7Pct:randomTail(7),ge8Pct:randomTail(8)}};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
