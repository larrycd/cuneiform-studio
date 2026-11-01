# How Cuneiform Studio works

Everything happens in `src/app/engine.js`, which runs in the browser and in the Node tests. There is no network access and no external library.

## Data

| File | Contents | Source |
|---|---|---|
| `glyphs.json` | Outlines of all 1,234 signs as SVG paths | Noto Sans Cuneiform |
| `signs.json` | 3,244 sign names, 2,409 drawable, 7,780 readings (values) | Oracc Sign List |
| `lexicon.json` | 754 Akkadian and 976 Sumerian words: part of speech, English gloss, inflected forms, cuneiform | Wiktionary |
| `names.tsv` | 126,032 English pronunciations | CMU Pronouncing Dictionary |

`tools/build_data.py` builds the first three from the downloaded sources; `tools/mknames.js` builds the last.

## Writing

**Akkadian.** A normalised word (*šarrum*) is split into syllables: a consonant starts each syllable where possible, a doubled
consonant is split (*šar-rum*), and long vowels are written as plain vowels. Each syllable is written with a CVC sign if one exists
(*šar*), otherwise CV + VC (*ru-um*). A final consonant cluster gets an echo vowel, as in loanwords. Syllabic input (*šar-ru-um*) is
written exactly. Dictionary words also show the Sumerian sign (Sumerogram) scribes often used instead.

**Sumerian.** Words are looked up in the Sumerian list and written with their dictionary signs. Words that are not listed are written
from their values (`e2-gal` → E₂.GAL). Plain-keyboard spellings are converted: digits to subscripts, `sz` → š, `s,` → ṣ, `t,` → ṭ,
`h` → ḫ, `ng` → g̃.

**English by sound.** The word is looked up in the CMU dictionary (or spelled out by letter rules if it is not there), its sounds are
mapped to Akkadian consonants and vowels, and the result is written as syllables. A name marker goes in front: the single upright
wedge (DIŠ) for a man, MUNUS for a woman, DINGIR for a god.

**Signs.** Exact transliteration: values joined by `-` or `.`, sign names in capitals, markers in braces.

## Translating English

The draft is rule-based. English words are matched to dictionary glosses (exact matches and words with known forms rank first; rare or
restricted senses rank lower). The sentence is parsed into subject, verb, object and prepositional phrases.

- **Akkadian:** subject in the nominative (-um), object in the accusative (-am), after prepositions the genitive (-im); verb last.
  Past tense uses the dictionary preterite with person prefixes (a- I, ta- you, i- he/she, ni- we); pronoun objects become suffixes
  (*arāmka* "I love you"). "X is Y" uses the stative (*šarrum rabi*, *damqāta* "you are good"). *ul* negates; *ina*, *ana*, *itti*
  translate in/to/with. Possessives become suffixes (*bītī* "my house").
- **Sumerian:** the doer of a verb with an object takes -e; the verb takes mu- (on the last part of compound verbs such as *šu … dim₂*
  "to build"); "is" becomes the copula -am₃; possessives become suffixes (*e₂-g̃u₁₀* "my house").

Words that are not in the dictionary are written by sound and lower the confidence. Akkadian drafts are capped at 75% and Sumerian at 60%.

## Layout

Signs are placed in lines from left to right, with a fixed gap between signs and a wider gap between words; lines wrap at word
boundaries. **Ancient columns** draw the same lines and turn the whole group 90° clockwise, so the columns read top to bottom and
right to left. Each sign is one `<path>` with a `matrix(...)` transform, which is what makes exact SVG reading possible.

## Installing and serving

`src/server.ps1` is a small Windows PowerShell 5.1 web server (HttpListener) on port 8768 that serves only the studio folder.
The installer copies the studio to `%LOCALAPPDATA%\CuneiformStudio`, starts the server, checks every part over HTTP and adds a
sign-in shortcut; any failure restores the previous version.
