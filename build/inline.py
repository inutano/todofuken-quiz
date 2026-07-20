# build/inline.py — index.html の <link>/<script src> を実体に置換して単一HTML化
import os, re
BASE = os.path.join(os.path.dirname(__file__), '..')
html = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()

def read(rel): return open(os.path.join(BASE, rel), encoding='utf-8').read()

# <link rel="stylesheet" href="src/styles.css"> を <style> に
html = re.sub(r'<link rel="stylesheet" href="(src/[^"]+)">',
              lambda m: '<style>\n' + read(m.group(1)) + '\n</style>', html)
# <script src="src/xxx.js"></script> を <script> に（順序維持）
html = re.sub(r'<script src="(src/[^"]+)"></script>',
              lambda m: '<script>\n' + read(m.group(1)) + '\n</script>', html)

out = os.path.join(BASE, 'japan-quiz.html')
open(out, 'w', encoding='utf-8').write(html)
size = os.path.getsize(out)
assert 'src="src/' not in html and 'href="src/' not in html, '外部参照が残っている'
print(f'wrote japan-quiz.html ({size//1024} KB)')
