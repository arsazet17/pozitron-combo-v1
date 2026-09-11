import fs from 'node:fs/promises';
const raw=JSON.parse(await fs.readFile('combo-history-v1.json','utf8'));
const draws=(Array.isArray(raw)?raw:(raw.draws||[])).map(d=>({draw:+(d.draw??d.number??d.id),balls:(d.balls||d.numbers||[]).map(Number)})).filter(d=>Number.isInteger(d.draw)&&d.balls.length===20&&new Set(d.balls).size===20).sort((a,b)=>a.draw-b.draw);
function vec(balls,kind){const a=Array(9).fill(0);for(const n of balls){const k=kind==='COLUMN'?(n-1)%9:Math.floor((n-1)/9);a[k]++;}return a}
const mats={COLUMN:draws.map(d=>vec(d.balls,'COLUMN')),LEVEL:draws.map(d=>vec(d.balls,'LEVEL'))};
const end=draws.length-1-5;
const windows=[];for(let w=5;w>=0;w--){const e=end-w*1000,s=e-999;windows.push({s,e,label:`${draws[s].draw}-${draws[e].draw}`});}
function f(x,n=3){return Number.isFinite(x)?+x.toFixed(n):null}
function stats(M,win,route){
 const idx=Array.from({length:win.e-win.s+1},(_,k)=>win.s+k); const {from,to,lag}=route;
 const byCount=new Map();
 for(const t of idx){const c=M[t][to],g=M[t+lag][to]>M[t][to];const z=byCount.get(c)||[0,0];z[0]++;if(g)z[1]++;byCount.set(c,z)}
 let n=0,h=0,exp=0;
 for(const t of idx){if(M[t][from]>=M[t-1][from])continue;const c=M[t][to],g=M[t+lag][to]>M[t][to],z=byCount.get(c);n++;if(g)h++;exp+=z[1]/z[0];}
 return {n,cond:h/n,matched:exp/n,lift:(h/n)/(exp/n),excess:h-exp};
}
function allRoutes(M,win){const out=[];for(const lag of [1,2,5])for(let from=0;from<9;from++)for(let to=0;to<9;to++){if(from===to)continue;const s=stats(M,win,{from,to,lag});if(s.n>=50)out.push({from,to,lag,...s});}return out}
const fixed={
 COLUMN:[{from:8,to:3,lag:2},{from:0,to:2,lag:1},{from:4,to:8,lag:1},{from:7,to:3,lag:1},{from:1,to:6,lag:1}],
 LEVEL:[{from:3,to:6,lag:1},{from:7,to:3,lag:1},{from:8,to:2,lag:2},{from:2,to:5,lag:5},{from:5,to:0,lag:2}]
};
console.log('WINDOWS',windows.map(x=>x.label).join(' | '));
for(const [kind,M] of Object.entries(mats)){
 console.log(`\n=== ${kind} FIXED CANDIDATES BACKTEST BY 1000-DRAW BLOCK ===`);
 for(const r of fixed[kind]){const rows=windows.map(w=>{const s=stats(M,w,r);return {window:w.label,n:s.n,lift:f(s.lift),cond:f(s.cond,4),matched:f(s.matched,4),excess:f(s.excess,2)}}); console.log(JSON.stringify({route:`${r.from+1}->${r.to+1}@${r.lag}`,rows,positive:rows.filter(x=>x.lift>1).length,meanLift:f(rows.reduce((a,x)=>a+x.lift,0)/rows.length)},null,2));}
 console.log(`\n=== ${kind} ROLLING DISCOVER 1000 -> TEST NEXT 1000 ===`);
 for(let k=0;k<windows.length-1;k++){
  const train=windows[k],test=windows[k+1];const candidates=allRoutes(M,train).sort((a,b)=>b.lift-a.lift).slice(0,5);
  const tested=candidates.map(r=>{const s=stats(M,test,r);return {route:`${r.from+1}->${r.to+1}@${r.lag}`,trainLift:f(r.lift),testLift:f(s.lift),testN:s.n,testExcess:f(s.excess,2)}});
  console.log(JSON.stringify({train:train.label,test:test.label,tested,positive:tested.filter(x=>x.testLift>1).length,meanTestLift:f(tested.reduce((a,x)=>a+x.testLift,0)/tested.length)},null,2));
 }
}
