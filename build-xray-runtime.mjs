import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {analyzeStructure,movementEdges} from './xray-structure-engine-v4.mjs';
import {normalizeDraws,validatePayouts,advanceRuntime} from './xray-runtime-core.mjs';
import {readState,persistState} from './xray-runtime-io.mjs';

function git(...args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});}
function committed(path){
 const entry=git('ls-tree','HEAD','--',path).trim();
 return entry?git('show','HEAD:'+path):null;
}
await fs.mkdir('data',{recursive:true});
let lock;
try{
 lock=await fs.open('.xray-runtime.lock','wx');
 const baselineRuntime=committed('data/xray-runtime.json'),baselineGuard=committed('data/xray-runtime.guard.json');
 const everExisted=Boolean(git('log','--all','-1','--format=%H','--','data/xray-runtime.json').trim());
 const state=await readState({baselineRuntime,baselineGuard,everExisted});
 const draws=normalizeDraws(JSON.parse(await fs.readFile('combo-history-v1.json','utf8')));
 const payouts=validatePayouts(JSON.parse(await fs.readFile('keno-payouts-v1.json','utf8')));
 if(state.needsGuardRefresh)await persistState(state.runtime,state);
 const result=await advanceRuntime(state.runtime,draws,payouts,{
 analyze:analyzeStructure,movement:movementEdges,checkpoint:next=>persistState(next,state),
 resumeGap:process.argv.includes('--resume-live-after-gap')
 });
 console.log('XRAY '+(result.blocked?'BLOCKED '+result.runtime.anomaly.code:'PASS')+' | pending '+(result.runtime.forecast?.targetDraw??'none')+' | history '+result.runtime.history.length);
 if(result.blocked)process.exitCode=2;
}catch(e){console.error('XRAY FATAL: '+e.message);process.exitCode=1;}
finally{if(lock){await lock.close();await fs.rm('.xray-runtime.lock',{force:true});}}
