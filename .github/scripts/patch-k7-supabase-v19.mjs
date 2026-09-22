import fs from 'node:fs';
const path='k7-interval-builder.html';
let s=fs.readFileSync(path,'utf8');
if(!s.includes('k7-supabase-cloud-v19.js')){
  s=s.replace('</script>\n</body>\n</html>','</script>\n<script src="./k7-supabase-cloud-v19.js?v=1"></script>\n</body>\n</html>');
}
s=s.replace('LAB v1.8','LAB v1.9');
s=s.replace('Основная копия сохранённых K7 хранится в GitHub. IndexedDB на телефоне используется только как локальный кэш. После смены/обновления телефона архив восстанавливается из GitHub и заново пересчитывается по общему архиву тиражей.','Основная копия сохранённых K7 хранится в Supabase. Телефон используется только как локальный кэш. После обновления или смены телефона архив восстанавливается после ввода PIN.');
s=s.replace('☁ GitHub: подключить','🔑 Архив K7: подключить');
s=s.replace('Проверка облака…','Supabase: подготовка архива…');
fs.writeFileSync(path,s);
