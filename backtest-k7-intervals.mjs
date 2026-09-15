import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
// Fixed before evaluating: 200 targets, trailing 400 draws, P18, ten tickets.
// No parameter search. Require improvement for both R3/R4 and the final 100 targets.
const html=fs.readFileSync('k7-interval-builder.html','utf8');
const core=html.slice(html.indexOf('function countsOf('),html.indexOf('function signal('));
const env={colOf:n=>(n-1)%10+1,uniq:a=>[...new Set(a)]};vm.createContext(env);vm.runInContext(core,env);
const archiveText=fs.readFileSync('combo-history-v1.json','utf8'),archive=JSON.parse(archiveText);
const payouts=JSON.parse(fs.readFileSync('keno-payouts-v1.json','utf8')).combination['7'];
const N=200,W=400,start=archive.length-N;
assert(start>=W);
for(let i=start-W+1;i<archive.length;i++)assert.equal(archive[i].draw,archive[i-1].draw+1,'Contiguous evaluation archive');
const blank=()=>({hist:Array(8).fill(0),gross:0,tickets:0,hits:0,winning:0,poolHits:0,uniqueNumbers:0,pairOverlap:0});
const results=Object.fromEntries(['R3','R3+exit','R4','R4+exit'].map(k=>[k,{all:blank(),holdout:blank()}]));
function scoreExit(stats){const max=Math.max(...stats.map(s=>s.exit.exitRate));for(const s of stats)s.score=75*s.exit.exitRate/max+25*s.score/100;return stats.sort((a,b)=>b.score-a.score||a.n-b.n)}
function record(out,combos,actual,pool){
 out.poolHits+=pool.filter(s=>actual.has(s.n)).length;out.uniqueNumbers+=new Set(combos.flatMap(c=>c.nums)).size;
 let overlaps=0,pairs=0;for(let a=0;a<combos.length;a++)for(let b=a+1;b<combos.length;b++){overlaps+=combos[a].nums.filter(n=>combos[b].nums.includes(n)).length;pairs++}out.pairOverlap+=overlaps/pairs;
 for(const c of combos){assert.equal(new Set(c.nums).size,7);const h=c.nums.filter(n=>actual.has(n)).length,win=Number(payouts[h]||0);out.hist[h]++;out.gross+=win;out.tickets++;out.hits+=h;if(win)out.winning++}
}
for(let i=start;i<archive.length;i++){
 const train=archive.slice(i-W,i);assert(train.at(-1).draw<archive[i].draw);
 const raw=env.buildNumberStats(train);
 for(const [name,mode] of [['R3','combo'],['R4','balance']])for(const extra of [false,true]){
  let stats=env.scoreStats(structuredClone(raw),mode);if(extra)stats=scoreExit(stats);
  const combos=env.generateCombos(stats,train,mode,18,10),actual=new Set(archive[i].balls),out=results[name+(extra?'+exit':'')];
  record(out.all,combos,actual,stats.slice(0,18));if(i>=start+100)record(out.holdout,combos,actual,stats.slice(0,18));
 }
}
for(const r of Object.values(results))for(const [phase,s] of Object.entries(r)){const targets=phase==='all'?200:100;s.net=s.gross-s.tickets*100;s.meanHits=s.hits/s.tickets;s.meanPoolHits=s.poolHits/targets;s.meanUniqueNumbers=s.uniqueNumbers/targets;s.meanPairOverlap=s.pairOverlap/targets}
const eligible=['R3','R4'].every(name=>['all','holdout'].every(phase=>{const a=results[name][phase],b=results[name+'+exit'][phase];return b.gross>a.gross&&b.meanHits>=a.meanHits&&b.hist.slice(4).reduce((a,b)=>a+b,0)>=a.hist.slice(4).reduce((a,b)=>a+b,0)}));
const runtime=JSON.parse(fs.readFileSync('data/xray-runtime.json','utf8'));
const frozen=runtime.history.filter(e=>e.statisticsEligible!==false&&!e.lateForecast&&!e.replacedForecast&&e.factDraw>=archive[start].draw&&e.factDraw<=archive.at(-1).draw&&Array.isArray(e.predicted20)&&Array.isArray(e.factBalls));
const frozenFive=frozen.filter(e=>e.predicted20.filter(n=>e.factBalls.includes(n)).length===5);
const frozenDiagnostic={settledEntries:frozen.length,predicted20HitFive:frozenFive.length,k7Hist:Array(8).fill(0),zeroPayTickets:0};
for(const e of frozenFive)for(const key of ['combo7A','combo7B'])if(e[key]?.length===7){const h=e[key].filter(n=>e.factBalls.includes(n)).length;frozenDiagnostic.k7Hist[h]++;if(!payouts[h])frozenDiagnostic.zeroPayTickets++}
const result={base:'016f3043',archiveSha256:crypto.createHash('sha256').update(archiveText).digest('hex'),from:archive[start].draw,to:archive.at(-1).draw,targets:N,training:W,pool:18,ticketsPerTarget:10,ticketCost:100,payouts,priorStrength:12,blend:'75% normalized conditional exit + 25% existing rating',gate:'gross improves in all and last 100 for R3 and R4; mean hits and 4+ counts do not fall',eligible,results,frozenDiagnostic};
fs.writeFileSync('k7-interval-backtest.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
