# Credits and licences

Cuneiform Studio software (engine, studio, server, installer, infographic) © 2026 Larry Dalton.

It includes third-party material, each under its own licence. Licence texts and notices are in `src/app/licenses/`.

| Component | Where | Licence |
|---|---|---|
| **Noto Sans Cuneiform** font, © The Noto Project Authors | `src/app/fonts/NotoSansCuneiform-Regular.ttf`; its sign outlines are also stored in `src/app/data/glyphs.json` | SIL Open Font License 1.1 |
| **Oracc Sign List** (OSL, [github.com/oracc/osl](https://github.com/oracc/osl)): sign names, readings, Unicode mappings | `src/app/data/signs.json` | CC0 1.0 (public domain) |
| **Wiktionary** Akkadian and Sumerian entries (Wiktextract via [kaikki.org](https://kaikki.org/)): words, English glosses, inflected forms, cuneiform spellings | `src/app/data/lexicon.json` | CC BY-SA 4.0 |
| **CMU Pronouncing Dictionary**, © 1993–2015 Carnegie Mellon University: pronunciations converted to syllable spellings | `src/app/data/names.tsv` | BSD (2-clause style) |

Because it is derived from CC BY-SA material, `src/app/data/lexicon.json` is shared under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The changes made are listed in
`src/app/licenses/CC-BY-SA-4.0.txt`.
