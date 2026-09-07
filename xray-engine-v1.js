(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.ComboXray=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='XRAY-1.2.0';
const GRID_COLS=9;
const MAX_NUMBER=80;
const DIRS=[];
for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++) DIRS.push([dr,dc]);
const FAR_INDEX=DIRS.length;
const TRANS_DIM=DIRS.length+1;
const SHAPE_DIM=10;

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function coord(n){n=Number(n);return {r:Math.floor((n-1)/GRID_COLS),c:(n-1)%GRID_COLS};}
function numAt(r,c){if(r<0||c<0||c>=GRID_COLS)return null;const n=r*GRID_COLS+c+1;return n>=1&&n<=MAX_NUMBER?n:null;}
function setOf(draw){return new Set((draw?.balls||[]).map(Number).filter(n=>n>=1&&n<=MAX_NUMBER));}
function cosine(a,b){let dot=0,aa=0,bb=0;const n=Math.min(a.length,b.length);for(let i=0;i<n;i++){const x=a[i]||0,y=b[i]||0;dot+=x*y;aa+=x*x;bb+=y*y;}if(!aa||!bb)return 0;return dot/Math.sqrt(aa*bb);}
function normalize(a){let s=0;for(const x of a)s+=Math.abs(x);if(!s)return a;return a.map(x=>x/s);}
function nearestSource(target,sourceBalls,maxRadius=99){const t=coord(target);let best=null,bestD=1e9;for(const n of sourceBalls){const s=coord(n);const dr=t.r-s.r,dc=t.c-s.c,d=Math.abs(dr)+Math.abs(dc);if(d<bestD){bestD=d;best={n:Number(n),dr,dc,d};}}return best&&bestD<=maxRadius?best:null;}
function dirIndex(dr,dc){const i=DIRS.findIndex(x=>x[0]===dr&&x[1]===dc);return i>=0?i:FAR_INDEX;}
function transitionFeature(a,b){const out=Array(TRANS_DIM).fill(0),src=(a?.balls||[]).map(Number),dst=(b?.balls||[]).map(Number);if(!src.length||!dst.length)return out;for(const t of dst){const q=nearestSource(t,src);if(!q)continue;out[dirIndex(clamp(q.dr,-3,3),clamp(q.dc,-3,3))]++;}return normalize(out);}
function pairHist(draw){const balls=(draw?.balls||[]).map(Number);const set=new Set(balls),v=Array(SHAPE_DIM).fill(0);let idx=0;const tests=[[0,1],[1,0],[1,1],[1,-1],[0,2],[2,0]];for(const [dr,dc] of tests){let cnt=0;for(const n of balls){const p=coord(n),m=numAt(p.r+dr,p.c+dc);if(m&&set.has(m))cnt++;}v[idx++]=cnt/20;}
 const rows=Array(9).fill(0),cols=Array(9).fill(0);for(const n of balls){const p=coord(n);rows[p.r]++;cols[p.c]++;}
 const meanR=rows.reduce((s,x,i)=>s+x*i,0)/Math.max(1,balls.length),meanC=cols.reduce((s,x,i)=>s+x*i,0)/Math.max(1,balls.length);
 const spreadR=Math.sqrt(rows.reduce((s,x,i)=>s+x*(i-meanR)*(i-meanR),0)/Math.max(1,balls.length));
 const spreadC=Math.sqrt(cols.reduce((s,x,i)=>s+x*(i-meanC)*(i-meanC),0)/Math.max(1,balls.length));
 v[idx++]=spreadR/4;v[idx++]=spreadC/4;
 const sortedRows=[...rows].sort((a,b)=>b-a),sortedCols=[...cols].sort((a,b)=>b-a);
 v[idx++]=(sortedRows[0]||0)/20;v[idx++]=(sortedCols[0]||0)/20;
 return v;
}
function localSignature(n,set){const p=coord(n),out=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const m=numAt(p.r+dr,p.c+dc);out.push(m&&set.has(m)?1:0);}return out;}
function localSimilarity(a,b){let same=0;for(let i=0;i<a.length;i++)if(a[i]===b[i])same++;return 0.5+0.5*(same/a.length);}
function buildModel(draws){const n=draws.length,trans=[],shape=[];for(let i=0;i<n;i++)shape.push(pairHist(draws[i]));for(let i=0;i<n-1;i++)trans.push(transitionFeature(draws[i],draws[i+1]));const prefix=Array.from({length:n},()=>new Float64Array(TRANS_DIM));for(let i=0;i<trans.length;i++){const prev=prefix[i],next=prefix[i+1],f=trans[i];for(let k=0;k<TRANS_DIM;k++)next[k]=prev[k]+f[k];}return {draws,trans,shape,prefix};}
function avgRange(model,start,end){start=Math.max(0,start);end=Math.min(model.trans.length,end);const len=Math.max(1,end-start),out=Array(TRANS_DIM).fill(0),a=model.prefix[start],b=model.prefix[end];for(let k=0;k<TRANS_DIM;k++)out[k]=(b[k]-a[k])/len;return out;}
function chooseDepth(model){const t=model.trans.length,cands=[5,8,12,16,20,30,40,50,66].filter(d=>d<=t);if(!cands.length)return Math.max(1,t);let best=cands[0],bestScore=-1;for(const d of cands){const start=t-d,mid=start+Math.floor(d/2),all=avgRange(model,start,t),a=avgRange(model,start,mid),b=avgRange(model,mid,t),recent=avgRange(model,Math.max(start,t-Math.min(5,d)),t);const stability=cosine(a,b),regime=cosine(all,recent),score=.48*stability+.52*regime-.0015*d;if(score>bestScore){bestScore=score;best=d;}}return best;}
function dominantMoves(model,depth,limit=6){const avg=avgRange(model,model.trans.length-depth,model.trans.length);return avg.map((weight,i)=>({i,weight,delta:i===FAR_INDEX?null:DIRS[i]})).filter(x=>x.delta&&x.weight>0).sort((a,b)=>b.weight-a.weight).slice(0,limit);}
function topAnalogs(model,depth,limit=24){const n=model.draws.length,last=n-1,t=model.trans.length,current=avgRange(model,t-depth,t),recent=avgRange(model,Math.max(0,t-5),t),shapeNow=model.shape[last],arr=[];for(let e=depth;e<=n-3;e++){const cand=avgRange(model,e-depth,e),candRecent=avgRange(model,Math.max(0,e-5),e),sim=.50*cosine(current,cand)+.30*cosine(recent,candRecent)+.20*cosine(shapeNow,model.shape[e]);if(sim>0.45)arr.push({endIndex:e,similarity:sim,draw:model.draws[e]?.draw,nextDraw:model.draws[e+1]?.draw});}arr.sort((a,b)=>b.similarity-a.similarity);return arr.slice(0,limit);}
function calibrationFactor(calibration,key){const f=Number(calibration?.[key]);return Number.isFinite(f)?clamp(f,.75,1.25):1;}
function scoreCandidates(model,analogs,calibration){const draws=model.draws,current=draws.at(-1),curBalls=current.balls.map(Number),curSet=setOf(current),curLocal=new Map(curBalls.map(n=>[n,localSignature(n,curSet)])),scores=new Map();
 function add(n,score,meta){if(!n||n<1||n>80||score<=0)return;const old=scores.get(n)||{n,score:0,best:meta};old.score+=score;if(!old.best||score>(old.best.contribution||0))old.best={...meta,contribution:score};scores.set(n,old);}
 for(const a of analogs){const prev=draws[a.endIndex],next=draws[a.endIndex+1],prevBalls=prev.balls.map(Number),prevSet=setOf(prev);for(const target of next.balls.map(Number)){const q=nearestSource(target,prevBalls,5);if(!q)continue;const key=q.dr+','+q.dc,cal=calibrationFactor(calibration,key),sig=localSignature(q.n,prevSet);let bestCurrent=null,bestLocal=-1;for(const src of curBalls){const ls=localSimilarity(sig,curLocal.get(src));if(ls>bestLocal){bestLocal=ls;bestCurrent=src;}}
   if(bestCurrent==null)continue;const p=coord(bestCurrent),candidate=numAt(p.r+q.dr,p.c+q.dc);if(!candidate)continue;const contribution=Math.pow(a.similarity,3)*bestLocal*cal;add(candidate,contribution,{source:bestCurrent,dr:q.dr,dc:q.dc,analogDraw:a.draw,similarity:a.similarity});
  }
 }
 const list=[...scores.values()].sort((a,b)=>b.score-a.score);const max=list[0]?.score||1;for(const x of list)x.confidence=x.score/max;return list;
}

