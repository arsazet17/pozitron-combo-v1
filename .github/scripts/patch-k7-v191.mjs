import fs from 'node:fs';
const path='k7-interval-builder.html';
let s=fs.readFileSync(path,'utf8');
s=s.replace('LAB v1.9','LAB v1.9.1');
s=s.replace('k7-supabase-cloud-v19.js?v=1','k7-supabase-cloud-v19.js?v=2');
s=s.replace('После обновления или смены телефона архив восстанавливается после ввода PIN.','После обновления или смены телефона архив восстанавливается автоматически.');
s=s.replace('🔑 Архив K7: подключить','☁ Supabase: подключён');
fs.writeFileSync(path,s);
