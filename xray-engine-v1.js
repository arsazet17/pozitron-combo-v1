(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.ComboXray=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const VERSION='XRAY-AI-2.0.0';
const MODEL_URL='xray-ai-model/model.json';
const META_URL='xray-ai-model/meta.json';
const TF_URL='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
const MAX_NUMBER=80;
const WINDOW=5;
let modelPromise=null;
let tfPromise=null;
let metaCache=null;

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function validBalls(draw){return (draw?.balls||[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=MAX_NUMBER);}
function encodeDraw(draw){const v=Array(MAX_NUMBER).fill(0);for(const n of validBalls(draw))v[n-1]=1;return v;}
function parseDMY(s){const m=String(s||'').match(/^(\d{2})\.(\d{2})\.(\d{2,4})$/);if(!m)return null;let y=Number(m[3]);if(y<100)y+=2000;const d=new Date(Date.UTC(y,Number(m[2])-1,Number(m[1])));return Number.isNaN(d.getTime())?null:d;}
function fmtDMY(d){if(!(d instanceof Date)||Number.isNaN(d.getTime()))return null;return String(d.getUTCDate()).padStart(2,'0')+'.'+String(d.getUTCMonth()+1).padStart(2,'0')+'.'+String(d.getUTCFullYear()).slice(-2);}

function inferNextSlot(draws,current){
  const cur=current||draws?.at?.(-1);if(!cur)return {date:null,time:null};
  for(let i=(draws?.length||0)-2;i>=0;i--){
    const d=draws[i],n=draws[i+1];if(!d||!n)continue;
    if(String(d.time||'')!==String(cur.time||''))continue;
    if(Number(n.draw)!==Number(d.draw)+1)continue;
    let dayDelta=0;const a=parseDMY(d.date),b=parseDMY(n.date);if(a&&b)dayDelta=Math.round((b-a)/86400000);
    const base=parseDMY(cur.date);if(base){base.setUTCDate(base.getUTCDate()+dayDelta);return {date:fmtDMY(base),time:n.time||null};}
    return {date:cur.date||null,time:n.time||null};
  }
  if((draws?.length||0)>=2){
    const prev=draws.at(-2),pm=String(prev?.time||'').match(/^(\d{1,2}):(\d{2})$/),cm=String(cur.time||'').match(/^(\d{1,2}):(\d{2})$/);
    if(pm&&cm){let p=Number(pm[1])*60+Number(pm[2]),c=Number(cm[1])*60+Number(cm[2]),gap=c-p;if(gap<=0)gap+=1440;if(gap>0&&gap<=120){let t=c+gap,dd=Math.floor(t/1440);t%=1440;const base=parseDMY(cur.date);if(base){base.setUTCDate(base.getUTCDate()+dd);return {date:fmtDMY(base),time:String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};}}}
  }
  return {date:cur.date||null,time:null};
}

function ensureTf(){
  if(root.tf)return Promise.resolve(root.tf);
  if(tfPromise)return tfPromise;
  tfPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=TF_URL;s.async=true;
    s.onload=()=>root.tf?resolve(root.tf):reject(new Error('TensorFlow.js не загрузился'));
    s.onerror=()=>reject(new Error('Не удалось загрузить TensorFlow.js'));
    document.head.appendChild(s);
  });
  return tfPromise;
}

