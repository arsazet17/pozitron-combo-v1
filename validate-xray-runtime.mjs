import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {parseRuntime,validateGuard,assertMonotonic,assertLegacyAdoption} from './xray-runtime-core.mjs';
const rt=parseRuntime(await fs.readFile('data/xray-runtime.json','utf8'));
validateGuard(JSON.parse(await fs.readFile('data/xray-runtime.guard.json','utf8')),rt);
const arg=name=>{const i=process.argv.indexOf(name);if(i<0)return null;if(!process.argv[i+1])throw new Error('Missing value '+name);return process.argv[i+1];};
const baseline=arg('--baseline'),guard=arg('--baseline-guard');
if(baseline){const old=JSON.parse(await fs.readFile(baseline,'utf8'));if(old.schemaVersion===5)assertMonotonic(parseRuntime(JSON.stringify(old)),rt);else assertLegacyAdoption(old,rt);}
if(guard)validateGuard(JSON.parse(await fs.readFile(guard,'utf8')),rt);
if(!baseline){
 const exists=execFileSync('git',['ls-tree','HEAD','--','data/xray-runtime.guard.json'],{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
 if(exists){const old=execFileSync('git',['show','HEAD:data/xray-runtime.json'],{encoding:'utf8',maxBuffer:64*1024*1024});assertMonotonic(parseRuntime(old),rt);}
}
console.log('PASS runtime schema, frozen fingerprints, settlement hashes, history monotonicity and unique targets');
