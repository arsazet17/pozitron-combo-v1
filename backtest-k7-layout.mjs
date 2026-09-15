import {gzipSync} from 'node:zlib';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
// New layout experiment only. Fixed before execution: same frozen P20, two K7,
// trailing 400, three variants; choose by first segment, confirm on final 50.
const previous=JSON.parse(fs.readFileSync('k7-interval-backtest.json','utf8'));
const text=fs.readFileSync('combo-history-v1.json','utf8'),archive=JSON.parse(text),byId=new Map(archive.map((d,i)=>[d.draw,i]));
const runtime=JSON.parse(fs.readFileSync('data/xray-runtime.json','utf8')),pay=JSON.parse(fs.readFileSync('keno-payouts-v1.json','utf8')).combination['7'];
const html=fs.readFileSync('k7-interval-builder.html','utf8'),env={colOf:n=>(n-1)%10+1,uniq:a=>[...new Set(a)]};vm.createContext(env);vm.runInContext(html.slice(html.indexOf('function countsOf('),html.indexOf('function signal(')),env);
function stamp(d){const [day,month,y]=d.date.split('.').map(Number);return Date.parse(`${2000+y}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${d.time}:00+03:00`)}
const eligible=runtime.history.filter(e=>e.factDraw>=previous.from&&e.factDraw<=previous.to&&e.statisticsEligible!==false&&!e.lateForecast&&!e.replacedForecast&&e.combo7A?.length===7&&e.combo7B?.length===7&&e.predicted20?.length===20).sort((a,b)=>a.factDraw-b.factDraw);
assert(eligible.length>100);assert.equal(new Set(eligible.map(e=>e.factDraw)).size,eligible.length);
const split=eligible.length-50,names=['frozen','R3','R4','concentrated','clusters','shared-core'];
const fresh=()=>({hist:Array(8).fill(0),gross:0,tickets:0,targets:0,maxHits:Array(8).fill(0),overlap:0,uncoveredWins:0});
const results=Object.fromEntries(names.map(name=>[name,{train:fresh(),holdout:fresh(),all:fresh(),byPoolHits:Object.fromEntries(['5','6','7','8+'].map(k=>[k,fresh()]))}]));
const bucket=g=>g===0?0:g===1?1:g<=3?2:g<=7?3:4;
function linksFor(pool,train){
 const sets=train.map(d=>new Set(d.balls)),ages=pool.map(()=>[]),freq=pool.map(n=>sets.filter(s=>s.has(n)).length/train.length);
 pool.forEach((n,j)=>{let last=-1;sets.forEach((s,t)=>{if(s.has(n))last=t;ages[j][t]=last<0?null:bucket(t-last)})});
 const links=Array.from({length:20},()=>Array(20).fill(0)),support=Array.from({length:20},()=>Array(20).fill(null));
 for(let a=0;a<20;a++)for(let b=a+1;b<20;b++){
  let joint=0,trials=0,hits=0;for(let t=0;t<sets.length;t++){
   if(sets[t].has(pool[a])&&sets[t].has(pool[b]))joint++;
   if(t<sets.length-1&&ages[a][t]!==null&&ages[b][t]!==null&&ages[a][t]===ages[a].at(-1)&&ages[b][t]===ages[b].at(-1)){trials++;if(sets[t+1].has(pool[a])&&sets[t+1].has(pool[b]))hits++}
  }
  const independent=Math.max(.001,freq[a]*freq[b]),jointRate=(joint+12*independent)/(train.length+12),stateRate=(hits+20*jointRate)/(trials+20);
  const link=.85*Math.log(jointRate/independent)+.15*Math.log(stateRate/jointRate);
  links[a][b]=links[b][a]=link;support[a][b]=support[b][a]={joint,trials,hits};
 }
 return {links,support};
}
function pastGroupEvidence(nums,train){
 const sets=train.map(d=>new Set(d.balls)),last=nums.map(()=>-1),states=[];
 for(let t=0;t<sets.length;t++)states.push(nums.map((n,j)=>{if(sets[t].has(n))last[j]=t;return last[j]<0?'unknown':String(bucket(t-last[j]))}).join('/'));
 let joint=0,trials=0,hits=0;
 for(let t=0;t<sets.length;t++){if(nums.every(n=>sets[t].has(n)))joint++;if(t<sets.length-1&&!states[t].includes('unknown')&&states[t]===states.at(-1)){trials++;if(nums.every(n=>sets[t+1].has(n)))hits++}}
 return {joint,trials,hits};
}

