import { spawnSync } from 'node:child_process';
const tracked = spawnSync('git', ['ls-files', '-z', '*.js', '*.mjs', '*.cjs'], { encoding: 'utf8' });
if (tracked.error || tracked.status !== 0) throw tracked.error || new Error('Cannot enumerate JavaScript sources');
function node(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw result.error || new Error('CHECK FAIL: ' + args.join(' '));
}
for (const file of tracked.stdout.split('\0').filter(Boolean)) node(['--check', file]);
console.log('PASS JavaScript/MJS/CJS syntax');
node(['self-test-xray-v4.mjs']);
node(['self-test-xray-ui-pwa.mjs']);
node(['self-test-workflows.mjs']);
node(['self-test-published-baseline.mjs']);
node(['validate-xray-runtime.mjs']);
console.log('PASS STAGE 1 checks');
