const WINDOWS=[1,2,5,10,20];
const VORTEX_RING=[1,2,4,8,7,5];
const VORTEX_INDEX=new Map(VORTEX_RING.map((v,i)=>[v,i]));
export const concentrationColumn=n=>1+((Number(n)-1)%9);
export const levelOf=n=>Math.floor((Number(n)-1)/9);
export function vortexNext(r){r=Number(r);if(VORTEX_INDEX.has(r))return VORTEX_RING[(VORTEX_INDEX.get(r)+1)%VORTEX_RING.length];if(r===3)return 6;if(r===6)return 3;return 9}
const inc=(m,k,v=1)=>m.set(k,(m.get(k)||0)+v), get=(m,k)=>m.get(k)||0;
function count(draws,fn){const m=new Map();for(const d of draws)for(const n of d.balls)inc(m,fn(n));return m}
function numCount(draws){return count(draws,n=>n)}
function edgeMaps(past){
  const asc=new Map(),draw=new Map();
  const add=(m,a,b,w)=>m.set(`${a}>${b}`,(m.get(`${a}>${b}`)||0)+w);
  [...past.slice(-20)].reverse().forEach((d,age0)=>{
    const w=1/(0.65+Math.pow(age0+1,.62));
    const s=[...d.balls].sort((a,b)=>a-b);
    for(let i=0;i<s.length-1;i++){add(asc,s[i],s[i+1],w);add(asc,s[i+1],s[i],w)}
    for(let i=0;i<d.balls.length-1;i++){add(draw,d.balls[i],d.balls[i+1],w);add(draw,d.balls[i+1],d.balls[i],w)}
  });
  return {asc,draw};
}
const sup=(m,a,b)=>m.get(`${a}>${b}`)||0;
function lexSort(rows){return [...rows].sort((a,b)=>{const A=a.key||[],B=b.key||[],n=Math.max(A.length,B.length);for(let i=0;i<n;i++){const d=(B[i]??0)-(A[i]??0);if(d)return d}return (a.n??0)-(b.n??0)});}
function topEdges(m,n=12){return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,strength])=>{const [from,to]=k.split('>').map(Number);return {from,to,strength:Number(strength.toFixed(4))}})}
function avgPerDraw(c,k,w){return Number((get(c,k)/w).toFixed(3))}
function topDifferent(pool,k,avoid,scoreFn){const avoidSet=new Set(avoid);const rows=pool.filter(n=>!avoidSet.has(n)).map(n=>({n,key:scoreFn(n)}));return lexSort(rows).slice(0,k).map(x=>x.n)}
function topWithOverlapCap(pool,k,avoid,maxOverlap,scoreFn){
  const avoidSet=new Set(avoid||[]), ranked=lexSort(pool.map(n=>({n,key:scoreFn(n)}))).map(x=>x.n), out=[];let overlap=0;
  for(const n of ranked){if(out.includes(n))continue;const hit=avoidSet.has(n);if(hit&&overlap>=maxOverlap)continue;out.push(n);if(hit)overlap++;if(out.length===k)break}
  if(out.length<k){for(const n of ranked){if(!out.includes(n)){out.push(n);if(out.length===k)break}}}
  return out;
}
function uniq(arr){return [...new Set(arr.map(Number).filter(n=>n>=1&&n<=80))]}
export function analyzeStructure(past){
  if(!Array.isArray(past)||past.length<20)throw new Error('XRAY STRUCTURE V4: нужно минимум 20 тиражей');
  const W=Object.fromEntries(WINDOWS.map(w=>[w,past.slice(-w)]));
  const cc={},lc={},nc={};for(const w of WINDOWS){cc[w]=count(W[w],concentrationColumn);lc[w]=count(W[w],levelOf);nc[w]=numCount(W[w])}
  const columnRows=[];for(let c=1;c<=9;c++){const v={};for(const w of WINDOWS)v[`t${w}`]=avgPerDraw(cc[w],c,w);columnRows.push({column:c,...v,d12:+(v.t1-v.t2).toFixed(3),d25:+(v.t2-v.t5).toFixed(3),d510:+(v.t5-v.t10).toFixed(3),d1020:+(v.t10-v.t20).toFixed(3)})}
  const levelRows=[];for(let l=0;l<=8;l++){const v={};for(const w of WINDOWS)v[`t${w}`]=avgPerDraw(lc[w],l,w);levelRows.push({level:l,...v,d12:+(v.t1-v.t2).toFixed(3),d25:+(v.t2-v.t5).toFixed(3),d510:+(v.t5-v.t10).toFixed(3),d1020:+(v.t10-v.t20).toFixed(3)})}
  const vf=new Map(),vr=new Map();[...past.slice(-5)].reverse().forEach((d,age0)=>{const w=1/Math.sqrt(age0+1),cols=d.balls.map(concentrationColumn);for(let i=0;i<cols.length-1;i++){const a=cols[i],b=cols[i+1];if(b===vortexNext(a))inc(vf,b,w);if(a===vortexNext(b))inc(vr,b,w)}});
  const columnRank=lexSort(columnRows.map(x=>({n:x.column,key:[Number(x.d12>0)+Number(x.d25>0),Number(x.d12>0),Number(x.d25>0),Number(get(vf,x.column)>get(vr,x.column)),get(vf,x.column),x.t1,x.t2,x.t5,x.t10,-x.column]}))).map(x=>x.n);
  const levelRank=lexSort(levelRows.map(x=>({n:x.level,key:[Number(x.d12>0)+Number(x.d25>0),Number(x.d12>0),Number(x.d25>0),x.t1,x.t2,x.t5,x.t10,-x.level]}))).map(x=>x.n);
  const {asc,draw}=edgeMaps(past),latest=past.at(-1).balls,lastSet=new Set(latest),topC=new Set(columnRank.slice(0,4)),extC=new Set(columnRank.slice(0,6)),topL=new Set(levelRank.slice(0,4)),extL=new Set(levelRank.slice(0,6));
  const rows=[];for(let n=1;n<=80;n++){
    const c=concentrationColumn(n),l=levelOf(n);let as=0,ds=0;
    for(const x of latest){if(x===n)continue;as+=sup(asc,x,n);ds+=sup(draw,x,n)}
    const fresh=lastSet.has(n)?0:1;
    const key=[Number(topC.has(c)),Number(topL.has(l)),Number(as>0),as,Number(ds>0),ds,Number(extC.has(c)),Number(extL.has(l)),fresh,get(nc[5],n),get(nc[10],n),get(nc[20],n),-n];
    rows.push({n,column:c,level:l,ascSupport:+as.toFixed(4),drawSupport:+ds.toFixed(4),fresh,key});
  }
  const ranked=lexSort(rows).map(x=>x.n), predicted20=uniq(ranked.slice(0,20));
  const byNum=new Map(rows.map(x=>[x.n,x]));
  const vortexTargets=new Set(columnRank.slice(0,4).map(vortexNext));

  // Четыре САМОСТОЯТЕЛЬНЫЕ структурные ветки. Ни одна семёрка больше не строится как "пятёрка + 2".
  const ascKey=n=>{const x=byNum.get(n);return [Number(x.ascSupport>0),x.ascSupport,Number(topC.has(x.column)),Number(topL.has(x.level)),Number(x.drawSupport>0),x.drawSupport,x.fresh,get(nc[5],n),get(nc[10],n),-n]};
  const vortexKey=n=>{const x=byNum.get(n);return [Number(vortexTargets.has(x.column)),Number(extC.has(x.column)),Number(x.drawSupport>0),x.drawSupport,Number(x.ascSupport>0),x.ascSupport,Number(extL.has(x.level)),x.fresh,get(nc[5],n),-n]};
  const rootLevelKey=n=>{const x=byNum.get(n);return [Number(topC.has(x.column))+Number(topL.has(x.level)),Number(topC.has(x.column)),Number(topL.has(x.level)),Number(x.ascSupport>0),x.ascSupport,Number(x.drawSupport>0),x.drawSupport,x.fresh,get(nc[10],n),-n]};
  const drawVortexKey=n=>{const x=byNum.get(n);return [Number(x.drawSupport>0),x.drawSupport,Number(vortexTargets.has(x.column)),Number(x.ascSupport>0),x.ascSupport,Number(extC.has(x.column)),Number(extL.has(x.level)),x.fresh,get(nc[5],n),-n]};

  const combo5A=topWithOverlapCap(predicted20,5,[],0,ascKey);
  let combo5B=topDifferent(predicted20,5,combo5A,vortexKey);
  if(combo5B.length<5)combo5B=topWithOverlapCap(predicted20,5,combo5A,0,vortexKey);

  // 7A считается отдельно и может пересечься с 5A максимум двумя узлами — никакого механического расширения 5A.
  const combo7A=topWithOverlapCap(predicted20,7,combo5A,2,rootLevelKey);
  // 7B — самостоятельная DRAW/Vortex ветка; с 7A держим максимум 2 общих узла, если 20-ка это позволяет.
  const combo7B=topWithOverlapCap(predicted20,7,combo7A,2,drawVortexKey);
  const neighborFront=lexSort(rows.filter(x=>!lastSet.has(x.n)).map(x=>({n:x.n,key:[Number(x.ascSupport>0),x.ascSupport,Number(x.drawSupport>0),x.drawSupport,Number(topC.has(x.column)),Number(topL.has(x.level))]}))).slice(0,12).map(x=>x.n);
  return {
    version:'XRAY-STRUCTURE-4.1',windows:WINDOWS,
    concentrationColumns:columnRows,levelRows,columnRank,levelRank,
    vortex:{ring:VORTEX_RING,forward:Object.fromEntries(vf),reverse:Object.fromEntries(vr)},
    adjacency:{ascTop:topEdges(asc),drawTop:topEdges(draw)},neighborFront,
    ranked20:predicted20,combo5A,combo5B,combo7A,combo7B,
    method:'TABLE→COLUMNS→LEVEL→ASC/DRAW→VORTEX→20→4 INDEPENDENT COMBOS'
  };
}
export function movementEdges(current20,predicted20,past){
  const {asc,draw}=edgeMaps(past),cur=uniq(current20),pred=uniq(predicted20),curSet=new Set(cur),incoming=pred.filter(n=>!curSet.has(n)),used=new Set(),edges=[];
  for(const to of incoming){
    const cand=cur.filter(from=>!used.has(from)).map(from=>{const a=sup(asc,from,to),d=sup(draw,from,to),sameC=concentrationColumn(from)===concentrationColumn(to),sameL=levelOf(from)===levelOf(to),v=(concentrationColumn(to)===vortexNext(concentrationColumn(from))||concentrationColumn(from)===vortexNext(concentrationColumn(to)));let type='NONE',rank=0,strength=0;if(a>0){type='ASC';rank=5;strength=a}else if(d>0){type='DRAW';rank=4;strength=d}else if(sameC){type='COLUMN';rank=3;strength=1}else if(v){type='VORTEX';rank=2;strength=1}else if(sameL){type='LEVEL';rank=1;strength=1}return {from,to,type,rank,strength:+strength.toFixed(4),fromColumn:concentrationColumn(from),toColumn:concentrationColumn(to),fromLevel:levelOf(from),toLevel:levelOf(to)}}).sort((a,b)=>b.rank-a.rank||b.strength-a.strength||a.from-b.from);
    if(cand[0]&&cand[0].rank>0){used.add(cand[0].from);edges.push(cand[0])}
  }
  return edges;
}
