import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { publishFresh } from './.github/scripts/ci-publish.mjs';
import { dueTarget, publicationStamp } from './.github/scripts/combo-data-update.mjs';

const names = (await fs.readdir('.github/workflows')).filter(x => /\.ya?ml$/.test(x));
const workflows = new Map();
for (const name of names) {
  // JSON is a strict subset of YAML 1.2. Active workflow documents use JSON so
  // the complete YAML structure can be checked without a downloaded parser.
  const w = JSON.parse(await fs.readFile('.github/workflows/' + name, 'utf8'));
  assert(w.name && w.on && w.jobs, name + ': required workflow fields');
  workflows.set(name, w);
  if (name.startsWith('install-')) {
    assert.deepEqual(Object.keys(w.on), ['workflow_dispatch']);
    assert.equal(w.permissions.contents, 'read');
    assert(w.jobs.retired);
    continue;
  }
  if (w.permissions.contents === 'write') {
    assert.equal(w.concurrency.group, 'combo-main-writer');
    assert.equal(w.concurrency['cancel-in-progress'], false);
    const jobs = Object.values(w.jobs);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].if, "${{ github.ref == 'refs/heads/main' }}");
    const commands = jobs[0].steps.map(s => s.run || '').join('\n');
    assert.match(commands, /node \.github\/scripts\/ci-publish\.mjs (data|runtime|app|journal)/);
    assert(!/git (push|commit|rebase|pull)|node build-xray-runtime/.test(commands), name + ': only the authoritative publisher may write');
  }
}
assert.equal([...workflows.values()].filter(w => w.permissions.contents === 'write').length, 4);
assert(workflows.get('update-combo-v1.yaml').on.workflow_dispatch);
const rebuild = workflows.get('xray-ai-train.yml');
for (const p of ['xray-structure-engine-v4.mjs', 'build-xray-runtime.mjs', 'xray-runtime-core.mjs', 'xray-runtime-io.mjs', 'keno-payouts-v1.json', 'combo-history-v1.json']) {
  assert(rebuild.on.push.paths.includes(p), 'Missing runtime dependency: ' + p);
}
for (const p of ['data/xray-runtime.json', 'data/xray-runtime.guard.json']) assert(!rebuild.on.push.paths.includes(p), 'Runtime output must not rebuild itself');
assert.equal(rebuild.on.workflow_dispatch.inputs.resume_live_after_gap.type, 'boolean');
assert.equal(rebuild.on.workflow_dispatch.inputs.resume_live_after_gap.default, false);
const app = workflows.get('combo-auto-app-build.yml');
for (const p of ['xray-structure-engine-v4.mjs', 'xray-ui-v1.js', 'xray-v1.css']) assert(app.on.push.paths.includes(p));
for (const p of ['combo-history-v1.json', 'combo-status-v1.json', 'data/xray-runtime.json']) assert(!app.on.push.paths.includes(p));
const checks = workflows.get('combo-stage1-checks.yml');
assert.equal(checks.permissions.contents, 'read');
for (const p of ['xray-structure-engine-v4.mjs', 'build-xray-runtime.mjs', 'xray-ui-v1.js', 'xray-v1.css', 'keno-payouts-v1.json', 'combo-history-v1.json', 'data/xray-runtime.json']) {
  assert(checks.on.push.paths.includes(p), 'Missing check dependency: ' + p);
}
console.log('PASS workflow YAML/JSON sanity, writer concurrency, dependencies, retired installers and no runtime trigger cycle');

function scenario({ headChangesBeforeCommit = false, rejectedPush = false, noChanges = false, anomaly = false, uncertainSuccess = false } = {}) {
  let attempt = 0;
  const events = [];
  const io = {
    async prepare() { attempt++; events.push('prepare:' + attempt); return 'head:' + attempt; },
    async reconcile(base) { events.push('reconcile:' + base); return anomaly ? 2 : 0; },
    async verify(base) { events.push('verify:' + base); },
    async remoteHead() { return headChangesBeforeCommit && attempt === 1 ? 'new-head' : 'head:' + attempt; },
    async changed() { return !noChanges; },
    async commit() { events.push('commit:' + attempt); return 'candidate:' + attempt; },
    async push() { events.push('push:' + attempt); return !(attempt === 1 && (rejectedPush || uncertainSuccess)); },
    async isPublished() { return uncertainSuccess; }
  };
  return { io, events };
}
{
  const { io, events } = scenario({ headChangesBeforeCommit: true });
  assert.deepEqual(await publishFresh(io), { status: 0, published: true });
  assert(!events.includes('commit:1'));
  assert.deepEqual(events, ['prepare:1', 'reconcile:head:1', 'verify:head:1', 'prepare:2', 'reconcile:head:2', 'verify:head:2', 'commit:2', 'push:2']);
}
{
  const { io, events } = scenario({ rejectedPush: true });
  await publishFresh(io);
  assert(events.includes('reconcile:head:2'));
  assert(events.indexOf('verify:head:2') < events.indexOf('commit:2'));
}
{
  const { io, events } = scenario({ noChanges: true });
  assert.deepEqual(await publishFresh(io), { status: 0, published: false });
  assert(!events.some(e => e.startsWith('commit:')));
}
{
  const { io } = scenario({ anomaly: true });
  assert.deepEqual(await publishFresh(io), { status: 2, published: true });
}
{
  const { io, events } = scenario({ uncertainSuccess: true });
  assert.deepEqual(await publishFresh(io), { status: 0, published: true });
  assert(!events.includes('prepare:2'));
}
{
  const { io } = scenario();
  io.remoteHead = async () => 'always-new';
  await assert.rejects(publishFresh(io, 2), /main kept changing/);
}
{
  const { io, events } = scenario();
  io.verify = async () => { throw new Error('corrupt runtime'); };
  await assert.rejects(publishFresh(io), /corrupt runtime/);
  assert(!events.some(e => e.startsWith('commit:') || e.startsWith('push:')));
}
assert.deepEqual(dueTarget(new Date('2026-09-10T21:03:00Z')), { date: '10.09.26', time: '23:32' });
assert.deepEqual(dueTarget(new Date('2026-09-10T21:05:00Z')), { date: '11.09.26', time: '00:02' });
assert(Number.isNaN(publicationStamp({ date: '31.02.26', time: '00:02' })));
console.log('PASS stale HEAD retry, rejected push recomputation, uncertain push verification, no-op, anomaly diagnostics and publication grace');
