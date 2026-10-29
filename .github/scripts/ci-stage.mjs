import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const [mode] = process.argv.slice(2);
if (!['data', 'app', 'journal'].includes(mode)) {
  throw new Error('Usage: ci-stage.mjs data|app|journal');
}
function node(file, args = [], allowed = [0]) {
  const r = spawnSync(process.execPath, [file, ...args], { stdio: 'inherit' });
  if (r.error || !allowed.includes(r.status)) throw r.error || new Error(file + ' failed: ' + r.status);
  return r.status;
}
if (mode === 'data') node('.github/scripts/combo-data-update.mjs');
console.log('DATA DERIVATIVE: reconcile search journal');
const archive = JSON.parse(await fs.readFile('combo-history-v1.json', 'utf8'));
const journal = JSON.parse(await fs.readFile('combo-search-log-v1.json', 'utf8'));
if (!Array.isArray(archive) || !archive.length || !Array.isArray(journal.snapshots)) {
  throw new Error('Invalid data/search journal; refusing a destructive fallback');
}
if (Number(journal.latestDraw) !== Number(archive.at(-1).draw)) node('build-combo-search-log.mjs');
console.log('APP BUILD: reconcile source fingerprint; draw data do not change app version');
if (mode === 'app') node('refresh-combo-build.mjs');
node('.github/scripts/check-stage1.mjs');
