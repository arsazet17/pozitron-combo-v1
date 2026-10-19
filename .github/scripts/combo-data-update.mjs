import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Preserve the existing official publication schedule and three-minute grace.
export const SCHEDULE = '00:02 00:17 00:32 01:02 01:17 01:32 02:02 02:17 02:32 03:02 03:32 04:02 04:17 04:32 05:02 05:17 05:32 06:02 06:17 06:32 07:02 07:32 08:02 08:17 08:32 09:02 09:17 09:32 10:02 10:17 10:32 11:02 11:32 12:02 12:17 12:32 13:02 13:17 13:32 14:02 14:17 14:32 15:02 15:32 16:02 16:17 16:32 17:02 17:17 17:32 18:02 18:17 18:32 19:02 19:32 20:02 20:17 20:32 21:02 21:17 21:32 22:02 22:17 22:32 23:02 23:32'.split(' ');
export function dueTarget(now = new Date()) {
  const cutoff = new Date(now.getTime() + (180 - 3) * 60000);
  const minute = cutoff.toISOString().slice(11, 16);
  const due = SCHEDULE.filter(t => t <= minute);
  if (!due.length) cutoff.setUTCDate(cutoff.getUTCDate() - 1);
  const date = cutoff.toISOString().slice(0, 10).split('-').reverse();
  date[2] = date[2].slice(-2);
  return { date: date.join('.'), time: due.at(-1) || SCHEDULE.at(-1) };
}
export function publicationStamp({ date, time } = {}) {
  if (!/^\d{2}\.\d{2}\.\d{2}$/.test(date || '') || !SCHEDULE.includes(time)) return NaN;
  const [d, m, y] = date.split('.').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const stamp = Date.UTC(2000 + y, m - 1, d, hour, minute);
  const check = new Date(stamp);
  return check.getUTCDate() === d && check.getUTCMonth() === m - 1 ? stamp : NaN;
}
const defaultOfficialRun = () => spawnSync(process.execPath, ['stoloto-combo-update-v1.mjs'], { stdio: 'inherit', timeout: 240000 });
export async function updateData({run = defaultOfficialRun, readStatus = async () => JSON.parse(await fs.readFile('combo-status-v1.json', 'utf8')), writeStatus = async status => fs.writeFile('combo-status-v1.json', JSON.stringify(status, null, 2) + '\n'), wait = ms => new Promise(resolve => setTimeout(resolve, ms))} = {}) {
  const due = process.env.COMBO_DUE_DATE && process.env.COMBO_DUE_TIME
    ? { date: process.env.COMBO_DUE_DATE, time: process.env.COMBO_DUE_TIME } : dueTarget();
  const target = publicationStamp(due);
  if (!Number.isFinite(target)) throw new Error('Invalid frozen DATA UPDATE publication target');
  console.log('DATA UPDATE: publication target', due.date, due.time);
  // Prefer the independently verified FULL20 official OAuth archive. Its importer
  // checks the last COMBO draw as an exact anchor and rejects gaps or mismatches.
  // A mirror failure falls back to COMBO's own Stoloto browser loader.
  if (run === defaultOfficialRun) {
    const mirror = spawnSync(process.execPath, ['.github/scripts/combo-full20-import.mjs'], {stdio:'inherit',timeout:35000});
    if (mirror.status === 0) {
      const status = await readStatus();
      const waiting = publicationStamp(status.latestOfficial) < target;
      await writeStatus({...status,checkedAt:new Date().toISOString(),sourceState:waiting?'waiting':'current',expectedPublication:due});
      console.log('DATA UPDATE: anchored FULL20 official mirror PASS');
      return;
    }
    console.warn('DATA UPDATE: FULL20 mirror unavailable; falling back to direct Stoloto OAuth');
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    console.log('DATA UPDATE: official verification attempt', attempt);
    const result = await run();
    if (result.status === 0) {
      const status = await readStatus();
      if (!Number.isFinite(publicationStamp(status.latestOfficial)) || Number(status.latestOfficial.draw) !== Number(status.latestDraw)) throw new Error('Invalid verified official status');
      const waiting = publicationStamp(status.latestOfficial) < target;
      await writeStatus({...status, checkedAt:new Date().toISOString(), sourceState:waiting?'waiting':'current', expectedPublication:due});
      // The clock is a freshness indicator, never a veto on verified draws.
      console.log(waiting ? 'DATA UPDATE: source delayed; publish verified tail immediately, latest #' + status.latestDraw : 'DATA UPDATE: official target reached');
      return;
    }
    if (attempt < 2) await wait(5000);
  }
  throw new Error('Official verification failed; nothing will be committed');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await updateData();
