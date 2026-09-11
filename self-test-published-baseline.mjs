import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = (await fs.readFile('.github/scripts/check-published-baseline.mjs', 'utf8')).replace(/^import .*;\n/gm, '');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function scenario(options = {}) {
  const calls = [], files = new Map();
  let present = !options.detached;
  const sha = 'a'.repeat(40);
  const run = new AsyncFunction('fs', 'os', 'path', 'spawnSync', 'process', 'console', source);
  const fakeFs = {
    async mkdtemp() { return '/scratch'; },
    async writeFile(name, data) { files.set(name, data); },
    async rm() { calls.push('cleanup'); }
  };
  function spawn(command, args) {
    calls.push([command, ...args]);
    if (command === 'node') return { status: options.invalidRuntime ? 1 : 0 };
    if (args[0] === 'fetch') { present = !options.fetchFails; return { status: options.fetchFails ? 1 : 0 }; }
    if (args[0] === 'cat-file') {
      if (args[2].endsWith('^{commit}')) return { status: present ? 0 : 1 };
      if (args[2].endsWith('guard.json')) return { status: options.legacy ? 1 : 0 };
      return { status: options.missingRuntime ? 1 : 0 };
    }
    if (args[0] === 'show') return { status: 0, stdout: '{}' };
    throw new Error('Unexpected process');
  }
  let error;
  try {
    await run(fakeFs, { tmpdir: () => '/tmp' }, { join: (...x) => x.join('/'), basename: p => p.split('/').at(-1) }, spawn,
      { env: { COMBO_BASE_SHA: sha }, execPath: 'node' }, { log() {} });
  } catch (e) { error = e; }
  return { calls, files, error, sha };
}
{
  const r = await scenario();
  assert.equal(r.error, undefined);
  assert(!r.calls.some(x => Array.isArray(x) && x[1] === 'fetch'));
  assert.equal(r.files.size, 2);
}
{
  const r = await scenario({ detached: true });
  assert.equal(r.error, undefined);
  assert.deepEqual(r.calls.find(x => Array.isArray(x) && x[1] === 'fetch'), ['git', 'fetch', '--no-tags', '--depth=1', 'origin', r.sha]);
  assert.equal(r.files.size, 2);
}
for (const options of [{ detached: true, fetchFails: true }, { missingRuntime: true }, { invalidRuntime: true }]) {
  const r = await scenario(options);
  assert(r.error, 'Unavailable or invalid baseline must be fatal');
  if (options.fetchFails || options.missingRuntime) assert(!r.calls.some(x => Array.isArray(x) && x[0] === 'node'));
}
{
  const r = await scenario({ legacy: true });
  assert.equal(r.error, undefined);
  assert.equal(r.files.size, 1);
  assert(r.calls.some(x => Array.isArray(x) && x.includes('--baseline')));
}
console.log('PASS published baseline: existing SHA, exact detached SHA fetch, fatal fetch/missing/invalid runtime and legacy adoption');
