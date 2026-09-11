import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const base = process.env.COMBO_BASE_SHA || '';
if (!base || /^0+$/.test(base)) {
  const r = spawnSync(process.execPath, ['validate-xray-runtime.mjs'], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('Current runtime validation failed');
  console.log('PASS runtime validation; event has no previous commit baseline');
} else {
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Invalid baseline commit SHA');
  // A force-updated branch (including an amended repair) may no longer expose
  // event.before through checkout's refs. Fetch that exact published commit;
  // never substitute HEAD's parent or silently skip the baseline.
  const commitSpec = base + '^{commit}';
  const present = spawnSync('git', ['cat-file', '-e', commitSpec], { stdio: 'ignore' });
  if (present.error) throw present.error;
  if (present.status !== 0) {
    const fetched = spawnSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', base], { stdio: 'inherit' });
    if (fetched.error || fetched.status !== 0) throw fetched.error || new Error('Cannot fetch the exact previous published commit');
    const verified = spawnSync('git', ['cat-file', '-e', commitSpec], { stdio: 'ignore' });
    if (verified.error || verified.status !== 0) throw verified.error || new Error('Previous published commit remains unavailable after fetch');
  }
  const scratch = await fs.mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'combo-baseline-'));
  try {
    const args = ['validate-xray-runtime.mjs'];
    for (const [file, flag] of [['data/xray-runtime.json', '--baseline'], ['data/xray-runtime.guard.json', '--baseline-guard']]) {
      const spec = base + ':' + file;
      const exists = spawnSync('git', ['cat-file', '-e', spec], { stdio: 'ignore' });
      if (exists.status !== 0) {
        if (flag === '--baseline') throw new Error('Previous published runtime is unavailable; refusing to skip the history comparison');
        continue; // The initial migration predates the guard; runtime comparison is still required.
      }
      const data = spawnSync('git', ['show', spec], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      if (data.error || data.status !== 0) throw data.error || new Error('Cannot read previous runtime');
      const target = path.join(scratch, path.basename(file));
      await fs.writeFile(target, data.stdout, 'utf8');
      args.push(flag, target);
    }
    const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
    if (r.error || r.status !== 0) throw r.error || new Error('Published runtime immutability/history check failed');
    console.log('PASS previous published runtime preserved');
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}
