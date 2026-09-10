import fs from 'node:fs/promises';
const rt=JSON.parse(await fs.readFile('data/xray-runtime.json','utf8'));
const f=rt.forecast;if(!f)throw new Error('Нет frozen forecast');
const req=[['predicted20',20],['combo5A',5],['combo5B',5],['combo7A',7],['combo7B',7]];
for(const [k,n] of req){if(!Array.isArray(f[k])||f[k].length!==n||new Set(f[k]).size!==n)throw new Error(`${k}: нужен размер ${n}`)}
const p=new Set(f.predicted20);for(const k of ['combo5A','combo5B','combo7A','combo7B'])if(f[k].some(n=>!p.has(n)))throw new Error(`${k}: число вне прогнозных 20`);
if(f.structure?.version!=='XRAY-STRUCTURE-4.0')throw new Error('Неверная версия структуры');
if(!Array.isArray(f.structure?.concentrationColumns)||f.structure.concentrationColumns.length!==9)throw new Error('Нет 9 столбов концентрации');
if(!Array.isArray(f.structure?.levelRows)||f.structure.levelRows.length!==9)throw new Error('Нет 9 LEVEL');
console.log(`XRAY V4 SELF-TEST PASS · source №${f.sourceDraw} → target №${f.targetDraw} · 20 + 5A/5B/7A/7B`);
