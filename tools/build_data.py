# Usage: python3 build_data.py <osl.asl> <NotoSansCuneiform-Regular.ttf> <folder with kaikki Akkadian/Sumerian jsonl> <out data dir>
import sys, re, json, collections, unicodedata
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
OSL, FONT, DIN, OUT = sys.argv[1:5]
font = TTFont(FONT); cmap = font.getBestCmap(); gs = font.getGlyphSet(); hm = font['hmtx']
# ---- signs from the Oracc Sign List (CC0)
signs = {}; cur = None
for ln in open(OSL, encoding='utf-8'):
    ln = ln.rstrip('\n')
    m = re.match(r'^@(sign|form)\s+(\S+)', ln)
    if m:
        if m.group(1) == 'sign': cur = {'name': m.group(2), 'u': '', 'v': []}; signs[cur['name']] = cur
        else: cur = None  # variant forms are skipped; values of the main sign are kept
        continue
    if ln.startswith('@end'): cur = None; continue
    if cur is None: continue
    m = re.match(r'^@ucun\s+(\S+)', ln)
    if m: cur['u'] = m.group(1); continue
    m = re.match(r'^@v\s+(\S+)', ln)
    if m and not m.group(1).startswith('%'):
        v = m.group(1).strip('[]?')
        if v and not v.endswith('ₓ') and 'x' not in v: cur['v'].append(v)
ok = {n: s for n, s in signs.items() if s['u'] and all(ord(c) in cmap for c in s['u'])}
val = {}
for n, s in ok.items():
    for v in s['v']:
        val.setdefault(v, n)
print('signs', len(signs), 'drawable', len(ok), 'values', len(val))
# ---- glyph outlines
G = {}
for cp in sorted(cmap):
    if not (0x12000 <= cp <= 0x1254F): continue
    gn = cmap[cp]; pen = SVGPathPen(gs); gs[gn].draw(pen); bp = BoundsPen(gs); gs[gn].draw(bp)
    if not bp.bounds: continue
    G['%X' % cp] = {'d': re.sub(r'(\d+\.\d)\d+', r'\1', pen.getCommands()), 'adv': hm[gn][0], 'bbox': [round(b) for b in bp.bounds]}
os2 = font['OS/2']
# two pairs of code points share one drawing in the font; give the second of each an empty sub-path so SVGs stay exact
seen = {}
for h in sorted(G):
    d = G[h]['d']
    if d in seen: G[h]['d'] = d + 'M0 0Z'
    else: seen[d] = h
json.dump({'upm': font['head'].unitsPerEm, 'asc': os2.sTypoAscender, 'desc': os2.sTypoDescender, 'glyphs': G}, open(OUT + '/glyphs.json', 'w'), separators=(',', ':'))
json.dump({'signs': {n: [s['u'], s['v']] for n, s in ok.items()}, 'values': val}, open(OUT + '/signs.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('glyphs', len(G), 'upm', font['head'].unitsPerEm, os2.sTypoAscender, os2.sTypoDescender)
# ---- words (Wiktionary via kaikki, CC BY-SA)
CUN = re.compile('[\U00012000-\U0001254F]')
POS = {'noun':'n','verb':'v','adj':'adj','adv':'adv','prep':'prep','pron':'pron','particle':'part','conj':'conj','num':'num','name':'name','det':'det','intj':'intj','phrase':'phr','suffix':'suf'}
def glosses(x):
    out = []
    for s in x.get('senses', []):
        if 'form-of' in s.get('tags', []) or 'alt-of' in s.get('tags', []): continue
        for g in s.get('glosses', []):
            if g and g not in out: out.append(g)
    return out
lex = []; sumero = {}
for x in map(json.loads, open(DIN + '/kaikki.org-dictionary-Akkadian.jsonl', encoding='utf-8')):
    if x.get('pos') == 'character':
        for s in x.get('senses', []):
            for g in s.get('glosses', []):
                m = re.match(r'Sumerogram of (\S+)', g)
                if m and CUN.fullmatch(x['word']) or (m and all(CUN.match(c) for c in x['word'])): sumero.setdefault(m.group(1), x['word'])
for x in map(json.loads, open(DIN + '/kaikki.org-dictionary-Akkadian.jsonl', encoding='utf-8')):
    p = POS.get(x.get('pos')); g = glosses(x)
    if not p or not g or CUN.search(x['word']): continue
    forms = {}
    for f in x.get('forms', []):
        t = f.get('tags', []); fm = f.get('form', '')
        if not fm or CUN.search(fm) or ' ' in fm: continue
        key = None
        if 'construct' in t: key = 'cst'
        elif 'pronominal-state' in t: key = 'pron'
        elif 'plural' in t and 'pl' not in forms: key = 'pl'
        elif 'feminine' in t: key = 'f'
        elif 'preterite' in t:
            if 'first-person' in t and 'singular' in t: key = 'pret1s'
            elif 'second-person' in t and 'singular' in t and 'masculine' in t: key = 'pret2s'
            elif 'third-person' in t and 'singular' in t: key = 'pret3s'
            elif 'first-person' in t and 'plural' in t: key = 'pret1p'
            elif 'third-person' in t and 'plural' in t and 'masculine' in t: key = 'pret3p'
            elif not any(k in t for k in ('first-person', 'second-person', 'third-person')): key = 'pret'
        elif 'durative' in t and not any(k in t for k in ('first-person', 'second-person', 'third-person')): key = 'dur'
        elif 'stative' in t and not any(k in t for k in ('first-person', 'second-person', 'third-person')): key = 'stat'
        elif 'imperative' in t and 'first-person' not in t and 'imp' not in forms: key = 'imp'
        if key and key not in forms: forms[key] = fm
    lex.append(['akk', x['word'], p, ' ; '.join(g)[:200], forms, sumero.get(x['word'], '')])
nsux = 0
for x in map(json.loads, open(DIN + '/kaikki.org-dictionary-Sumerian.jsonl', encoding='utf-8')):
    p = POS.get(x.get('pos')); g = glosses(x)
    if not p or not g or not CUN.search(x['word']) or not all(ord(c) in cmap for c in x['word'] if CUN.match(c)): continue
    trs = [f['form'] for f in x.get('forms', []) if 'romanization' in f.get('tags', []) and re.search(r'[a-zšŋg̃ḫ]', f['form'])]
    if not trs: continue
    lex.append(['sux', trs[0], p, ' ; '.join(g)[:200], {}, ''.join(c for c in x['word'] if CUN.match(c))]); nsux += 1
json.dump(lex, open(OUT + '/lexicon.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('lexicon akk', len(lex) - nsux, 'sux', nsux, 'sumerograms', len(sumero))
