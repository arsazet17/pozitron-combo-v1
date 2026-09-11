import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dueTarget } from './combo-data-update.mjs';

// The publisher alone owns commit/push. Every retry recomputes on fresh main.
export async function publishFresh(io, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const base = await io.prepare(attempt);
    const status = await io.reconcile(base);
    await io.verify(base);
    if (await io.remoteHead() !== base) continue;
    if (!await io.changed()) return { status, published: false };
    const candidate = await io.commit();
    if (await io.push()) return { status, published: true };
    // A network error may hide a successful push. Verify ancestry before retrying.
    if (await io.isPublished(candidate)) return { status, published: true };
  }
  throw new Error('main kept changing; no stale candidate was pushed. Rerun the writer.');
}

export async function main() {
  const mode = process.argv[2] || 'runtime';
  if (!['data', 'runtime', 'app', 'journal'].includes(mode)) throw new Error('Unknown update mode');
  const workspace = process.env.GITHUB_WORKSPACE;
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main' ||
      !workspace || path.resolve(workspace) !== path.resolve(process.cwd())) {
    throw new Error('Publisher requires an isolated GitHub Actions checkout of main');
  }
  const sourcePath = fileURLToPath(import.meta.url);
  const loadedPublisher = await fs.readFile(sourcePath, 'utf8');
  const scratch = await fs.mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'combo-publish-'));
  const baseline = path.join(scratch, 'runtime.json');
  const baselineGuard = path.join(scratch, 'runtime-guard.json');
  const due = dueTarget();
  const env = { ...process.env, COMBO_DUE_DATE: due.date, COMBO_DUE_TIME: due.time };
  const allowedPaths = [
    'combo-history-v1.json', 'combo-status-v1.json', 'combo-search-log-v1.json',
    'data/xray-runtime.json', 'data/xray-runtime.guard.json',
    'app-version.json', 'index.html', 'manifest.webmanifest', 'sw.js'
  ];
  function git(args, { capture = false, allowFailure = false } = {}) {
    const result = spawnSync('git', args, { stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8' });
    if (result.error || (!allowFailure && result.status !== 0)) throw result.error || new Error('git ' + args[0] + ' failed');
    return capture ? String(result.stdout || '').trim() : result.status;
  }
  function node(file, args = [], allowed = [0]) {
    const result = spawnSync(process.execPath, [file, ...args], { stdio: 'inherit', env });
    if (result.error || !allowed.includes(result.status)) throw result.error || new Error(file + ' failed: ' + result.status);
    return result.status;
  }
  try {
    git(['config', 'user.name', 'github-actions[bot]']);
    git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
    const result = await publishFresh({
      async prepare(attempt) {
        console.log('PUBLISH: fresh main attempt', attempt);
        git(['fetch', '--no-tags', 'origin', 'main']);
        // Safe only in the explicitly checked disposable Actions workspace.
        git(['reset', '--hard', 'origin/main']);
        if (await fs.readFile(sourcePath, 'utf8') !== loadedPublisher) {
          throw new Error('Publisher changed on main; rerun with its current version');
        }
        await fs.copyFile('data/xray-runtime.json', baseline);
        await fs.copyFile('data/xray-runtime.guard.json', baselineGuard);
        return git(['rev-parse', 'HEAD'], { capture: true });
      },
      async reconcile() {
        return node('.github/scripts/ci-stage.mjs', [mode, baseline, baselineGuard], [0, 2]);
      },
      async verify() {
        node('validate-xray-runtime.mjs', ['--baseline', baseline, '--baseline-guard', baselineGuard]);
        const changed = git(['diff', '--name-only'], { capture: true }).split('\n').filter(Boolean);
        if (changed.some(file => !allowedPaths.includes(file))) throw new Error('Unexpected source changes in generated update');
        git(['diff', '--check']);
      },
      async remoteHead() {
        git(['fetch', '--no-tags', 'origin', 'main']);
        return git(['rev-parse', 'origin/main'], { capture: true });
      },
      async changed() {
        return git(['diff', '--quiet', '--', ...allowedPaths], { allowFailure: true }) !== 0;
      },
      async commit() {
        git(['add', '--', ...allowedPaths]);
        git(['commit', '-m', 'COMBO: reconcile verified data, immutable XRAY runtime and app build']);
        return git(['rev-parse', 'HEAD'], { capture: true });
      },
      async push() { return git(['push', 'origin', 'HEAD:main'], { allowFailure: true }) === 0; },
      async isPublished(candidate) {
        git(['fetch', '--no-tags', 'origin', 'main']);
        return git(['merge-base', '--is-ancestor', candidate, 'origin/main'], { allowFailure: true }) === 0;
      }
    });
    console.log(result.published ? 'PUBLISH PASS' : 'PUBLISH: no generated changes');
    if (result.status === 2) console.error('XRAY is paused; the preserved pending and anomaly diagnostics have been published');
    process.exitCode = result.status;
  } finally {
    // scratch is created by mkdtemp under the runner temporary directory only.
    await fs.rm(scratch, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
