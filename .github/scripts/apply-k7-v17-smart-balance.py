from pathlib import Path

p=Path('k7-interval-builder.html')
s=p.read_text(encoding='utf-8')

if 'LAB v1.6' not in s:
    raise SystemExit('Expected LAB v1.6 not found')
s=s.replace('LAB v1.6','LAB v1.7',1)

old="""   const sc=countsOf(strict),mc=countsOf(soft),cur=p.length?draws.length-1-p[p.length-1]:draws.length;\n   const last=p.length?draws[p[p.length-1]]:null;\n   out.push({\n     n,cur,last,occ:p.length,freq:draws.length?p.length/draws.length:0,\n     strict,soft,strictCounts:sc,softCounts:mc,\n     strictHits:sc[cur]||0,softHits:mc[cur]||0,\n     strictRate:(sc[cur]||0)/Math.max(1,strict.length),\n     softRate:(mc[cur]||0)/Math.max(1,soft.length),\n     repeat0:sc[0]||0,score:0\n   });"""
new="""   const sc=countsOf(strict),mc=countsOf(soft),cur=p.length?draws.length-1-p[p.length-1]:draws.length;\n   const last=p.length?draws[p[p.length-1]]:null;\n   const freq=draws.length?p.length/draws.length:0;\n   const strictRate=(sc[cur]||0)/Math.max(1,strict.length);\n   const expectedStrict=freq>0?freq*Math.pow(1-freq,cur):0;\n   const strictLift=expectedStrict>0?strictRate/expectedStrict:0;\n   out.push({\n     n,cur,last,occ:p.length,freq,\n     strict,soft,strictCounts:sc,softCounts:mc,\n     strictHits:sc[cur]||0,softHits:mc[cur]||0,\n     strictRate,strictLift,expectedStrict,\n     softRate:(mc[cur]||0)/Math.max(1,soft.length),\n     repeat0:sc[0]||0,score:0\n   });"""
if old not in s: raise SystemExit('buildNumberStats block not found')
s=s.replace(old,new,1)

old="""function scoreStats(stats,mode){\n const ms=Math.max(.000001,...stats.map(s=>s.strictRate));\n const mm=Math.max(.000001,...stats.map(s=>s.softRate));\n const mf=Math.max(.000001,...stats.map(s=>s.freq));\n for(const s of stats){\n   const ns=s.strictRate/ms,nm=s.softRate/mm,nf=s.freq/mf;\n   let v=0;\n   if(mode==='strict')v=.80*ns+.20*nf;\n   else if(mode==='soft')v=.75*nm+.25*nf;\n   else v=.50*ns+.25*nm+.25*nf;\n   const support=clamp(s.occ/80,.65,1);\n   s.score=100*v*support;\n }\n stats.sort((a,b)=>b.score-a.score||b.strictHits-a.strictHits||b.softHits-a.softHits||b.freq-a.freq||a.n-b.n);\n return stats;\n}"""
new="""function scoreStats(stats,mode){\n const ml=Math.max(.000001,...stats.map(s=>Math.min(4,s.strictLift||0)));\n const ms=Math.max(.000001,...stats.map(s=>s.strictRate));\n const mm=Math.max(.000001,...stats.map(s=>s.softRate));\n const mf=Math.max(.000001,...stats.map(s=>s.freq));\n for(const s of stats){\n   const nl=Math.min(4,s.strictLift||0)/ml,ns=s.strictRate/ms,nm=s.softRate/mm,nf=s.freq/mf;\n   let v=0;\n   if(mode==='strict')v=.70*nl+.15*ns+.15*nf;\n   else if(mode==='soft')v=.55*nm+.25*nl+.20*nf;\n   else v=.40*nl+.20*ns+.20*nm+.20*nf;\n   const support=clamp(s.occ/80,.65,1);\n   s.score=100*v*support;\n }\n stats.sort((a,b)=>b.score-a.score||b.strictLift-a.strictLift||b.strictHits-a.strictHits||b.softHits-a.softHits||b.freq-a.freq||a.n-b.n);\n return stats;\n}"""
if old not in s: raise SystemExit('scoreStats block not found')
s=s.replace(old,new,1)

