import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { publishFresh } from './.github/scripts/ci-publish.mjs';
import { dueTarget, publicationStamp, updateData } from './.github/scripts/combo-data-update.mjs';

const names = (await fs.readdir('.github/workflows')).filter(x => /\.ya?ml$/.test(x));
const workflows = new Map();
for (const name of names) {
  // JSON is a strict subset of YAML 1.2. Active workflow documents use JSON so
  // the complete YAML structure can be checked without a downloaded parser.
  if (name === 'combo-m4-direct.yml') {
    const source = await fs.readFile('.github/workflows/' + name, 'utf8');
    assert.match(source, /^name: COMBO · M4-style DIRECT Stoloto$/m);
    assert(source.includes('on:\n  workflow_dispatch:'));
    assert.match(source, /^  group: combo-m4-direct-writer$/m);
    assert.match(source, /^  cancel-in-progress: false$/m);
    assert.match(source, /^  contents: write$/m);
    assert(source.includes('python .github/scripts/combo-m4-direct.py'));
    assert(source.includes('git add combo-history-v1.json combo-status-v1.json'));
    assert.doesNotMatch(source, /^  schedule:/m);
    continue;
  }
  const w = JSON.parse(await fs.readFile('.github/workflows/' + name, 'utf8'));
  assert(w.name && w.on && w.jobs, name + ': required workflow fields');
  workflows.set(name, w);
  if (name.startsWith('install-') || name === 'apply-intervals-nav-v1.yml') {
    assert.deepEqual(Object.keys(w.on), ['workflow_dispatch']);
    assert.equal(w.permissions.contents, 'read');
    assert(w.jobs.retired);
    continue;
  }
  if (name === 'update-combo-v1.yaml') {
    assert.deepEqual(Object.keys(w.on), ['workflow_dispatch']);
    assert.equal(w.jobs.publish.if, "${{ false }}", 'Legacy loader must remain disabled');
    assert.equal(w.concurrency.group, 'combo-data-writer');
    continue;
  }
  if (w.permissions.contents === 'write') {
    assert.equal(w.concurrency.group, name === 'combo-auto-app-build.yml' ? 'combo-app-writer' : name === 'update-combo-v1.yaml' ? 'combo-data-writer' : 'combo-main-writer');
    assert.equal(w.concurrency['cancel-in-progress'], false);
    const jobs = Object.values(w.jobs);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].if, "${{ github.ref == 'refs/heads/main' }}");
    const commands = jobs[0].steps.map(s => s.run || '').join('\n');
    assert.match(commands, /node \.github\/scripts\/ci-publish\.mjs (data|app|journal)/);
    assert(!/git (push|commit|rebase|pull)/.test(commands), name + ': only the authoritative publisher may write');
  }
}
assert.equal([...workflows.values()].filter(w => w.permissions.contents === 'write').length, 3);
assert(workflows.get('update-combo-v1.yaml').on.workflow_dispatch);
assert.notEqual(workflows.get('update-combo-v1.yaml').concurrency.group, workflows.get('combo-search-journal.yml').concurrency.group, 'Journal requests must not replace pending official data updates');
assert.equal(workflows.get('update-combo-v1.yaml').on.schedule, undefined, 'Legacy loader must not have an automatic schedule');
const app = workflows.get('combo-auto-app-build.yml');
for (const p of ['index.html', 'combo-search-v1.js', 'refresh-combo-build.mjs']) assert(app.on.push.paths.includes(p));
for (const p of ['combo-history-v1.json', 'combo-status-v1.json']) assert(!app.on.push.paths.includes(p));
const checks = workflows.get('combo-stage1-checks.yml');
assert.equal(checks.permissions.contents, 'read');
for (const p of ['index.html', 'keno-payouts-v1.json', 'combo-history-v1.json']) {
  assert(checks.on.push.paths.includes(p), 'Missing check dependency: ' + p);
}
console.log('PASS workflow YAML/JSON sanity, writer concurrency, dependencies and retired installers');

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

// Data/journal runs cannot regenerate or stage application outputs.
const stageSource=await fs.readFile('.github/scripts/ci-stage.mjs','utf8');
assert(stageSource.includes("if (mode === 'app') node('refresh-combo-build.mjs')"));
const publisherSource=await fs.readFile('.github/scripts/ci-publish.mjs','utf8');
assert(publisherSource.includes("...(mode === 'app' ? ['app-version.json', 'index.html', 'manifest.webmanifest', 'sw.js'] : [])"));
console.log('PASS data writers cannot regenerate or stage application releases');

// A verified new draw must be published even when the official feed trails the clock.
let reads=0,publishedStatus;
await updateData({run:async()=>{reads++;return {status:0}},readStatus:async()=>({latestDraw:329844,latestOfficial:{draw:329844,date:'19.10.26',time:'20:32'}}),writeStatus:async value=>{publishedStatus=value},wait:async()=>{throw new Error('Verified data must not wait')}});
assert.equal(reads,1);assert.equal(publishedStatus.latestDraw,329844);assert(publishedStatus.checkedAt);
console.log('PASS verified delayed source is published immediately instead of discarded');
