// node gen.js '<json stats>' -> info.html
const C=require('../test/load.js')()[0];const fs=require('fs');const ST=JSON.parse(process.argv[2]||'{}');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const strip=s=>s.replace(/<metadata>[\s\S]*?<\/metadata>/,'');
const R=(words,o)=>strip(C.render(words,o));
const P=(t,m,o)=>C.process(t,m,o||{det:'man'});
const GLY=require('../src/app/data/glyphs.json').glyphs;
function sign(u,box,color){const hx=u.codePointAt(0).toString(16).toUpperCase(),g=GLY[hx],bb=g.bbox,w=bb[2]-bb[0],h=bb[3]-bb[1],s=box/1000*Math.min(1,900/Math.max(w,h));const W=Math.ceil(w*s)+2,Hh=Math.ceil(h*s)+2;
 return `<svg width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}"><path fill="${color}" d="${g.d}" transform="matrix(${s.toFixed(5)} 0 0 ${(-s).toFixed(5)} ${(1-bb[0]*s).toFixed(1)} ${(Hh-1+bb[1]*s).toFixed(1)})"/></svg>`;}
const SY=['a','e','i','u','ba','bi','bu','da','di','du','ga','gi','ka','ku','la','li','lu','ma','mi','mu','na','ni','nu','ra','ri','ru','sa','ša','šu','ta','ti','tu','za','zu','an','ar','um','iš','ul'];
const grid=SY.map(v=>{const n=C.valueSign(v),s=C.signOf(n);return `<div class="cell"><div class="g">${sign(Array.from(s.u)[0],60,'#e7b46a')}</div><div class="r">${esc(v)}</div></div>`;}).join('');
const akk=P('šarrum','akk'),sux=P('lugal','sux'),ta=P('The king sees the god.','english',{lang:'akk',det:'man'}),ts=P('The king sees the god.','english',{lang:'sux',det:'man'}),nm=P('Larry Dalton','sound');
const ex=P('{d}AMAR.UTU LUGAL DINGIR.MEŠ','signs');
const sm=(w,s,t)=>R(w,{theme:t||'clay',size:s||46,width:440});
const html=`<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;overflow:hidden;background:#15110d;color:#f0e6d6;font:20px/1.45 "Segoe UI","DejaVu Sans",sans-serif;width:1600px}.w{padding:56px 64px}
h1{font:700 66px Georgia,"DejaVu Serif",serif;margin:0}.sub{color:#c4b096;font-size:24px;margin-top:6px}.by{color:#e7b46a;font-weight:700}
h2{color:#e7b46a;text-transform:uppercase;letter-spacing:3px;font-size:22px;margin:40px 0 16px;border-bottom:2px solid #3e3226;padding-bottom:8px}
.grid{display:grid;grid-template-columns:repeat(13,1fr);gap:9px}.cell{background:#1e1813;border:1px solid #3e3226;border-radius:10px;text-align:center;padding:8px 2px 6px}
.cell .g{height:64px;display:flex;align-items:center;justify-content:center}.cell .g svg{max-height:62px;max-width:100%}.cell .r{font:22px Consolas,"DejaVu Sans Mono",monospace;color:#fff}
.note{color:#c4b096;font-size:18px;margin-top:12px}.flows{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.card{background:#1e1813;border:1px solid #3e3226;border-radius:14px;padding:20px}
.card h3{margin:0 0 4px;font-size:23px}.k{color:#e7b46a;font-size:15px;text-transform:uppercase;letter-spacing:2px}.mono{font:20px Consolas,"DejaVu Sans Mono",monospace}
.step{border-left:3px solid #e7b46a;padding:6px 12px;margin:12px 0;background:#261e15;border-radius:0 8px 8px 0}.step small{display:block;color:#a8977f;font:15px "Segoe UI",sans-serif}
.arrow{color:#e7b46a;text-align:center;font-size:22px;margin:-4px 0}.out svg{max-width:100%;height:auto;display:block;border-radius:8px;margin-top:10px}
.lay{display:grid;grid-template-columns:2fr 1fr;gap:18px;align-items:start}.lay .card svg{max-width:100%;height:auto;display:block;border-radius:8px;margin:auto}
table{border-collapse:collapse;width:100%;font-size:19px}td{padding:10px 12px;border-bottom:1px solid #3e3226;vertical-align:top}td.n{font-weight:700;color:#fff;white-space:nowrap}
.hd svg{max-width:100%;height:auto;display:block;border-radius:10px}.foot{color:#8f8170;font-size:15px;margin-top:36px;border-top:1px solid #3e3226;padding-top:16px}
</style></head><body><div class="w">
<div style="display:flex;justify-content:space-between;align-items:center"><div><h1>Cuneiform Studio</h1><div class="sub">Writing and reading Akkadian and Sumerian cuneiform &middot; <span class="by">by Larry Dalton</span></div></div><div class="hd" style="width:430px">${R(P('{d}AMAR.UTU LUGAL','signs').words,{theme:'gold',size:64})}</div></div>
<h2>Syllable signs: how Akkadian was spelled</h2>
<div class="grid">${grid}</div>
<div class="note">Each wedge sign stands for a syllable (ba, šu, an) or a whole Sumerian word (LUGAL &ldquo;king&rdquo;), and many signs have several readings. The studio holds all ${ST.signs||'1,234'} signs of Noto Sans Cuneiform and ${ST.values||'7,780'} readings from the Oracc Sign List.</div>
<h2>Four ways in</h2>
<div class="flows">
<div class="card"><div class="k">Akkadian</div><h3>Spelled by syllable</h3>
<div class="step mono">šarrum<small>a word, normalised</small></div><div class="arrow">&#9660;</div>
<div class="step mono">${esc(akk.transliteration)}<small>${esc(akk.words[0].gloss.split(' | ')[0])}: CVC sign where one exists, as the scribes did</small></div>
<div class="out">${sm(akk.words,60)}</div></div>
<div class="card"><div class="k">Sumerian</div><h3>Dictionary signs</h3>
<div class="step mono">lugal<small>${esc(sux.words[0].gloss.split(' ; ')[0])}</small></div><div class="arrow">&#9660;</div>
<div class="step mono">LUGAL<small>one sign, literally &ldquo;big man&rdquo;</small></div>
<div class="out">${sm(sux.words,60,'stone')}</div><div class="note" style="font-size:15px">${ST.akk||754} Akkadian and ${ST.sux||976} Sumerian words from Wiktionary.</div></div>
<div class="card"><div class="k">English</div><h3>Translation draft</h3>
<div class="step">The king sees the god.<small>English: subject &middot; verb &middot; object</small></div><div class="arrow">&#9660;</div>
<div class="step mono">${esc(ta.translation.transliteration)}<small>Akkadian: verb last, case endings, i- = &ldquo;he&rdquo;</small></div>
<div class="step mono">${esc(ts.translation.transliteration)}<small>Sumerian: -e marks the doer, mu- starts the verb</small></div>
<div class="out">${sm(ta.words,34,'night')}</div></div>
<div class="card"><div class="k">English words &amp; names</div><h3>Written by sound</h3>
<div class="step mono">Larry Dalton<small>pronunciation (CMU dictionary) &rarr; syllables</small></div><div class="arrow">&#9660;</div>
<div class="step mono">${esc(nm.transliteration)}<small>{m} is the single upright wedge that marks a man's name on Babylonian tablets</small></div>
<div class="out">${sm(nm.words,46,'gold')}</div></div>
</div>
<h2>Two layouts</h2>
<div class="lay">
<div class="card"><div class="k">&rarr; Lines</div><div class="note" style="margin:4px 0 10px">Left to right, as cuneiform was read for most of its 3,000 years. Marduk, king of the gods.</div>${R(ex.words,{theme:'clay',size:70,width:960})}</div>
<div class="card"><div class="k">&darr; Ancient columns</div><div class="note" style="margin:4px 0 10px">Turned 90&deg;, as on early monuments such as Hammurabi's stele.</div>${R(ex.words,{style:'ancient',theme:'stone',size:44,width:300})}</div>
</div>
<h2>Reading it back (measured)</h2>
<table>
<tr><td class="n">SVG, exact</td><td>Every dictionary word the studio writes (${ST.lexWords||'1,690'} words in ${ST.svgs||434} documents): <b>${ST.svgSame||434} / ${ST.svgs||434}</b> read back to exactly the same signs.</td></tr>
<tr><td class="n">PNG and JPEG</td><td>${ST.imgN||120} new random texts (Akkadian, Sumerian, names), rendered by Chrome at 0.6&times; to 2&times;, four colour schemes, both layouts: <b>${ST.imgExact||'?'} / ${ST.imgN||120} exact</b>${ST.imgNote||''}.</td></tr>
<tr><td class="n">Not cuneiform</td><td>Latin text, noise, icons, hieroglyphs and Klingon pIqaD: <b>${ST.negOk||'?'} / ${ST.negN||'?'} refused</b> rather than guessed.</td></tr>
</table>
<div class="foot">Signs: Noto Sans Cuneiform &copy; The Noto Project Authors (SIL OFL 1.1). Sign list: Oracc Sign List (CC0). Words: Wiktionary (CC BY-SA 4.0). Pronunciations: CMU Pronouncing Dictionary (BSD). Translations are rule-based drafts.</div>
</div></body></html>`;
fs.writeFileSync(process.argv[3]||'info.html',html);