function parseDMY(s){const m=String(s||'').match(/^(\d{2})\.(\d{2})\.(\d{2,4})$/);if(!m)return null;let y=Number(m[3]);if(y<100)y+=2000;const d=new Date(Date.UTC(y,Number(m[2])-1,Number(m[1])));return Number.isNaN(d.getTime())?null:d;}
function fmtDMY(d){if(!(d instanceof Date)||Number.isNaN(d.getTime()))return null;return String(d.getUTCDate()).padStart(2,'0')+'.'+String(d.getUTCMonth()+1).padStart(2,'0')+'.'+String(d.getUTCFullYear()).slice(-2);}
function inferNextSlot(draws,current){
 const cur=current||draws?.at?.(-1);if(!cur)return {date:null,time:null};
 // Most reliable source is the same time slot on previous days: use its observed successor.
 for(let i=(draws?.length||0)-2;i>=0;i--){const d=draws[i],n=draws[i+1];if(!d||!n)continue;if(String(d.time||'')!==String(cur.time||''))continue;if(Number(n.draw)!==Number(d.draw)+1)continue;let dayDelta=0;const a=parseDMY(d.date),b=parseDMY(n.date);if(a&&b)dayDelta=Math.round((b-a)/86400000);const base=parseDMY(cur.date);if(base){base.setUTCDate(base.getUTCDate()+dayDelta);return {date:fmtDMY(base),time:n.time||null};}return {date:cur.date||null,time:n.time||null};}
 // Fallback: reuse the latest observed inter-draw time gap.
 if((draws?.length||0)>=2){const prev=draws.at(-2),pm=String(prev?.time||'').match(/^(\d{1,2}):(\d{2})$/),cm=String(cur.time||'').match(/^(\d{1,2}):(\d{2})$/);if(pm&&cm){let p=Number(pm[1])*60+Number(pm[2]),c=Number(cm[1])*60+Number(cm[2]),gap=c-p;if(gap<=0)gap+=1440;if(gap>0&&gap<=120){let t=c+gap,dd=Math.floor(t/1440);t%=1440;const base=parseDMY(cur.date);if(base){base.setUTCDate(base.getUTCDate()+dd);return {date:fmtDMY(base),time:String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};}}}}
 return {date:cur.date||null,time:null};
}