old="""function generateCombos(stats,draws,mode,poolN,count){\n const pool=stats.slice(0,poolN).map(s=>s.n),by=Object.fromEntries(stats.map(s=>[s.n,s])),pair=pairMatrix(draws),used=new Map(),out=[];\n const use=n=>used.get(n)||0;"""
new="""function generateCombos(stats,draws,mode,poolN,count){\n const pool=stats.slice(0,poolN).map(s=>s.n),by=Object.fromEntries(stats.map(s=>[s.n,s])),pair=pairMatrix(draws),used=new Map(),out=[];\n const poolCurCounts={};pool.forEach(n=>{const g=by[n].cur;poolCurCounts[g]=(poolCurCounts[g]||0)+1});\n const use=n=>used.get(n)||0;"""
if old not in s: raise SystemExit('generate header not found')
s=s.replace(old,new,1)

old="""       const newCol=chosen.some(x=>colOf(x)===colOf(n))?0:1;\n       let v=by[n].score*.78+compat*100*.12+newCol*6-use(n)*2.2;\n       if(mode==='balance')v=by[n].score*.66+compat*100*.20+newCol*12-use(n)*2.2;\n       v+=((n*17+k*11)%13)/1000;"""
new="""       const newCol=chosen.some(x=>colOf(x)===colOf(n))?0:1;\n       const sameInt=chosen.filter(x=>by[x].cur===by[n].cur).length;\n       const intervalShare=(poolCurCounts[by[n].cur]||1)/Math.max(1,pool.length);\n       const intervalBalance=(sameInt===0?7:0)-sameInt*(1.8+intervalShare*4);\n       let v=by[n].score*.76+compat*100*.12+newCol*6+intervalBalance-use(n)*2.2;\n       if(mode==='balance')v=by[n].score*.64+compat*100*.20+newCol*12+intervalBalance-use(n)*2.2;\n       v+=((n*17+k*11)%13)/1000;"""
if old not in s: raise SystemExit('generate score block not found')
s=s.replace(old,new,1)

old="""· Стр. <b>${s.strictHits}</b> · Мяг. <b>${s.softHits}</b> · част. ${(s.freq*100).toFixed(1)}% · 0:${s.repeat0}<br>"""
new="""· Стр. <b>${s.strictHits}</b> · Мяг. <b>${s.softHits}</b> · lift <b>${(s.strictLift||0).toFixed(2)}×</b> · част. ${(s.freq*100).toFixed(1)}% · 0:${s.repeat0}<br>"""
if old not in s: raise SystemExit('rank detail marker not found')
s=s.replace(old,new,1)

old="""   const details=c.nums.map(n=>`${fmt(n)}: инт${by[n].cur}/С${by[n].strictHits}/М${by[n].softHits}/F${(by[n].freq*100).toFixed(0)}%`).join(' · ');\n   const full7=CURRENT_DRAWS.filter(d=>c.nums.every(n=>(d.balls||[]).map(Number).includes(n))).length;"""
new="""   const details=c.nums.map(n=>`${fmt(n)}: инт${by[n].cur}/С${by[n].strictHits}/М${by[n].softHits}/L${(by[n].strictLift||0).toFixed(2)}×/F${(by[n].freq*100).toFixed(0)}%`).join(' · ');\n   const curDist=Object.entries(c.nums.reduce((o,n)=>{const g=by[n].cur;o[g]=(o[g]||0)+1;return o},{})).sort((a,b)=>Number(a[0])-Number(b[0])).map(([g,v])=>`инт${g}:${v}`).join(' · ');\n   const full7=CURRENT_DRAWS.filter(d=>c.nums.every(n=>(d.balls||[]).map(Number).includes(n))).length;"""
if old not in s: raise SystemExit('renderCombos details block not found')
s=s.replace(old,new,1)

old="""рейтинг ${c.avgScore.toFixed(1)} · пары ${(c.pairPct*100).toFixed(1)}% · столбов ${c.cols}/7 · полных 7/7 в окне: <b>${full7}</b>"""
new="""рейтинг ${c.avgScore.toFixed(1)} · пары ${(c.pairPct*100).toFixed(1)}% · столбов ${c.cols}/7 · ${curDist} · полных 7/7 в окне: <b>${full7}</b>"""
if old not in s: raise SystemExit('combo badge marker not found')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
print('K7 LAB v1.7 smart interval balance applied')
