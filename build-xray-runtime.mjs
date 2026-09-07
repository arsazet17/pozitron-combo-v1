import * as tf from '@tensorflow/tfjs-node';
import fs from 'node:fs/promises';

const HISTORY_FILE='combo-history-v1.json';
const PAYOUT_FILE='keno-payouts-v1.json';
const RUNTIME_FILE='data/xray-runtime.json';
const MODEL_FILE='xray-ai-model/model.json';
const META_FILE='xray-ai-model/meta.json';
const WINDOW=5, RANGE=80;

const normDraw=d=>({
  draw:Number(d?.draw??d?.number??d?.id),
  date:String(d?.date||''),
  time:String(d?.time||''),
  column:Number(d?.column)||null,
  balls:(Array.isArray(d?.balls)?d.balls:Array.isArray(d?.numbers)?d.numbers:[])
    .map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=80)
});
const oneHot=d=>{const v=Array(RANGE).fill(0);for(const n of d.balls)v[n-1]=1;return v};
const topN=(p,n)=>Array.from({length:RANGE},(_,i)=>i+1)
  .sort((a,b)=>(p[b-1]-p[a-1])||(a-b)).slice(0,n);
const hitList=(pick,fact)=>{const s=new Set(fact);return pick.filter(n=>s.has(Number(n))).map(Number)};
const payout=(table,size,hits)=>Number(table?.combination?.[String(size)]?.[String(hits)]||0);

function trajectory(draws,n){return draws.slice(-WINDOW).map(d=>d.balls.includes(n)?1:0)}
function flipScore(bits){let f=0;for(let i=1;i<bits.length;i++)if(bits[i]!==bits[i-1])f++;return f/Math.max(1,bits.length-1)}
function buildCombos(top20,probs,draws){
  const combo5=top20.slice(0,5);
  const pmax=Math.max(...top20.map(n=>probs[n-1]||0),1e-9);
  const rest=top20.slice(5).map(n=>{
    const bits=trajectory(draws,n),presence=bits.reduce((a,b)=>a+b,0)/WINDOW,flip=flipScore(bits),recent=bits.at(-1)||0;
    return {n,score:.62*((probs[n-1]||0)/pmax)+.20*flip+.12*(1-presence)+.06*(1-recent)};
  }).sort((a,b)=>b.score-a.score||a.n-b.n);
  return {combo5,combo7:rest.slice(0,7).map(x=>x.n)};
}
function transitions(current20,predicted20){
  const c=new Set(current20),p=new Set(predicted20),overlap=predicted20.filter(n=>c.has(n));
  const outgoing=current20.filter(n=>!p.has(n)),incoming=predicted20.filter(n=>!c.has(n)),left=[...outgoing],pairs=[];
  for(const to of incoming){
    if(!left.length)break;
    let bi=0,bd=Infinity;
    for(let i=0;i<left.length;i++){const d=Math.abs(left[i]-to);if(d<bd){bd=d;bi=i}}
    pairs.push({from:left.splice(bi,1)[0],to,kind:'change'});
  }
  for(const n of overlap)pairs.push({from:n,to:n,kind:'stay'});
  return {overlap,pairs};
}
function inferNext(draws,source){
  const idx=draws.findIndex(d=>d.draw===source.draw);
  if(idx>=0 && idx<draws.length-1){
    const n=draws[idx+1];
    return {draw:n.draw,date:n.date,time:n.time};
  }
  // Learn the next slot from the most recent historical occurrence of the same source time.
  for(let i=draws.length-2;i>=0;i--){
    if(draws[i].time===source.time && draws[i+1]?.draw===draws[i].draw+1){
      const a=new Date(`20${draws[i].date.slice(6,8)}-${draws[i].date.slice(3,5)}-${draws[i].date.slice(0,2)}T00:00:00Z`);
      const b=new Date(`20${draws[i+1].date.slice(6,8)}-${draws[i+1].date.slice(3,5)}-${draws[i+1].date.slice(0,2)}T00:00:00Z`);
      const delta=Math.round((b-a)/86400000);
      const s=new Date(`20${source.date.slice(6,8)}-${source.date.slice(3,5)}-${source.date.slice(0,2)}T00:00:00Z`);
      s.setUTCDate(s.getUTCDate()+delta);
      const dd=String(s.getUTCDate()).padStart(2,'0'),mm=String(s.getUTCMonth()+1).padStart(2,'0'),yy=String(s.getUTCFullYear()).slice(-2);
      return {draw:source.draw+1,date:`${dd}.${mm}.${yy}`,time:draws[i+1].time};
    }
  }
  return {draw:source.draw+1,date:source.date,time:null};
}
async function readJSON(path,fallback){
  try{return JSON.parse(await fs.readFile(path,'utf8'))}catch{return fallback}
}
async function ensureDir(){await fs.mkdir('data',{recursive:true})}