function movementLabel(dr,dc){if(dr===0&&dc===0)return 'сохранение клетки';const vert=dr<0?'вверх':dr>0?'вниз':'',hor=dc<0?'влево':dc>0?'вправо':'';const parts=[];if(vert)parts.push(`${Math.abs(dr)} ${vert}`);if(hor)parts.push(`${Math.abs(dc)} ${hor}`);return parts.join(' + ')||'без сдвига';}
function analyze(draws,opts={}){if(!Array.isArray(draws)||draws.length<8)return {ok:false,error:'Для Рентгена нужно минимум 8 тиражей'};const clean=draws.filter(d=>Array.isArray(d?.balls)&&d.balls.length>=1).slice();if(clean.length<8)return {ok:false,error:'Недостаточно корректных тиражей'};const model=buildModel(clean),depth=opts.depth||chooseDepth(model),analogs=topAnalogs(model,depth,opts.analogLimit||24),moves=dominantMoves(model,depth,6);if(analogs.length<3)return {ok:false,error:'Устойчивых исторических аналогов пока недостаточно',depth,analogs};const scored=scoreCandidates(model,analogs,opts.calibration||{});const main=[],reserve=[];for(const x of scored){if(main.length<4 && x.confidence>=.34)main.push(x);else if(main.length>=2 && reserve.length<3 && x.confidence>=.18)reserve.push(x);if(main.length>=4&&reserve.length>=3)break;}if(main.length<2){for(const x of scored){if(!main.some(y=>y.n===x.n)&&main.length<2)main.push(x);}}
 const avgAnalog=analogs.reduce((s,x)=>s+x.similarity,0)/analogs.length;const signal=avgAnalog>=.80?'сильный':avgAnalog>=.68?'средний':'слабый';const source=clean.at(-1),slot=inferNextSlot(clean,source);const wi=Math.max(0,clean.length-1-depth),windowStart=clean[wi]||clean[0];const trail=clean.slice(Math.max(0,clean.length-Math.min(depth+1,8))).map(d=>({draw:d.draw,date:d.date,time:d.time,column:Number(d.column)||null}));const analogDetails=analogs.slice(0,6).map(a=>{const d=clean[a.endIndex],n=clean[a.endIndex+1];return {...a,date:d?.date||null,time:d?.time||null,column:Number(d?.column)||null,nextDate:n?.date||null,nextTime:n?.time||null,nextColumn:Number(n?.column)||null};});return {ok:true,version:VERSION,sourceDraw:source.draw,sourceDate:source.date,sourceTime:source.time,sourceColumn:Number(source.column)||null,targetDraw:Number(source.draw)+1,targetDate:slot.date,targetTime:slot.time,depth,signal,analogScore:avgAnalog,windowStartDraw:windowStart?.draw||null,windowStartDate:windowStart?.date||null,windowStartTime:windowStart?.time||null,trail,analogs,analogDetails,moves:moves.map(x=>({...x,label:movementLabel(x.delta[0],x.delta[1])})),main,reserve,scored:scored.slice(0,20)};}
function buildCalibration(archive){const stats={};for(const e of archive||[]){if(e?.status!=='settled'||!Array.isArray(e?.factBalls))continue;const fact=new Set(e.factBalls.map(Number));for(const p of [...(e.main||[]),...(e.reserve||[])]){const key=(p.dr??p.best?.dr??0)+','+(p.dc??p.best?.dc??0);const s=stats[key]||(stats[key]={tries:0,hits:0});s.tries++;if(fact.has(Number(p.n)))s.hits++;}}
 const out={};for(const [k,s] of Object.entries(stats)){const rate=(s.hits+1)/(s.tries+2);out[k]=.85+.30*rate;}return out;}
return {VERSION,coord,numAt,analyze,buildCalibration,movementLabel,inferNextSlot};
});
