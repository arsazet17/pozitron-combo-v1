from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = '''<div class="footrow2">
<button id="tableDrawerBtn" class="nav" type="button"><b>📊</b>Таблица</button>
<div class="navSpacer"></div><div class="navSpacer"></div><div class="navSpacer"></div>
</div>'''
new = '''<div class="footrow2">
<button id="tableDrawerBtn" class="nav" type="button"><b>📊</b>Таблица</button>
<button id="intervalsBtn" class="nav" type="button" onclick="location.href='./k7-interval-builder.html'"><b>🔁</b>Интервалы</button>
<div class="navSpacer"></div><div class="navSpacer"></div>
</div>'''

if old not in s:
    raise SystemExit('Expected footer row not found; aborting without changes')
if s.count(old) != 1:
    raise SystemExit(f'Expected exactly one footer row, found {s.count(old)}')

s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('Inserted Intervals nav button only')
