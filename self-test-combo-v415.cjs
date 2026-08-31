'use strict';

const fs=require('fs');

function check(cond,msg){
  if(!cond) throw new Error('SELF-TEST FAIL: '+msg);
}

const sync=fs.readFileSync('stoloto-combo-update-v1.mjs','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));

// Проверки STOLOTO.
check(sync.includes('function parseColumn(text)'), 'нет parseColumn');
check(sync.includes('Столото не отдал «Столбец N»'), 'нет жёсткой проверки official column');
check(sync.includes('out.push({draw,date,time,column,balls});'), 'column не сохраняется из tail10');
check(sync.includes('reads[0].map(canonOfficial)'), 'тройная проверка не сравнивает column');
check(sync.includes('reads[i].map(canonOfficial)'), 'повторные чтения не сравнивают column');
check(sync.includes('const officialMap=new Map(stoloto.map'), 'tail10 не обновляет существующие записи');
check(sync.includes('column:official.column'), 'official column не пишется в историю');

// Проверки интерфейса.
check(html.includes('Версия v4.1.15'), 'не поднята версия v4.1.15');
check(html.includes('const c=Number(d?.column);'), 'drawColumn не читает d.column');
check(!html.includes('tied=new Set'), 'остался старый самостоятельный tie-break');
check(html.includes("drawColumn(d)??'—'"), 'для старых строк нет безопасного тире');

// Группы должны остаться законом v7.2.2.
check(
  html.includes("if(raw>=4?v>=4:v===raw)columns.push(col)"),
  'нарушена логика групп 0/1/2/3/4+'
);

// Build/SW.
check(html.includes('name="app-build"'), 'нет hidden app-build');
check(html.includes("updateViaCache:'none'"), 'SW не проверяет обновление принудительно');
check(sw.includes("const CACHE='combo-keno-shell-"), 'нет build-cache');
check(/^\.\/\?v=/.test(manifest.start_url), 'manifest start_url без build');

// Синтаксический разбор modified sync.
// import удаляем только для parser-test; код не исполняем.
const syncBody=sync.replace(/^import .*$/mg,'');
new Function(`return (async()=>{${syncBody}})`);

// Синтаксический разбор основного browser-script.
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1])
  .filter(Boolean);

check(scripts.length>0,'не найден script в index.html');
for(const code of scripts) new Function(code);

console.log('SELF-TEST PASS');