async function loadMeta(){
  try{
    const r=await fetch(META_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('meta '+r.status);
    metaCache=await r.json();return metaCache;
  }catch(e){return metaCache||null;}
}

async function loadModel(){
  if(modelPromise)return modelPromise;
  modelPromise=(async()=>{
    const tf=await ensureTf();
    const meta=await loadMeta();
    const v=encodeURIComponent(meta?.trainedAt||meta?.latestDraw||VERSION);
    try{return await tf.loadLayersModel(MODEL_URL+'?v='+v);}catch(e){modelPromise=null;throw new Error('AI-модель Рентгена ещё не подготовлена. Запустите workflow «XRAY AI 5→1 TRAIN».');}
  })();
  return modelPromise;
}

function trajectory(draws,n){return draws.slice(-WINDOW).map(d=>validBalls(d).includes(n)?1:0);}
function flipScore(bits){let f=0;for(let i=1;i<bits.length;i++)if(bits[i]!==bits[i-1])f++;return f/Math.max(1,bits.length-1);}
function buildCombos(top20,probs,draws){
  const combo5=top20.slice(0,5);
  const pmax=Math.max(...top20.map(n=>probs[n-1]||0),1e-9);
  const rest=top20.slice(5).map(n=>{
    const bits=trajectory(draws,n),presence=bits.reduce((a,b)=>a+b,0)/WINDOW,flip=flipScore(bits),recent=bits.at(-1)||0;
    const contrast=.62*((probs[n-1]||0)/pmax)+.20*flip+.12*(1-presence)+.06*(1-recent);
    return {n,contrast};
  }).sort((a,b)=>b.contrast-a.contrast||a.n-b.n);
  return {combo5,combo7:rest.slice(0,7).map(x=>x.n)};
}

function visualTransitions(current20,predicted20){
  const current=new Set(current20),pred=new Set(predicted20),overlap=predicted20.filter(n=>current.has(n));
  const outgoing=current20.filter(n=>!pred.has(n)),incoming=predicted20.filter(n=>!current.has(n));
  const left=[...outgoing],pairs=[];
  for(const to of incoming){
    if(!left.length)break;
    let bi=0,bd=Infinity;
    for(let i=0;i<left.length;i++){const d=Math.abs(left[i]-to);if(d<bd){bd=d;bi=i;}}
    const from=left.splice(bi,1)[0];pairs.push({from,to,kind:'change'});
  }
  for(const n of overlap)pairs.push({from:n,to:n,kind:'stay'});
  return {pairs,overlap,outgoing,incoming};
}

async function analyze(draws,opts={}){
  const clean=(Array.isArray(draws)?draws:[]).filter(d=>validBalls(d).length===20).slice();
  if(clean.length<WINDOW)return {ok:false,error:'Для AI-Рентгена нужно минимум 5 корректных тиражей'};
  const source=clean.at(-1),slot=inferNextSlot(clean,source),recent=clean.slice(-WINDOW);
  let model;
  try{model=await loadModel();}catch(e){return {ok:false,error:e.message||String(e),sourceDraw:source.draw,sourceDate:source.date,sourceTime:source.time,sourceColumn:Number(source.column)||null};}
  const tf=await ensureTf();
  const input=[recent.map(encodeDraw)];
  const x=tf.tensor3d(input,[1,WINDOW,MAX_NUMBER]);
  let y;
  try{y=model.predict(x);const arr=await y.data();const probs=Array.from(arr).slice(0,MAX_NUMBER).map(v=>clamp(Number(v)||0,0,1));
    const ranked=Array.from({length:MAX_NUMBER},(_,i)=>i+1).sort((a,b)=>(probs[b-1]-probs[a-1])||(a-b));
    const predicted20=ranked.slice(0,20),combos=buildCombos(predicted20,probs,recent),viz=visualTransitions(validBalls(source),predicted20),meta=await loadMeta();
    return {ok:true,version:VERSION,modelVersion:meta?.version||null,modelLatestDraw:meta?.latestDraw||null,sourceDraw:Number(source.draw),sourceDate:source.date||null,sourceTime:source.time||null,sourceColumn:Number(source.column)||null,targetDraw:Number(source.draw)+1,targetDate:slot.date,targetTime:slot.time,recentDraws:recent.map(d=>({draw:Number(d.draw),date:d.date,time:d.time,column:Number(d.column)||null})),current20:validBalls(source),predicted20,combo5:combos.combo5,combo7:combos.combo7,probabilities:probs,overlap:viz.overlap,transitions:viz.pairs,engine:'Attention LSTM 5→1'};
  }finally{x.dispose();if(y&&typeof y.dispose==='function')y.dispose();}
}

function resetModel(){modelPromise=null;metaCache=null;}
return {VERSION,MAX_NUMBER,WINDOW,encodeDraw,inferNextSlot,analyze,visualTransitions,resetModel,loadMeta};
});