await ensureDir();
const raw=await readJSON(HISTORY_FILE,[]);
const draws=(Array.isArray(raw)?raw:(raw?.draws||[])).map(normDraw)
  .filter(d=>Number.isInteger(d.draw)&&d.balls.length===20&&new Set(d.balls).size===20)
  .sort((a,b)=>a.draw-b.draw);
if(draws.length<WINDOW)throw new Error('XRAY RUNTIME: мало фактов');

const payouts=await readJSON(PAYOUT_FILE,{combination:{}});
const meta=await readJSON(META_FILE,{});
let rt=await readJSON(RUNTIME_FILE,{version:1,generation:'INIT',history:[]});
if(!Array.isArray(rt.history))rt.history=[];
const latest=draws.at(-1);

// Finalize current frozen forecast if its target fact is already present.
if(rt.forecast){
  const fact=draws.find(d=>d.draw===Number(rt.forecast.targetDraw));
  if(fact){
    const c5h=hitList(rt.forecast.combo5||[],fact.balls);
    const c7h=hitList(rt.forecast.combo7||[],fact.balls);
    const l20h=hitList(rt.forecast.predicted20||[],fact.balls);
    const settled={
      ...rt.forecast,
      status:'settled',
      factDraw:fact.draw,factDate:fact.date,factTime:fact.time,factColumn:fact.column,factBalls:fact.balls,
      combo5Hits:c5h,combo7Hits:c7h,layerHits:l20h,
      combo5Payout:payout(payouts,(rt.forecast.combo5||[]).length,c5h.length),
      combo7Payout:payout(payouts,(rt.forecast.combo7||[]).length,c7h.length),
      payoutVersion:payouts?.version||null,
      settledAt:new Date().toISOString()
    };
    if(!rt.history.some(x=>Number(x.targetDraw)===fact.draw)){
      rt.history.unshift(settled);
      rt.history=rt.history.slice(0,1000);
    }
    rt.forecast=null;
  }
}

// Generate a fresh frozen forecast only for the real next draw after latest official.
if(!rt.forecast || Number(rt.forecast.sourceDraw)!==latest.draw){
  const recent=draws.slice(-WINDOW);
  const model=await tf.loadLayersModel(`file://${process.cwd()}/${MODEL_FILE}`);
  const x=tf.tensor3d([recent.map(oneHot)],[1,WINDOW,RANGE]);
  const y=model.predict(x);
  const probs=Array.from(await y.data()).slice(0,RANGE).map(v=>Math.max(0,Math.min(1,Number(v)||0)));
  const predicted20=topN(probs,20), combos=buildCombos(predicted20,probs,recent), viz=transitions(latest.balls,predicted20);
  const target=inferNext(draws,latest);
  rt.forecast={
    id:`xr-server-${latest.draw}-${Date.now()}`,
    status:'pending',
    createdAt:new Date().toISOString(),
    version:'XRAY-SERVER-1.0',
    modelVersion:meta?.version||null,
    modelLatestDraw:meta?.latestDraw||null,
    sourceDraw:latest.draw,sourceDate:latest.date,sourceTime:latest.time,sourceColumn:latest.column,current20:latest.balls,
    targetDraw:target.draw,targetDate:target.date,targetTime:target.time,
    predicted20,combo5:combos.combo5,combo7:combos.combo7,overlap:viz.overlap,transitions:viz.pairs,
    payoutVersion:payouts?.version||null
  };
  x.dispose(); y.dispose(); model.dispose();
}

rt.version=1;
rt.updatedAt=new Date().toISOString();
rt.latestOfficial={draw:latest.draw,date:latest.date,time:latest.time,column:latest.column,balls:latest.balls};
rt.generation=`${latest.draw}-${Date.now()}`;
rt.status='live';
rt.model={version:meta?.version||null,latestDraw:meta?.latestDraw||null,trainedAt:meta?.trainedAt||null};
await fs.writeFile(RUNTIME_FILE,JSON.stringify(rt,null,2)+'\n','utf8');
console.log(`XRAY RUNTIME PASS · latest №${latest.draw} · forecast №${rt.forecast?.targetDraw||'—'} · history ${rt.history.length}`);
