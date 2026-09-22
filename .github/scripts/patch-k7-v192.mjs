import fs from 'node:fs';
const path='k7-interval-builder.html';
let s=fs.readFileSync(path,'utf8');
s=s.replaceAll('LAB v1.9.1','LAB v1.9.2');
s=s.replace('k7-supabase-cloud-v19.js?v=2','k7-supabase-cloud-v19.js?v=3');
fs.writeFileSync(path,s);
