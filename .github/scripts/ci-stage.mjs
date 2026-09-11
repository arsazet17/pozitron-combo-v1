import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const [mode, baseline, baselineGuard] = process.argv.slice(2);
if (!['data', 'runtime', 'app', 'journal'].includes(mode) || !baseline || !baselineGuard) {
  throw new Error('Usage: ci-stage.mjs data|runtime|app|journal baseline.json baseline-guard.json');
}
function node(file, args = [], allowed = [0]) {
  const r = spawnSync(process.execPath, [file, ...args], { stdio: 'inherit' });
  if (r.error || !allowed.includes(r.status)) throw r.error || new Error(file + ' failed: ' + r.status);
  return r.status;
}
const baselineArgs = ['--baseline', baseline, '--baseline-guard', baselineGuard];
node('validate-xray-runtime.mjs', baselineArgs);
if (mode === 'data') node('.github/scripts/combo-data-update.mjs');

console.log('XRAY RUNTIME UPDATE: settle existing frozen, then create next forecast');
const resumeArgs = process.env.XRAY_RESUME_LIVE_AFTER_GAP === 'true' ? ['--resume-live-after-gap'] : [];
const runtimeStatus = node('build-xray-runtime.mjs', resumeArgs, [0, 2]);
if (runtimeStatus === 2) {
  const runtime = JSON.parse(await fs.readFile('data/xray-runtime.json', 'utf8'));
  if (runtime.status !== 'error' || !['MISSING_TARGET_FACT', 'MISSED_FORECAST_WINDOW'].includes(runtime.anomaly?.code)) {
    throw new Error('Unrecognized runtime failure; refusing to publish');
  }
}
node('validate-xray-runtime.mjs', baselineArgs);
console.log('DATA DERIVATIVE: reconcile search journal');
const archive = JSON.parse(await fs.readFile('combo-history-v1.json', 'utf8'));
const journal = JSON.parse(await fs.readFile('combo-search-log-v1.json', 'utf8'));
if (!Array.isArray(archive) || !archive.length || !Array.isArray(journal.snapshots)) {
  throw new Error('Invalid data/search journal; refusing a destructive fallback');
}
if (Number(journal.latestDraw) !== Number(archive.at(-1).draw)) node('build-combo-search-log.mjs');
console.log('APP BUILD: reconcile source fingerprint; draw/runtime data do not change app version');
node('refresh-combo-build.mjs');
node('.github/scripts/check-stage1.mjs');
node('validate-xray-runtime.mjs', baselineArgs);
process.exitCode = runtimeStatus;
