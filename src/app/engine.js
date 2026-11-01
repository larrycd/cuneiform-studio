/* Cuneiform Studio engine 1.0.0 - by Larry Dalton.
   Shared by the browser studio and the Node tests. No network access, no external libraries.
   Sign shapes: Noto Sans Cuneiform (c) The Noto Project Authors, SIL OFL 1.1.
   Signs and readings: Oracc Sign List (OSL), CC0. Words: Wiktionary Akkadian and Sumerian entries (via kaikki.org), CC BY-SA 4.0.
   Pronunciations: CMU Pronouncing Dictionary, BSD. */
(function (root) {
'use strict';
var C = { version: '1.0.0' };
var GL = null, SIGNS = {}, VALUES = {}, BYCHAR = {}, LEX = null, ENIDX = {}, BYWORD = {}, BYFORM = {}, BYCUN = {}, NAMES = null, NAMES_REV = null;

/* ---------------------------------------------------------------- loading */
C.loadGlyphs = function (g) { GL = g; return Object.keys(g.glyphs).length; };
C.loadSigns = function (s) {
  SIGNS = s.signs; VALUES = s.values; BYCHAR = {};
  Object.keys(SIGNS).forEach(function (n) { var u = SIGNS[n][0]; if (!BYCHAR[u] || n.length < BYCHAR[u].length) BYCHAR[u] = n; });
  return Object.keys(SIGNS).length;
};
C.signOf = function (name) { return SIGNS[name] ? { name: name, u: SIGNS[name][0], values: SIGNS[name][1] } : null; };
C.nameOfChar = function (u) { return BYCHAR[u] || null; };

/* Transliteration: accept plain ASCII (sz s, t, h, ng, digits for subscripts) and turn it into standard forms */
var SUB = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
function normVal(v) {
  v = v.normalize('NFC').toLowerCase().replace(/sz/g, 'š').replace(/s,/g, 'ṣ').replace(/t,/g, 'ṭ').replace(/h(?![a-z])/g, 'ḫ').replace(/j/g, 'g̃').replace(/ŋ/g, 'g̃')
    .replace(/[áà]/g, function (c) { return c === 'á' ? 'a₂' : 'a₃'; }).replace(/[éè]/g, function (c) { return c === 'é' ? 'e₂' : 'e₃'; })
    .replace(/[íì]/g, function (c) { return c === 'í' ? 'i₂' : 'i₃'; }).replace(/[úù]/g, function (c) { return c === 'ú' ? 'u₂' : 'u₃'; });
  return v.replace(/([a-zšṣṭḫĝg̃ʾ])(\d+)$/, function (m, a, d) { return a + d.split('').map(function (x) { return SUB[x]; }).join(''); });
}
function valueSign(v) {
  var n = normVal(v);
  if (VALUES[n]) return VALUES[n];
  var alt = n.replace(/g̃/g, 'ŋ'); if (VALUES[alt]) return VALUES[alt];
  alt = n.replace(/ḫ/g, 'h'); if (VALUES[alt]) return VALUES[alt];
  return null;
}
C.valueSign = valueSign;
function stripLen(s) { return s.normalize('NFD').replace(/[̄̂́̀]/g, '').normalize('NFC'); }

C.loadLexicon = function (rows) {
  LEX = []; ENIDX = {}; BYWORD = {}; BYFORM = {}; BYCUN = {};
  rows.forEach(function (r) {
    var e = { lang: r[0], word: r[1], pos: r[2], gloss: r[3], forms: r[4] || {}, cun: r[0] === 'sux' ? r[5] : '', sumerogram: r[0] === 'akk' ? r[5] : '' };
    LEX.push(e);
    var k = e.lang + ':' + stripLen(e.word.toLowerCase()).replace(/[-.\s]/g, '');
    (BYWORD[k] = BYWORD[k] || []).push(e);
    if (e.cun) (BYCUN[e.cun] = BYCUN[e.cun] || []).push(e);
    if (e.lang === 'akk') { // inflected forms, so the reader recognises them: dictionary forms plus the -am / -im case endings
      var FL = { cst: 'construct', pron: 'with suffix', pl: 'plural', f: 'feminine', pret: 'past', pret1s: 'past, I', pret2s: 'past, you', pret3s: 'past, he/she', pret1p: 'past, we', pret3p: 'past, they', dur: 'present', stat: 'stative', imp: 'command' };
      var addF = function (f, label) { var fk = 'akk:' + stripLen(f.toLowerCase()).replace(/[-.\s]/g, ''); if (fk !== k && !(BYFORM[fk] || []).some(function (x) { return x.e === e; })) (BYFORM[fk] = BYFORM[fk] || []).push({ e: e, form: f, label: label }); };
      var caseF = function (f, base) { if (/um$/.test(f)) { addF(f.replace(/um$/, 'am'), (base ? base + ', ' : '') + 'object (accusative)'); addF(f.replace(/um$/, 'im'), (base ? base + ', ' : '') + 'genitive'); } };
      caseF(e.word, '');
      Object.keys(e.forms).forEach(function (fk2) { String(e.forms[fk2]).split(/,\s*/).forEach(function (f) { if (f) { addF(f, FL[fk2] || fk2); caseF(f, FL[fk2] || fk2); } }); });
    }
    e.gloss.split(/\s;\s/).forEach(function (sg, si) {
      var segStat = false;
      sg.split(/,\s*/).forEach(function (part, pi) {
        var p = part.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[“”"’]/g, '').replace(/[^a-z' -]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!p) return;
        var stative = false, m = /^to (be(come)? )?(.+)$/.exec(p);
        if (m) { stative = !!m[1]; p = m[3]; segStat = segStat || stative; } else if (segStat && e.pos === 'v') stative = true;
        p = p.replace(/^(a|an|the) /, '');
        [p, p.split(' ')[0]].forEach(function (key, ki) {
          if (!key || (ki && key === p)) return;
          var exact = sg.toLowerCase().replace(/^to (be(come)? )?/, '').trim() === key ? 0.6 : 0;
          (ENIDX[key] = ENIDX[key] || []).push({ e: e, stative: stative, score: exact - si * 1.2 - pi * 0.3 - ki * 0.8 - (e.pos === 'name' ? 1 : 0) + Math.min(0.4, Object.keys(e.forms).length * 0.05) - (/only attested|rare|emesal|obsolete|dialect/i.test(e.gloss) ? 1 : 0) });
        });
      });
    });
  });
  Object.keys(ENIDX).forEach(function (k) { ENIDX[k].sort(function (a, b) { return b.score - a.score; }); });
  return LEX.length;
};
C.lookupWord = function (lang, w) {
  var k = function (x) { return lang + ':' + stripLen(x.toLowerCase()).replace(/[-.\s]/g, ''); };
  var hit = BYWORD[k(w)]; if (hit) return hit;
  if (lang === 'sux') { // ASCII forms: e2 -> e₂, ng -> g̃, sz -> š
    var n = w.split(/[-.]/).map(normVal).join('-'); hit = BYWORD[k(n)] || BYWORD[k(n.replace(/ng/g, 'g̃'))]; if (hit) return hit;
  }
  return [];
};
C.lookupEnglish = function (w, lang, pos) {
  var c = (ENIDX[w.toLowerCase()] || []).filter(function (x) { return !lang || x.e.lang === lang; });
  if (pos) c = c.filter(function (x) { return pos === 'adj' ? (x.stative || x.e.pos === 'adj') : x.e.pos === pos; });
  return c;
};

/* ------------------------------------------------- Akkadian spelled with syllable signs */
var AV = { a:1, e:1, i:1, u:1 };
/* Split an Akkadian word (normalised, e.g. šarrum, ilum) into syllables, then write each with signs:
   a CVC sign when one exists, otherwise CV + VC (e.g. šar-ru-um or ša-ar-ru-um), as the scribes did. */
function akkSyllables(word) {
  var w = stripLen(word.toLowerCase()).replace(/h/g, 'ḫ').replace(/[^a-zšṣṭḫʾ]/g, '');
  var L = []; for (var i = 0; i < w.length; i++) L.push(w[i]);
  var syl = [], cur = '';
  for (var k = 0; k < L.length; k++) {
    var c = L[k];
    if (AV[c]) {
      if (cur && AV[cur[cur.length - 1]]) { syl.push(cur); cur = ''; }
      cur += c;
      var rest = L.slice(k + 1), nextV = rest.findIndex(function (x) { return AV[x]; });
      var cons = nextV < 0 ? rest.length : nextV;
      if (nextV < 0) { cur += rest.join(''); syl.push(cur); cur = ''; break; }
      if (cons >= 2) { cur += rest[0]; syl.push(cur); cur = rest.slice(1, cons).join(''); k += cons; }
      else { syl.push(cur); cur = ''; }
    } else cur += c;
  }
  if (cur) syl.push(cur);
  return syl.filter(Boolean);
}
C.akkSyllables = akkSyllables;
function writeSyllable(s) {
  if (valueSign(s)) return [s];
  var m = /^([^aeiu]*)([aeiu])([^aeiu]*)$/.exec(s);
  if (!m) return s.split('').filter(function (c) { return valueSign(c); });
  var on = m[1], v = m[2], co = m[3], out = [];
  if (on.length > 1) { out.push(on[0] + v); on = on.slice(1); } // cluster: helper vowel
  var extra = co.length > 1 ? co.slice(1) : ''; co = co.slice(0, 1);
  if (on && co && valueSign(on + v + co)) out.push(on + v + co);
  else { if (on) out.push(on + v); else if (!co) out.push(v); if (co) out.push(v + co); if (!on && co && !valueSign(v + co)) out.push(v); }
  extra.split('').forEach(function (c) { out.push(c + v); }); // final clusters: echo the vowel (e.g. ber-n -> be-er-ne)
  return out.filter(function (x) { return valueSign(x) || (x.length && valueSign(x)); });
}
C.spellAkkadian = function (word) {
  var parts = []; akkSyllables(word).forEach(function (s) { parts = parts.concat(writeSyllable(s)); });
  return parts.filter(function (p) { return valueSign(p); }).join('-');
};

/* --------------------------------------------- names and English words: by sound */
var ARPA = { B:['b'], P:['p'], F:['p'], V:['b'], M:['m'], N:['n'], NG:['n','g'], R:['r'], L:['l'], HH:['ḫ'], K:['k'], G:['g'], S:['s'], Z:['z'],
  SH:['š'], ZH:['š'], T:['t'], D:['d'], TH:['t'], DH:['d'], CH:['š'], JH:['z'], Y:['y'], W:['w'],
  AA:['a'], AE:['a'], AH:['a'], AO:['u'], AW:['a','u'], AY:['a','i'], EH:['e'], ER:['e','r'], EY:['e'], IH:['i'], IY:['i'], OW:['u'], OY:['u','i'], UH:['u'], UW:['u'] };
function soundsToWord(seq) {
  var s = seq.join('').replace(/([^aeiu])\1+/g, '$1').replace(/y(?=[aeiu])/g, 'i').replace(/w(?=[aeiu])/g, 'u').replace(/[yw]/g, '');
  s = s.replace(/([aeiu])\1+/g, '$1');
  return s;
}
function soundSpell(s) {
  // syllabify with helper vowels so every syllable can be written with standard CV / VC / CVC signs
  var parts = []; akkSyllables(s).forEach(function (x) { parts = parts.concat(writeSyllable(x)); });
  return parts.filter(function (p) { return valueSign(p); });
}
C.fromArpabet = function (phones) {
  var seq = []; phones.trim().split(/\s+/).forEach(function (p) { (ARPA[p.replace(/[0-9]/g, '')] || []).forEach(function (l) { seq.push(l); }); });
  return soundSpell(soundsToWord(seq)).join('-');
};
var GRAPH = [[/^sh|^ch/, 'š'], [/^th/, 't'], [/^ph/, 'p'], [/^ck|^c(?![eiy])|^q/, 'k'], [/^c/, 's'], [/^x/, 'ks'], [/^j/, 'z'], [/^f/, 'p'], [/^v/, 'b'], [/^h/, 'ḫ'], [/^o/, 'u'], [/^y(?=[aeiou])/, 'y'], [/^y/, 'i'], [/^[a-z]/, null]];
C.fromSpelling = function (word) {
  var w = word.toLowerCase().replace(/[^a-z]/g, ''), seq = [];
  while (w.length) { for (var i = 0; i < GRAPH.length; i++) { var m = GRAPH[i][0].exec(w); if (m) { seq.push(GRAPH[i][1] === null ? m[0] : GRAPH[i][1]); w = w.slice(m[0].length); break; } } }
  return soundSpell(soundsToWord(seq)).join('-');
};
C.loadNames = function (tsv) { NAMES = {}; NAMES_REV = null; tsv.split('\n').forEach(function (ln) { var t = ln.indexOf('\t'); if (t > 0) { var w = ln.slice(0, t); if (!NAMES[w]) NAMES[w] = ln.slice(t + 1).trim(); } }); return Object.keys(NAMES).length; };
C.namesLoaded = function () { return !!NAMES; };
C.spellBySound = function (word) {
  var w = word.toLowerCase().replace(/[’]/g, "'");
  if (NAMES && NAMES[w]) return { tr: NAMES[w], source: 'pronunciation' };
  var c = w.replace(/[^a-z]/g, ''); if (NAMES && NAMES[c]) return { tr: NAMES[c], source: 'pronunciation' };
  return { tr: C.fromSpelling(c), source: 'spelling rules' };
};
C.soundCandidates = function (tr, limit) {
  if (!NAMES) return [];
  if (!NAMES_REV) { NAMES_REV = {}; Object.keys(NAMES).forEach(function (w) { (NAMES_REV[NAMES[w]] = NAMES_REV[NAMES[w]] || []).push(w); }); }
  return (NAMES_REV[tr] || []).slice(0, limit || 8);
};

/* ------------------------------------------------- transliteration -> signs */
/* A word in transliteration: values joined by - or . ; {d} {ki} {m} {f} determinatives; UPPER CASE for sign names (logograms). */
C.parseWord = function (tok) {
  var out = [], errors = [];
  var t = tok.replace(/ᵈ/g, '{d}-').replace(/ᵐ/g, '{m}-').replace(/ᶠ/g, '{f}-').replace(/\{([^}]+)\}/g, '-{$1}-');
  t.split(/[-.\s]+/).filter(Boolean).forEach(function (p) {
    var det = /^\{(.+)\}$/.exec(p); if (det) p = det[1];
    var name = null;
    if (/^[A-ZŠṢṬḪĜŊ][A-ZŠṢṬḪĜŊ0-9₀-₉×.()@]*$/.test(p) && SIGNS[p.replace(/(\d+)$/, function (d) { return d.split('').map(function (x) { return SUB[x]; }).join(''); })]) name = p.replace(/(\d+)$/, function (d) { return d.split('').map(function (x) { return SUB[x]; }).join(''); });
    else if (/^[A-ZŠṢṬḪĜŊ]/.test(p) && SIGNS[p.toUpperCase()]) name = p.toUpperCase();
    else name = valueSign(p);
    if (!name && SIGNS[p.toUpperCase()]) name = p.toUpperCase();
    if (!name) { errors.push('no sign for "' + p + '"'); return; }
    out.push({ name: name, value: det ? '{' + p + '}' : p, u: SIGNS[name][0], det: !!det });
  });
  return { signs: out, errors: errors };
};
function wordFromSigns(list, info) { return Object.assign({ signs: list }, info || {}); }

/* ---------------------------------------------------- English -> Akkadian / Sumerian (draft) */
var PRON = { i:'1s', me:'1s', you:'2s', he:'3sm', him:'3sm', she:'3sf', her:'3sf', it:'3sm', we:'1p', us:'1p', they:'3p', them:'3p' };
var POSS = { my:'1s', your:'2s', his:'3sm', her:'3sf', its:'3sm', our:'1p', their:'3p' };
var AKK = {
  indep: { '1s':'anāku', '2s':'atta', '3sm':'šū', '3sf':'šī', '1p':'nīnu', '3p':'šunu' },
  suffix: { '1s':'ī', '2s':'ka', '3sm':'šu', '3sf':'ša', '1p':'ni', '3p':'šunu' },
  objsuf: { '1s':'anni', '2s':'ka', '3sm':'šu', '3sf':'ši', '1p':'niāti', '3p':'šunūti' },
  stat: { '1s':'āku', '2s':'āta', '3sm':'', '3sf':'at', '1p':'ānu', '3p':'ū' },
  prefix: { '1s':'a', '2s':'ta', '3sm':'i', '3sf':'i', '1p':'ni', '3p':'i' },
  neg: 'ul', prep: { 'in':'ina', at:'ina', on:'ina', from:'ina', to:'ana', 'for':'ana', into:'ana', 'with':'itti' }
};
var SUX = {
  indep: { '1s':'g̃e₂₆', '2s':'za', '3sm':'e-ne', '3sf':'e-ne', '1p':'me', '3p':'e-ne-ne' },
  suffix: { '1s':'g̃u₁₀', '2s':'zu', '3sm':'a-ni', '3sf':'a-ni', '1p':'me', '3p':'a-ne-ne' },
  neg: 'nu', prep: { 'in':'a', at:'a', on:'a', to:'še₃', 'for':'ra', from:'ta', 'with':'da' }
};
var IRR = { am:'be', is:'be', are:'be', was:'be', were:'be', saw:'see', went:'go', gave:'give', made:'make', came:'come', ate:'eat', knew:'know', spoke:'speak', said:'say', heard:'hear', took:'take', built:'build', wrote:'write', loved:'love', men:'man', women:'woman', children:'child', gods:'god', people:'person', did:'do', does:'do', has:'have', had:'have' };
var DETS = { the:1, a:1, an:1 };
function lemmas(w) {
  var out = [w]; if (IRR[w]) out.unshift(IRR[w]);
  if (/ies$/.test(w)) out.push(w.slice(0, -3) + 'y'); if (/es$/.test(w)) out.push(w.slice(0, -2)); if (/s$/.test(w)) out.push(w.slice(0, -1));
  if (/ed$/.test(w)) { out.push(w.slice(0, -2)); out.push(w.slice(0, -1)); } if (/ing$/.test(w)) { out.push(w.slice(0, -3)); out.push(w.slice(0, -3) + 'e'); }
  return out;
}
function findEn(w, lang, pos) {
  var ls = lemmas(w);
  for (var i = 0; i < ls.length; i++) { var c = C.lookupEnglish(ls[i], lang, pos); if (c.length) return { hit: c[0], lemma: ls[i], plural: ls[i] !== w && pos === 'n' }; }
  return null;
}
C.findEnglish = findEn;
function akkStem(word) { return stripLen(word).replace(/(um|am|im|u|a|i)$/, function (m) { return ''; }); }
function akkNoun(e, kase, poss, plural) {
  var w = e.word, base = w.replace(/(um|u)$/, '');
  if (poss) { var st = e.forms.pron || e.forms.cst || base; return st.replace(/[ui]$/, function (m) { return poss === '1s' ? '' : m; }) + (poss === '1s' && !/[aeiuāēīū]$/.test(st) ? 'ī' : AKK.suffix[poss] === 'ī' ? '' : AKK.suffix[poss]); }
  if (plural) return (e.forms.pl || base + 'ū').replace(/ū$/, kase === 'nom' ? 'ū' : 'ī');
  if (!/um$/.test(w)) return w;
  return base + ({ nom: 'um', acc: 'am', gen: 'im' }[kase] || 'um');
}
function akkStative(e, person) {
  if (e.forms.stat && person === '3sm') return e.forms.stat;
  var base = stripLen(e.word).replace(/(um|u|a|i)$/, '');
  if (e.pos === 'adj' || e.pos === 'v') {
    if (/ûm$/.test(e.word)) base = stripLen(e.word.replace(/ûm$/, '')) + 'i';
    else if (/^[^aeiuāēīū]+a[^aeiuāēīū]ā[^aeiuāēīū]um$/.test(e.word)) base = stripLen(e.word).replace(/^([^aeiu]+)a([^aeiu])a([^aeiu])um$/, '$1a$2i$3');
    else base = base.replace(/^([^aeiu]+)a([^aeiu])([^aeiu])$/, '$1a$2i$3');
    if (person === '3sm') return base;
    return base.replace(/^([^aeiu]+a[^aeiu])i([^aeiu])$/, '$1$2') + AKK.stat[person];
  }
  if (person === '3sm') return e.forms.cst || base;
  return base + AKK.stat[person];
}
function akkVerb(e, subj) {
  var f = e.forms, p = subj || '3sm';
  var key = { '1s': 'pret1s', '2s': 'pret2s', '3sm': 'pret3s', '3sf': 'pret3s', '1p': 'pret1p', '3p': 'pret3p' }[p];
  if (f[key]) return f[key];
  var base = f.pret || f.pret3s;
  if (base && /^i/.test(base)) { var r = base.replace(/^i/, AKK.prefix[p]); return p === '3p' ? r + 'ū' : r; }
  if (base) return base;
  return e.word;
}
function nounPhrase(ws, orig, lang) {
  ws = ws.filter(function (w) { return !DETS[w]; });
  if (!ws.length) return null;
  if (ws.length === 1 && PRON[ws[0]]) return { pron: PRON[ws[0]], en: ws[0] };
  var poss = null, adjs = [], head = null;
  for (var i = 0; i < ws.length; i++) {
    if (POSS[ws[i]]) { poss = POSS[ws[i]]; continue; }
    if (i < ws.length - 1) { var a = findEn(ws[i], lang, 'adj'); if (a) { adjs.push({ en: ws[i], a: a }); continue; } }
    head = ws[i]; break;
  }
  if (!head) return null;
  var cap = orig[head] && /^[A-Z]/.test(orig[head]);
  var n = cap ? null : findEn(head, lang, 'n');
  return { head: head, entry: n ? n.hit.e : null, plural: n ? n.plural : false, poss: poss, adjs: adjs, name: !n, cap: cap };
}
C.translateEnglish = function (text, lang) {
  if (!LEX) throw new Error('lexicon not loaded');
  lang = lang || 'akk';
  var sents = (text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*/g) || []).map(function (s) { return draft(s.trim(), lang); }).filter(Boolean);
  var conf = sents.length ? sents.reduce(function (a, s) { return a + s.confidence; }, 0) / sents.length : 0;
  return { lang: lang, sentences: sents, transliteration: sents.map(function (s) { return s.text; }).join(' '), confidence: Math.round(conf * 100) / 100 };
};
function draft(s, lang) {
  var orig = {}; s.replace(/[A-Za-z']+/g, function (w) { orig[w.toLowerCase()] = w; });
  var low = s.toLowerCase().replace(/n't\b/g, ' not').replace(/'m\b/g, ' am').replace(/'re\b/g, ' are').replace(/'s\b/g, ' is');
  var ws = low.replace(/[^a-z' ]+/g, ' ').trim().split(/\s+/).filter(Boolean); if (!ws.length) return null;
  var words = [], notes = [], neg = false, ok = 0, total = 0;
  function W(text, en, how, gloss, kind) { words.push({ text: text, en: en, how: how, gloss: gloss || '', kind: kind || 'word', lang: lang }); total++; if (!/by sound/.test(how)) ok++; }
  var whole = C.lookupEnglish(ws.join(' '), lang).filter(function (x) { return ws.length === 1 || x.e.pos === 'phr'; });
  if (whole.length && ws.length === 1) { var e0 = whole[0].e; W(lang === 'akk' ? e0.word : e0.word, ws[0], 'dictionary', e0.gloss); return finish(0.8); }
  ws = ws.filter(function (w) { if (w === 'not' || w === 'never') { neg = true; return false; } return !/^(do|does|did|will|shall)$/.test(w); });
  var P = lang === 'akk' ? AKK : SUX;
  var pps = [], core = [];
  for (var i = 0; i < ws.length; i++) {
    if (P.prep[ws[i]] && i > 0) { var j = i + 1; while (j < ws.length && !P.prep[ws[j]]) j++; var np = nounPhrase(ws.slice(i + 1, j), orig, lang); if (np) { pps.push({ p: ws[i], np: np }); i = j - 1; continue; } }
    core.push(ws[i]);
  }
  ws = core;
  var vi = -1, verb = null, isBe = false;
  for (var k = 0; k < ws.length; k++) {
    if (lemmas(ws[k])[0] === 'be') { vi = k; isBe = true; break; }
    if (k === 0 && PRON[ws[k]]) continue;
    if (k > 0 && (DETS[ws[k - 1]] || POSS[ws[k - 1]])) continue;
    var v = findEn(ws[k], lang, 'v');
    if (v && !v.hit.stative && (k > 0 || ws.length === 1 || !findEn(ws[k], lang, 'n'))) { vi = k; verb = v; break; }
  }
  var subj = vi > 0 ? nounPhrase(ws.slice(0, vi), orig, lang) : null, rest = vi >= 0 ? ws.slice(vi + 1) : ws;
  function npOut(np, kase) {
    if (!np) return;
    if (np.name) { var sp = C.spellBySound(orig[np.head] || np.head); W(sp.tr, np.head, (np.cap ? 'name' : 'not in dictionary') + ': by sound (' + sp.source + ')', '', 'name'); return; }
    var e = np.entry, t;
    if (lang === 'akk') t = akkNoun(e, kase, np.poss, np.plural);
    else { t = e.word + (np.plural ? '-me-eš' : '') + (np.poss ? '-' + SUX.suffix[np.poss] : '') + (kase === 'erg' ? '-e' : ''); }
    W(t, np.head, 'dictionary' + (lang === 'akk' && e.word.match(/um$/) ? ' (' + ({ nom: 'subject', acc: 'object', gen: 'after a preposition' }[kase] || 'subject') + ' ending)' : '') + (np.poss ? ' + possessive' : ''), e.gloss);
    np.adjs.forEach(function (a) { var ae = a.a.hit.e; W(lang === 'akk' ? akkNoun(ae, kase) : ae.word, a.en, 'dictionary (adjective after noun)', ae.gloss); });
  }
  if (vi < 0) {
    ws.filter(function (w) { return !DETS[w] && w !== 'and'; }).forEach(function (w) { npOut(nounPhrase([w], orig, lang), 'nom'); });
    notes.push('no verb found: written as a list of words');
  } else if (isBe) {
    var pr = rest.filter(function (w) { return !DETS[w]; }), adj = pr.length === 1 ? findEn(pr[0], lang, 'adj') : null;
    var person = subj && subj.pron ? subj.pron : '3sm';
    if (lang === 'akk') {
      if (subj && !subj.pron) npOut(subj, 'nom');
      if (adj || pr.length) {
        var pe = adj ? adj.hit.e : (nounPhrase(pr, orig, lang) || {}).entry;
        if (pe) { W((neg ? 'ul ' : '') + akkStative(pe, person), pr.join(' '), 'stative ("is …")', pe.gloss); notes.push('"to be" written with the stative: ' + (person === '3sm' ? 'no ending' : 'ending -' + AKK.stat[person])); }
        else npOut(nounPhrase(pr, orig, lang), 'nom');
      }
    } else {
      if (subj && !subj.pron) npOut(subj, 'abs'); else if (subj) W(SUX.indep[subj.pron], subj.en, 'pronoun');
      if (adj) { W(adj.hit.e.word, pr[0], 'dictionary (quality)', adj.hit.e.gloss); }
      else { var pn = nounPhrase(pr, orig, lang); if (pn) npOut(pn, 'abs'); }
      W((neg ? 'nu-' : '') + 'am₃', 'is', 'copula -am₃'); notes.push('Sumerian copula -am₃ ("it is")');
    }
  } else {
    var obj = rest.length ? nounPhrase(rest, orig, lang) : null, ve = verb.hit.e;
    var sp2 = subj && subj.pron ? subj.pron : (subj && subj.plural ? '3p' : '3sm');
    if (lang === 'akk') {
      if (subj && !subj.pron) npOut(subj, 'nom');
      if (obj && !obj.pron) npOut(obj, 'acc');
      pps.forEach(function (p) { W(AKK.prep[p.p], p.p, 'preposition'); npOut(p.np, 'gen'); }); pps = [];
      var vf = akkVerb(ve, sp2) + (obj && obj.pron ? AKK.objsuf[obj.pron] : '');
      W((neg ? 'ul ' : '') + vf, ws[vi], 'dictionary (verb, past tense' + (obj && obj.pron ? ', object ending' : '') + ')', ve.gloss);
      notes.push('Akkadian order: subject, object, verb last; the verb shows the subject with its prefix');
    } else {
      if (subj && !subj.pron) npOut(subj, obj ? 'erg' : 'abs');
      if (obj && !obj.pron) npOut(obj, 'abs');
      pps.forEach(function (p) { npOut(p.np, 'abs'); W('-' + SUX.prep[p.p], p.p, 'case ending'); }); pps = [];
      var vparts = ve.word.split(' '), vlast = vparts.pop();
      W((vparts.length ? vparts.join(' ') + ' ' : '') + (neg ? 'nu-' : '') + 'mu-' + vlast.replace(/^-/, ''), ws[vi], 'dictionary (verb with the prefix mu-' + (vparts.length ? '; compound verb' : '') + ')', ve.gloss);
      notes.push('Sumerian order: subject (with -e when there is an object), object, verb last; the verb chain is simplified');
    }
  }
  pps.forEach(function (p) { if (lang === 'akk') { W(AKK.prep[p.p], p.p, 'preposition'); npOut(p.np, 'gen'); } else { npOut(p.np, 'abs'); W('-' + SUX.prep[p.p], p.p, 'case ending'); } });
  if (!words.length) { s.split(/\s+/).forEach(function (w) { var c = w.replace(/[^A-Za-z]/g, ''); if (c) { var sp = C.spellBySound(c); W(sp.tr, c, 'not in dictionary: by sound', '', 'name'); } }); notes.push('no structure recognised: words written by sound'); return finish(0.1); }
  return finish(Math.min(lang === 'akk' ? 0.75 : 0.6, (total ? ok / total : 0) * (lang === 'akk' ? 0.75 : 0.6)));
  function finish(conf) { return { english: s, words: words, text: words.map(function (w) { return w.text; }).join(' ').replace(/ -/g, '-'), notes: notes, confidence: Math.round(conf * 100) / 100 }; }
}

/* ----------------------------------------------- one call: any input -> words of signs */
/* mode: 'akk' Akkadian (normalised or syllabic), 'sux' Sumerian, 'signs' exact transliteration / sign names,
   'sound' English words and names by sound, 'english' translation draft (opts.lang 'akk' | 'sux') */
var DET = { man: 'm', woman: 'f', god: 'd' };
C.process = function (text, mode, opts) {
  opts = opts || {};
  var res = { input: text, mode: mode, words: [], notes: [] };
  function pushWord(signs, info) { if (signs.length) res.words.push(Object.assign({ signs: signs }, info)); }
  function fromTr(tr, info) { var p = C.parseWord(tr); res.notes = res.notes.concat(p.errors); pushWord(p.signs, Object.assign({ tr: tr }, info)); }
  function soundWord(src, det) {
    var sp = C.spellBySound(src), tr = (det ? '{' + det + '}' : '') + sp.tr;
    fromTr(tr, { src: src, kind: 'name', how: 'by sound (' + sp.source + ')', candidates: C.soundCandidates(sp.tr, 6) });
  }
  if (mode === 'english') {
    var lang = opts.lang || 'akk', t = C.translateEnglish(text, lang); res.translation = t;
    t.sentences.forEach(function (s) { s.words.forEach(function (w) {
      if (w.kind === 'name') { soundWord(w.en, w.how.indexOf('name') === 0 && opts.det && opts.det !== 'none' ? DET[opts.det] : null); return; }
      w.text.split(/\s+/).forEach(function (part) {
        if (/^-/.test(part) && res.words.length) { var p = C.parseWord(part.replace(/^-/, '')); var last = res.words[res.words.length - 1]; last.signs = last.signs.concat(p.signs); last.tr += part; return; }
        var tr = lang === 'akk' && !/-/.test(part) && part !== 'ul' && part !== 'ina' && part !== 'ana' ? C.spellAkkadian(part) : part === 'ul' ? 'ul' : part === 'ina' ? 'i-na' : part === 'ana' ? 'a-na' : part === 'itti' ? 'it-ti' : part;
        if (lang === 'sux') { var hit = C.lookupWord('sux', part.split('-')[0]); tr = part; }
        fromTr(tr, { src: w.en, norm: part, kind: 'word', how: w.how, gloss: w.gloss });
      });
    }); });
  } else {
    text.replace(/[\r\n]+/g, ' ').split(/\s+/).filter(Boolean).forEach(function (tok) {
      var core = tok.replace(/[,.;:!?"]+$/g, ''); if (!core) return;
      if (mode === 'signs') { fromTr(core, { src: core, kind: 'signs', how: 'signs as written' }); return; }
      if (mode === 'sound') { soundWord(core, opts.det && opts.det !== 'none' ? DET[opts.det] : null); return; }
      if (mode === 'akk') {
        var es = C.lookupWord('akk', core);
        if (/-/.test(core) || /[A-Z]{2}/.test(core)) { fromTr(core, { src: core, kind: es.length ? 'word' : 'signs', how: 'syllables as written', gloss: es.length ? es[0].gloss : '' }); return; }
        var sp = C.spellAkkadian(core);
        fromTr(sp, { src: core, norm: core, kind: es.length ? 'word' : 'unverified', how: es.length ? 'dictionary, written by syllable' : 'not in dictionary: written by syllable', gloss: es.length ? es.map(function (x) { return x.gloss.split(' ; ')[0]; }).slice(0, 3).join(' | ') : '', sumerogram: es.length && es[0].sumerogram ? es[0].sumerogram : '' });
        return;
      }
      if (mode === 'sux') {
        var sx = C.lookupWord('sux', core);
        if (sx.length && !/-/.test(core)) { var e = sx[0]; pushWord(Array.from(e.cun).map(function (u) { var n = BYCHAR[u] || u; return { name: n, value: n.toLowerCase(), u: u }; }), { src: core, tr: e.word, kind: 'word', how: 'dictionary', gloss: sx.map(function (x) { return x.gloss.split(' ; ')[0]; }).slice(0, 3).join(' | ') }); return; }
        fromTr(core, { src: core, kind: sx.length ? 'word' : 'unverified', how: sx.length ? 'dictionary' : 'not in dictionary: signs by value', gloss: sx.length ? sx[0].gloss : '' });
      }
    });
  }
  res.transliteration = res.words.map(function (w) { return w.tr; }).join(' ');
  res.unicode = res.words.map(function (w) { return w.signs.map(function (s) { return s.u; }).join(''); }).join(' ');
  res.signNames = res.words.map(function (w) { return w.signs.map(function (s) { return s.name; }).join('.'); }).join(' ');
  return res;
};

/* -------------------------------------------------------------- rendering */
var THEMES = { clay: { bg: '#d9b98c', ink: '#3b2a1a' }, stone: { bg: '#cfcac0', ink: '#262626' }, night: { bg: '#121212', ink: '#f2e9da' }, gold: { bg: '#141a26', ink: '#d4af37' } };
C.THEMES = THEMES;
var TRACK = 200, WORDGAP = 900;
function n2(v) { return (Math.round(v * 100) / 100).toString(); }
function n6(v) { return (Math.round(v * 1e6) / 1e6).toString(); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function chars(words) { // characters with word breaks
  var out = [];
  words.forEach(function (w, wi) { if (wi) out.push({ gap: true }); w.signs.forEach(function (s) { Array.from(s.u).forEach(function (u) { var h = u.codePointAt(0).toString(16).toUpperCase(); if (GL.glyphs[h]) out.push({ hex: h }); }); }); });
  return out;
}
/* style 'lines' (left to right) or 'ancient' (the same lines turned 90 degrees clockwise: columns read top to bottom, right to left) */
C.render = function (words, opts) {
  opts = opts || {}; var th = THEMES[opts.theme || 'clay'];
  var size = opts.size || 56, s = size / 1000, margin = Math.round(size * 0.6), lh = size * 1.6, maxw = (opts.width || 1100) - 2 * margin;
  var lines = [[]], lw = 0, items = chars(words), wordBuf = [], bufW = 0;
  function flushWord() {
    if (!wordBuf.length) return;
    var L = lines[lines.length - 1];
    if (L.length && lw + WORDGAP * s + bufW > maxw) { lines.push([]); lw = 0; L = lines[lines.length - 1]; }
    if (L.length) { L.push({ gap: true }); lw += WORDGAP * s; }
    wordBuf.forEach(function (c) { L.push(c); }); lw += bufW; wordBuf = []; bufW = 0;
  }
  items.forEach(function (c) { if (c.gap) { flushWord(); return; } var g = GL.glyphs[c.hex]; wordBuf.push(c); bufW += (g.adv + TRACK) * s; });
  flushWord();
  var body = [], usedW = 0;
  lines.forEach(function (L, li) {
    var x = margin, y = margin + size * 0.85 + li * lh;
    L.forEach(function (c) {
      if (c.gap) { x += WORDGAP * s; return; }
      var g = GL.glyphs[c.hex];
      body.push('<path d="' + g.d + '" transform="matrix(' + n6(s) + ' 0 0 ' + n6(-s) + ' ' + n2(x) + ' ' + n2(y) + ')"/>');
      x += (g.adv + TRACK) * s;
    });
    usedW = Math.max(usedW, x + margin);
  });
  var W = Math.ceil(Math.max(usedW, 4 * margin)), H = Math.ceil(margin * 2 + size * 0.85 + (lines.length - 1) * lh + size * 0.4);
  var meta = '<metadata>' + esc(JSON.stringify({ generator: 'Cuneiform Studio ' + C.version, author: 'Larry Dalton', transliteration: words.map(function (w) { return w.tr; }).join(' '), style: opts.style || 'lines', note: 'provenance only; readers use the sign outlines' })) + '</metadata>';
  if (opts.style === 'ancient') {
    // rotate the whole text 90 degrees clockwise: lines become columns (top to bottom), read from the right
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + H + '" height="' + W + '" viewBox="0 0 ' + H + ' ' + W + '" data-style="ancient">' + meta +
      '<rect width="' + H + '" height="' + W + '" fill="' + th.bg + '"/><g transform="matrix(0 1 -1 0 ' + H + ' 0)"><g fill="' + th.ink + '">' + body.join('') + '</g></g></svg>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" data-style="lines">' + meta +
    '<rect width="' + W + '" height="' + H + '" fill="' + th.bg + '"/><g fill="' + th.ink + '">' + body.join('') + '</g></svg>';
};

/* ----------------------------------------------------------- SVG reader */
var BYD = null;
C.readSVG = function (svg) {
  if (!GL) throw new Error('glyphs not loaded');
  if (!BYD) { BYD = {}; Object.keys(GL.glyphs).forEach(function (h) { BYD[GL.glyphs[h].d.replace(/\s+/g, '')] = h; }); }
  var body = svg.replace(/<metadata[\s\S]*?<\/metadata>/g, ''), m, re = /<path\b([^>]*)>/g, gs = [];
  var ancient = /<g transform="matrix\(0 1 -1 0 /.test(body);
  while ((m = re.exec(body))) {
    var at = m[1], d = /\sd="([^"]*)"/.exec(at), tr = /transform="matrix\(([^)]*)\)"/.exec(at);
    if (!d || !tr) continue;
    var hex = BYD[d[1].replace(/\s+/g, '')]; if (!hex) continue;
    var t = tr[1].trim().split(/[\s,]+/).map(Number);
    gs.push({ hex: hex, x: t[4], y: t[5], s: Math.abs(t[0]) });
  }
  if (!gs.length) return { ok: false, reason: 'No Cuneiform Studio sign outlines found. If the SVG was edited or converted by another program, read it as an image instead.' };
  // positions are in the text's own (unrotated) frame, so lines read the same in both styles
  gs.sort(function (a, b) { return Math.abs(a.y - b.y) > 2 ? a.y - b.y : a.x - b.x; });
  var s = gs[0].s, words = [], cur = [], prevEnd = null, prevY = null;
  gs.forEach(function (g) {
    var adv = (GL.glyphs[g.hex].adv + TRACK) * s;
    if (prevY !== null && (Math.abs(g.y - prevY) > 2 || g.x - prevEnd > (WORDGAP * s) * 0.5)) { words.push(cur); cur = []; }
    cur.push(g.hex); prevEnd = g.x + adv; prevY = g.y;
  });
  if (cur.length) words.push(cur);
  return finishRead(words, { ok: true, style: ancient ? 'ancient columns' : 'lines', confidence: 1 });
};
function finishRead(words, res) {
  res.words = words.map(function (w) {
    var u = w.map(function (h) { return String.fromCodePoint(parseInt(h, 16)); }).join('');
    var names = readNames(w), o = { unicode: u, names: names };
    var sx = BYCUN[u]; if (sx) { o.lang = 'sux'; o.tr = sx[0].word; o.gloss = sx.map(function (e) { return e.gloss.split(' ; ')[0]; }).slice(0, 3).join(' | '); return o; }
    var sr = syllableReading(names); o.tr = sr.first;
    var ak = sr.det ? null : akkFromSyllables(sr.names);
    if (ak) { o.lang = 'akk'; o.tr = ak.tr; o.norm = ak.form || ak.e.word; o.gloss = (ak.form ? ak.label + ' of ' + ak.e.word + ': ' : '') + ak.e.gloss.split(' ; ').slice(0, 2).join('; '); return o; }
    var nm = nameFromSyllables(sr.names); if (nm) { o.tr = sr.det + nm.tr; o.candidates = nm.candidates; }
    return o;
  });
  res.unicode = res.words.map(function (w) { return w.unicode; }).join(' ');
  res.signNames = res.words.map(function (w) { return w.names.join('.'); }).join(' ');
  res.transliteration = res.words.map(function (w) { return w.tr; }).join(' ');
  res.signs = words.reduce(function (a, w) { return a + w.length; }, 0);
  return res;
}
function readNames(hexes) { // characters -> sign names (a multi-character sign such as A.A.A is matched greedily)
  var out = [], i = 0, us = hexes.map(function (h) { return String.fromCodePoint(parseInt(h, 16)); });
  while (i < us.length) {
    var hit = null;
    for (var k = Math.min(4, us.length - i); k >= 1; k--) { var seg = us.slice(i, i + k).join(''); if (BYCHAR[seg]) { hit = { n: BYCHAR[seg], k: k }; break; } }
    if (!hit) hit = { n: hexes[i], k: 1 };
    out.push(hit.n); i += hit.k;
  }
  return out;
}
var READS = null;
function readingsOf(n) { // plain syllable readings of a sign, most usual first (no index number, short, CV/VC shapes)
  if (!READS) {
    READS = {}; var USEV = {};
    // how often each reading is used when the studio spells words and names: the usual readings come first
    (LEX || []).forEach(function (e) { if (e.lang === 'akk') C.spellAkkadian(e.word).split('-').forEach(function (v) { USEV[v] = (USEV[v] || 0) + 3; }); });
    if (NAMES) { var k = 0; for (var w in NAMES) { if (k++ % 4) continue; NAMES[w].split('-').forEach(function (v) { USEV[v] = (USEV[v] || 0) + 1; }); } }
    Object.keys(SIGNS).forEach(function (nm) {
      var vs = SIGNS[nm][1].filter(function (v) { return VALUES[v] === nm && !/[₀-₉]/.test(v); });
      vs.sort(function (a, b) { return (USEV[b] || 0) - (USEV[a] || 0) || (a.length > 3) - (b.length > 3) || a.length - b.length || (/[e]/.test(a) - /[e]/.test(b)); });
      if (!vs.length) vs = SIGNS[nm][1].filter(function (v) { return VALUES[v] === nm; }).slice(0, 1);
      READS[nm] = vs.length ? vs : [nm.toLowerCase()];
    });
  }
  return READS[n] || [String(n).toLowerCase()];
}
function joinSyl(parts) { var j = ''; parts.forEach(function (p) { if (!j) j = p; else if (/[aeiu]$/.test(j) && j[j.length - 1] === p[0]) j += p.slice(1); else j += p; }); return j; }
function combos(lists, cap) { var out = [[]]; lists.forEach(function (l) { var nx = []; out.forEach(function (o) { l.forEach(function (x) { if (nx.length < cap) nx.push(o.concat([x])); }); }); out = nx; }); return out; }
function syllableReading(names) {
  var det = '', ns = names.slice();
  if (ns.length > 1 && (ns[0] === 'DIŠ' || ns[0] === 'SAL' || ns[0] === 'MUNUS')) { det = ns[0] === 'DIŠ' ? '{m}' : '{f}'; ns.shift(); }
  else if (ns.length > 1 && ns[0] === 'AN') { det = '{d}'; ns.shift(); }
  return { det: det, names: ns, first: det + ns.map(function (n) { return readingsOf(n)[0]; }).join('-') };
}
function akkFromSyllables(names) {
  if (!LEX) return null;
  var lists = names.map(function (n) { return readingsOf(n).slice(0, 4); });
  var cs = combos(lists, 256);
  for (var i = 0; i < cs.length; i++) { var hit = C.lookupWord('akk', joinSyl(cs[i])); if (hit.length) return { e: hit[0], tr: cs[i].join('-') }; }
  for (var j = 0; j < cs.length; j++) { var fh = BYFORM['akk:' + stripLen(joinSyl(cs[j]).toLowerCase())]; if (fh) return { e: fh[0].e, tr: cs[j].join('-'), form: fh[0].form, label: fh[0].label }; }
  return null;
}
function nameFromSyllables(names) {
  if (!NAMES) return null;
  var cs = combos(names.map(function (n) { return readingsOf(n).slice(0, 4); }), 256);
  var all = [], tr = null;
  for (var i = 0; i < cs.length && all.length < 8; i++) { var c = C.soundCandidates(cs[i].join('-'), 6); if (c.length && !tr) tr = cs[i].join('-'); c.forEach(function (x) { if (all.indexOf(x) < 0) all.push(x); }); }
  return tr ? { tr: tr, candidates: all.slice(0, 8) } : null;
}
/* ----------------------------------------------------------- image reader */
function flatten(d) {
  var toks = d.match(/[MLQCZHV]|-?[0-9.]+/g) || [], polys = [], cur = null, x = 0, y = 0, i = 0, cmd = null;
  function num() { return parseFloat(toks[i++]); }
  while (i < toks.length) {
    if (/[MLQCZHV]/.test(toks[i])) cmd = toks[i++];
    if (cmd === 'M') { x = num(); y = num(); cur = [[x, y]]; polys.push(cur); cmd = 'L'; }
    else if (cmd === 'L') { x = num(); y = num(); cur.push([x, y]); }
    else if (cmd === 'H') { x = num(); cur.push([x, y]); }
    else if (cmd === 'V') { y = num(); cur.push([x, y]); }
    else if (cmd === 'Q') { var x1 = num(), y1 = num(), x2 = num(), y2 = num(); for (var t = 1; t <= 4; t++) { var u = t / 4; cur.push([(1 - u) * (1 - u) * x + 2 * (1 - u) * u * x1 + u * u * x2, (1 - u) * (1 - u) * y + 2 * (1 - u) * u * y1 + u * u * y2]); } x = x2; y = y2; }
    else if (cmd === 'C') { var a1 = num(), a2 = num(), b1 = num(), b2 = num(), x3 = num(), y3 = num(); for (var t2 = 1; t2 <= 6; t2++) { var v = t2 / 6, w0 = (1 - v) * (1 - v) * (1 - v), w1 = 3 * (1 - v) * (1 - v) * v, w2 = 3 * (1 - v) * v * v, w3 = v * v * v; cur.push([w0 * x + w1 * a1 + w2 * b1 + w3 * x3, w0 * y + w1 * a2 + w2 * b2 + w3 * y3]); } x = x3; y = y3; }
    else if (cmd === 'Z') cmd = null;
    else i++;
  }
  return polys;
}
function rasterPolys(polys, W, H, tf) {
  var img = new Uint8Array(W * H), P = polys.map(function (p) { return p.map(tf); });
  for (var yy = 0; yy < H; yy++) {
    var sy = yy + 0.5, xs = [];
    P.forEach(function (p) { for (var k = 0; k < p.length; k++) { var a = p[k], b = p[(k + 1) % p.length]; if ((a[1] <= sy) !== (b[1] <= sy)) xs.push({ x: a[0] + (sy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), w: b[1] > a[1] ? 1 : -1 }); } });
    xs.sort(function (a, b) { return a.x - b.x; });
    var wind = 0;
    for (var q = 0; q < xs.length - 1; q++) { wind += xs[q].w; if (wind !== 0) { var x0 = Math.max(0, Math.ceil(xs[q].x - 0.5)), x1 = Math.min(W - 1, Math.floor(xs[q + 1].x - 0.5)); for (var xx = x0; xx <= x1; xx++) img[yy * W + xx] = 1; } }
  }
  return img;
}
var GX = 18, GY = 14, YLO = -260, YHI = 900, TPL = null, USE = null;
function blur(b) { var o = new Float32Array(GX * GY); for (var y = 0; y < GY; y++) for (var x = 0; x < GX; x++) { var s = 0, n = 0; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < GX && Y < GY) { var wt = dx || dy ? 0.5 : 1; s += b[Y * GX + X] * wt; n += wt; } } o[y * GX + x] = s / n; } return o; }
function sim(a, b) { var num = 0, den = 0; for (var i = 0; i < a.length; i++) { num += Math.min(a[i], b[i]); den += Math.max(a[i], b[i]); } return den ? num / den : 0; }
function buildTemplates() {
  TPL = []; USE = {};
  (LEX || []).forEach(function (e) { Array.from(e.cun || '').forEach(function (u) { USE[u] = (USE[u] || 0) + 1; }); });
  Object.keys(VALUES).forEach(function (v) { var n = VALUES[v]; if (SIGNS[n] && !/[₀-₉]/.test(v)) Array.from(SIGNS[n][0]).forEach(function (u) { USE[u] = (USE[u] || 0) + 1; }); });
  // the syllable signs the studio itself writes with (CV, VC, CVC and the name markers) are far more likely in its output
  var CS = 'bdgklmnpqrsštṭzḫwy'.split(''), VS = 'aeiu'.split(''), boost = function (v, k) { var n = C.valueSign(v); if (n && SIGNS[n]) Array.from(SIGNS[n][0]).forEach(function (u) { USE[u] = (USE[u] || 0) + k; }); };
  VS.forEach(function (a) { boost(a, 12); CS.forEach(function (c) { boost(c + a, 12); boost(a + c, 12); CS.forEach(function (d) { boost(c + a + d, 4); }); }); });
  ['DIŠ', 'MUNUS', 'AN', 'KI'].forEach(function (n) { if (SIGNS[n]) Array.from(SIGNS[n][0]).forEach(function (u) { USE[u] = (USE[u] || 0) + 12; }); });
  Object.keys(GL.glyphs).forEach(function (h) {
    var g = GL.glyphs[h], bb = g.bbox, w = bb[2] - bb[0]; if (w < 20) return;
    var b = new Float32Array(GX * GY), R = 6;
    var img = rasterPolys(flatten(g.d), GX * R, GY * R, function (p) { return [(p[0] - bb[0]) / w * GX * R, (YHI - p[1]) / (YHI - YLO) * GY * R]; });
    for (var gy = 0; gy < GY; gy++) for (var gx = 0; gx < GX; gx++) { var c = 0; for (var sy = 0; sy < R; sy++) for (var sx = 0; sx < R; sx++) c += img[(gy * R + sy) * GX * R + gx * R + sx]; b[gy * GX + gx] = c / (R * R); }
    var u = String.fromCodePoint(parseInt(h, 16));
    TPL.push({ hex: h, w: w, b: blur(b), prior: 0.02 * Math.log(1 + (USE[u] || 0)) });
  });
}
C._templates = function () { if (!TPL) buildTemplates(); return TPL.length; };
function inkMask(img) {
  var W = img.width, H = img.height, N = W * H, D = img.data, hist = {}, best = null, i, key;
  function px(k, c) { var a = D[4 * k + 3] / 255; return D[4 * k + c] * a + 255 * (1 - a); }
  for (i = 0; i < N; i += 3) { key = (px(i, 0) >> 4) + ',' + (px(i, 1) >> 4) + ',' + (px(i, 2) >> 4); hist[key] = (hist[key] || 0) + 1; if (!best || hist[key] > hist[best]) best = key; }
  var acc = [0, 0, 0], n0 = 0;
  for (i = 0; i < N; i += 3) { key = (px(i, 0) >> 4) + ',' + (px(i, 1) >> 4) + ',' + (px(i, 2) >> 4); if (key === best) { acc[0] += px(i, 0); acc[1] += px(i, 1); acc[2] += px(i, 2); n0++; } }
  var bg = acc.map(function (v) { return v / n0; }), dist = new Float32Array(N), dh = new Array(256).fill(0);
  for (i = 0; i < N; i++) { var dr = px(i, 0) - bg[0], dg = px(i, 1) - bg[1], db = px(i, 2) - bg[2]; dist[i] = Math.sqrt(dr * dr + dg * dg + db * db); dh[Math.min(255, dist[i] | 0)]++; }
  var cum = 0, far = 0; for (var b = 255; b >= 0; b--) { cum += dh[b]; if (cum > N * 0.004) { far = b; break; } }
  var thr = Math.max(30, far * 0.5), m = new Uint8Array(N), n = 0;
  for (i = 0; i < N; i++) if (dist[i] > thr) { m[i] = 1; n++; }
  return { W: W, H: H, m: m, ink: n, contrast: far };
}
function rotateMask(M) { // 90 degrees anticlockwise: undoes the ancient (clockwise) layout
  var W = M.W, H = M.H, o = new Uint8Array(W * H);
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) o[(W - 1 - x) * H + y] = M.m[y * W + x];
  return { W: H, H: W, m: o, ink: M.ink, contrast: M.contrast };
}
function readLines(M) {
  var W = M.W, H = M.H, rows = [], x, y;
  for (y = 0; y < H; y++) { var c = 0; for (x = 0; x < W; x++) c += M.m[y * W + x]; rows.push(c); }
  var bands = [], inB = false, b0 = 0, gapRun = 0;
  for (y = 0; y <= H; y++) { var on = y < H && rows[y] > 0; if (on) { if (!inB) { inB = true; b0 = y; } gapRun = 0; } else if (inB) { gapRun++; if (gapRun > Math.max(3, H * 0.01) || y === H) { bands.push([b0, y - gapRun + 1]); inB = false; gapRun = 0; } } }
  var maxh = Math.max.apply(null, bands.map(function (b) { return b[1] - b[0]; }).concat([1]));
  bands = bands.filter(function (b) { return b[1] - b[0] > maxh * 0.3; });
  var words = [], all = [];
  bands.forEach(function (bd) { var r = readStrip(M, bd[0], bd[1]); if (!r) return; var cur = null; r.forEach(function (g) { if (!cur || g.space) { cur = []; words.push(cur); } cur.push(g); all.push(g); }); });
  return { words: words, all: all };
}
function readStrip(M, y0, y1) {
  var W = M.W, cols = [], x, y;
  // the ink rows of the line: most signs run from about -112 to 736 font units
  var rowc = []; for (y = y0; y < y1; y++) { var c = 0; for (x = 0; x < W; x++) c += M.m[y * W + x]; rowc.push(c); }
  var tot = rowc.reduce(function (a, b) { return a + b; }, 0), acc = 0, top = y0, bot = y1;
  for (y = 0; y < rowc.length; y++) { acc += rowc[y]; if (acc > tot * 0.02) { top = y0 + y; break; } }
  acc = 0; for (y = rowc.length - 1; y >= 0; y--) { acc += rowc[y]; if (acc > tot * 0.02) { bot = y0 + y + 1; break; } }
  var unit = (bot - top) / 848; if (!(unit > 0)) return null;
  var base = bot - 112 * unit;
  for (x = 0; x < W; x++) { var cc = 0; for (y = y0; y < y1; y++) cc += M.m[y * W + x]; cols.push(cc); }
  var segs = [], inS = false, s0 = 0;
  cols.forEach(function (c, i) { if (c && !inS) { inS = true; s0 = i; } if (!c && inS) { inS = false; segs.push([s0, i]); } });
  if (inS) segs.push([s0, W]);
  if (!segs.length) return null;
  // wedges of one sign sit closer together than the 400-unit space the studio leaves between signs
  var merged = [segs[0]];
  for (var q = 1; q < segs.length; q++) { var last = merged[merged.length - 1]; if (segs[q][0] - last[1] < 250 * unit) last[1] = segs[q][1]; else merged.push(segs[q]); }
  segs = merged;
  function scoreSpan(a, b) {
    var sx0 = segs[a][0], sx1 = segs[b][1], wpx = sx1 - sx0, wu = wpx / unit, bm = new Float32Array(GX * GY);
    for (var gy = 0; gy < GY; gy++) for (var gx = 0; gx < GX; gx++) {
      var fx0 = sx0 + gx / GX * wpx, fx1 = sx0 + (gx + 1) / GX * wpx, py0 = base - (YHI - gy / GY * (YHI - YLO)) * unit, py1 = base - (YHI - (gy + 1) / GY * (YHI - YLO)) * unit, hit = 0, t = 0;
      for (var py = Math.floor(py0); py < Math.ceil(py1); py++) for (var px = Math.floor(fx0); px < Math.ceil(fx1); px++) { t++; if (py >= 0 && py < M.H && px >= 0 && px < W && M.m[py * W + px]) hit++; }
      bm[gy * GX + gx] = t ? hit / t : 0;
    }
    var bb = blur(bm), res = [];
    TPL.forEach(function (tp) { var wd = Math.abs(wu - tp.w) / Math.max(wu, tp.w); if (wd > 0.3) return; var s = sim(bb, tp.b); res.push({ hex: tp.hex, s: s - 0.8 * wd + tp.prior, raw: s }); });
    res.sort(function (p, q) { return q.s - p.s; });
    return res.length ? res : [{ hex: null, s: -1, raw: 0 }];
  }
  var n = segs.length, best = new Array(n + 1).fill(-1e9), from = new Array(n + 1), pick = new Array(n + 1); best[0] = 0;
  var maxW = 4600 * unit, signGap = TRACK * unit * 0.75;
  for (var i = 0; i < n; i++) {
    if (best[i] < -1e8) continue;
    for (var j = i; j < n; j++) {
      if (segs[j][1] - segs[i][0] > maxW) break;
      if (j > i && segs[j][0] - segs[j - 1][1] > WORDGAP * unit * 0.8) break;
      var r = scoreSpan(i, j); if (!r[0].hex) continue;
      var v = best[i] + (r[0].s - 0.6) * (segs[j][1] - segs[i][0]) / (1000 * unit) - 0.05;
      if (v > best[j + 1]) { best[j + 1] = v; from[j + 1] = i; pick[j + 1] = { r: r, a: i, b: j }; }
    }
  }
  if (best[n] < -1e8) return null;
  var out = [], k = n; while (k > 0) { var p = pick[k]; out.unshift({ hex: p.r[0].hex, s: p.r[0].s, raw: p.r[0].raw, alt: p.r[1], x0: segs[p.a][0], x1: segs[p.b][1] }); k = from[k]; }
  out.forEach(function (g, i) { g.space = i > 0 && (g.x0 - out[i - 1].x1) > WORDGAP * unit * 0.8; });
  return out;
}
C.readImage = function (img) {
  if (!GL) throw new Error('glyphs not loaded');
  if (!TPL) buildTemplates();
  var M = inkMask(img);
  if (M.contrast < 50 || M.ink < 30) return { ok: false, reason: 'No clear ink found in the image.' };
  if (M.ink > 0.35 * M.W * M.H) return { ok: false, reason: 'Too much of the image is ink for written cuneiform (it looks like a photograph or texture). The reader reads cuneiform set in the studio\'s sign shapes; it does not guess.' };
  var tries = [{ M: M, style: 'lines' }];
  if (M.H > M.W * 0.9) tries.push({ M: rotateMask(M), style: 'ancient columns' });
  var best = null;
  tries.forEach(function (t) {
    var r = readLines(t.M); if (!r.all.length) return;
    var sc = r.all.map(function (g) { return g.raw; }).sort(function (a, b) { return a - b; }), med = sc[Math.floor(sc.length / 2)];
    if (!best || med > best.med) best = { r: r, med: med, style: t.style };
  });
  if (!best) return { ok: false, reason: 'No signs found.' };
  if (best.med < 0.625) return { ok: false, reason: 'The shapes do not match the cuneiform signs closely enough (median match ' + best.med.toFixed(2) + '). The reader reads cuneiform set in the studio\'s sign shapes; it does not guess.', median: best.med };
  var res = finishRead(best.r.words.map(function (w) { return w.map(function (g) { return g.hex; }); }), { ok: true, style: best.style, confidence: Math.round(best.med * 100) / 100 });
  res.uncertain = best.r.all.filter(function (g) { return g.raw < 0.65 || (g.alt && g.s - g.alt.s < 0.03); }).length;
  return res;
};

if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.CU = C;
})(this);