function layouts(pool,scores,links){
 const rating=pool.map(n=>scores.get(n)/100),index=Array.from({length:20},(_,i)=>i);
 const bestRank=[...index].sort((a,b)=>rating[b]-rating[a]||a-b);
 const grow=(seed,excluded=new Set(),weight=.45)=>{
  const chosen=[...seed];while(chosen.length<7){const next=index.filter(i=>!chosen.includes(i)&&!excluded.has(i)).sort((a,b)=>{
   const value=i=>(1-weight)*rating[i]+weight*chosen.reduce((s,j)=>s+links[i][j],0)/chosen.length;
   return value(b)-value(a)||a-b;
  })[0];assert.notEqual(next,undefined);chosen.push(next)}return chosen;
 };
 const first=grow([bestRank[0]]),second=grow([bestRank[1]],new Set(first.slice(-2)));
 if(first.every(i=>second.includes(i)))throw new Error('Duplicate concentration ticket');
 const seedPair=excluded=>index.flatMap(a=>index.filter(b=>b>a&&!excluded.has(a)&&!excluded.has(b)).map(b=>({a,b,v:links[a][b]}))).sort((a,b)=>b.v-a.v||a.a-b.a||a.b-b.b)[0];
 const p1=seedPair(new Set()),cluster1=grow([p1.a,p1.b],new Set(),.8),exclude=new Set(cluster1),p2=seedPair(exclude),cluster2=grow([p2.a,p2.b],exclude,.8);
 const core=first.slice(0,3),core1=grow(core),core2=grow(core,new Set(core1.filter(i=>!core.includes(i))));
 const convert=lists=>lists.map(list=>list.map(i=>pool[i]).sort((a,b)=>a-b));
 return {concentrated:convert([first,second]),clusters:convert([cluster1,cluster2]),'shared-core':convert([core1,core2])};
}
const cases=[];
function record(s,combos,fact,poolHits){s.targets++;s.overlap+=combos[0].filter(n=>combos[1].includes(n)).length;s.uncoveredWins+=poolHits-new Set(combos.flat().filter(n=>fact.has(n))).size;const hs=combos.map(c=>c.filter(n=>fact.has(n)).length);s.maxHits[Math.max(...hs)]++;for(const h of hs){s.hist[h]++;s.gross+=Number(pay[h]||0);s.tickets++}return hs}
for(let j=0;j<eligible.length;j++){
 const e=eligible[j],i=byId.get(e.factDraw),train=archive.slice(i-400,i),pool=[...e.predicted20];
 assert.equal(train.length,400);assert.equal(e.targetDraw,e.factDraw);assert(e.sourceDraw<e.factDraw);assert(Date.parse(e.createdAt)<stamp(archive[i]));assert.equal(new Set(pool).size,20);
 assert.deepEqual(e.factBalls,archive[i].balls);for(const nums of [e.combo7A,e.combo7B])assert(nums.every(n=>pool.includes(n)));
 const raw=env.buildNumberStats(train),stats=env.scoreStats(raw,'combo').filter(s=>pool.includes(s.n)),scores=new Map(stats.map(s=>[s.n,s.score])),{links,support}=linksFor(pool,train);
 const methods={frozen:[e.combo7A,e.combo7B],R3:env.generateCombos(stats,train,'combo',20,2).map(c=>c.nums),R4:env.generateCombos(stats,train,'balance',20,2).map(c=>c.nums),...layouts(pool,scores,links)};
 // Outcome is used only here, after every method has constructed its tickets.
 const fact=new Set(archive[i].balls),wins=pool.filter(n=>fact.has(n)),ph=wins.length,phase=j<split?'train':'holdout',detail={draw:e.factDraw,phase,poolHits:ph,pool,winningPoolNumbers:wins,oracleMax:Math.min(ph,7),methods:{}};
 for(const [name,combos] of Object.entries(methods)){
  for(const nums of combos){assert.equal(new Set(nums).size,7);assert(nums.every(n=>pool.includes(n)))}
  const out=results[name],hs=record(out.all,combos,fact,ph);record(out[phase],combos,fact,ph);if(ph>=5)record(out.byPoolHits[ph>=8?'8+':String(ph)],combos,fact,ph);
  detail.methods[name]={combos,pastGroups:combos.map(nums=>pastGroupEvidence(nums,train)),hits:hs,gross:hs.reduce((s,h)=>s+Number(pay[h]||0),0)};
 }
 if(ph>=5){
  const ix=pool.map((n,i)=>fact.has(n)?i:null).filter(i=>i!==null),edges=[];for(let a=0;a<ix.length;a++)for(let b=a+1;b<ix.length;b++){const x=ix[a],y=ix[b];edges.push({pair:[pool[x],pool[y]],...support[x][y],link:links[x][y]})}
  detail.winningPairPastEvidence=edges;cases.push(detail);
 }
}
const candidates=['concentrated','clusters','shared-core'];
const chosen=[...candidates].sort((a,b)=>results[b].train.gross-results[a].train.gross||a.localeCompare(b))[0];
const accepted=['frozen','R3','R4'].every(base=>results[chosen].train.gross>results[base].train.gross&&results[chosen].holdout.gross>results[base].holdout.gross);
const diagnostic={five:cases.filter(c=>c.poolHits===5).length,six:cases.filter(c=>c.poolHits===6).length,seven:cases.filter(c=>c.poolHits===7).length,eightPlus:cases.filter(c=>c.poolHits>=8).length};
const output={archiveSha256:crypto.createHash('sha256').update(text).digest('hex'),from:eligible[0].factDraw,to:eligible.at(-1).factDraw,targets:eligible.length,train:split,holdout:50,holdoutFrom:eligible[split].factDraw,pool:'Stored frozen predicted20, unchanged for every method',tickets:2,trainingWindow:400,chosenOnTrain:chosen,accepted,diagnostic,results,cases};
fs.writeFileSync('k7-layout-cases.json.gz',gzipSync(JSON.stringify(cases)));
fs.writeFileSync('k7-layout-backtest.json',JSON.stringify({...output,cases:undefined,casesArtifact:'k7-layout-cases.json.gz'},null,2)+'\n');
console.log(JSON.stringify({...output,cases:undefined},null,2));
