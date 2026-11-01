# Reader: method and test results

## SVG: exact

Each sign in an exported SVG is a `<path>` whose outline is exactly one sign from the font, placed by a `matrix(...)` transform. The reader:

1. matches each outline to its sign;
2. detects ancient columns from the rotation of the group;
3. sorts signs into lines and words by position and spacing;
4. chooses readings (see *Words* below).

The `<metadata>` block is removed before reading and never used.

## PNG and JPEG: shape matching

1. **Ink:** the background is the most common colour; ink is anything far enough from it in colour.
2. **Lines:** rows of ink are grouped into lines. Sign height gives the scale.
3. **Signs:** each line is cut into column spans; neighbouring spans that are very close are joined first, then the best way to split
   the line into signs is found by dynamic programming, comparing each candidate span with every sign of similar width
   (18 × 14 grid, blurred). Signs the studio writes with (common syllables and name markers) get a small preference.
4. **Words:** gaps wider than 80% of the word gap.
5. **Ancient columns:** if the image is tall, it is also read turned 90° anticlockwise, and the better reading is kept.
6. **Refusal:** images with a median match below 0.625, or that are more than 35% ink, are refused.
7. **Close calls** (a weak match, or a runner-up within 0.03) are counted and reported as uncertain.

## Words

A sign has many readings. For each word the reader tries combinations of the most-used readings and looks for:

- a Sumerian dictionary word with exactly those signs;
- an Akkadian dictionary word or an inflected form (dictionary forms such as *ibni*, plus the -am and -im case endings: *bītam* is
  reported as the object form of *bītum*);
- otherwise a name: the syllables with likely English source words from the pronunciation table.

## Test results

Measured with the scripts in `test/`.

| Test | Result |
|---|---|
| Every dictionary word the studio writes: 1,690 words in 434 SVGs | 434 / 434 exact |
| Development set, 20 random texts (used while tuning) | 18 / 20 exact before the last tuning round |
| First 120-case set (seed 4242), used for tuning the sign preference | 102 / 120 before tuning, 110 / 120 after |
| **120 new random texts** (seed 9191, made after the last change to sign matching): Akkadian, Sumerian and names, rendered by Chrome, PNG and JPEG (quality 0.75), 0.6×–2×, four colour schemes, both layouts | **111 / 120 exact**; all 9 misses were flagged as uncertain, none was silent |
| Non-cuneiform images: two Heptapod L infographics, the pIqaD infographic, the Hieroglyph Studio infographic and a hieroglyph text, an icon, two Latin text images, noise | 9 / 9 refused. The refusal threshold was raised from 0.6 to 0.625 using these images (one Latin image scored 0.61), so this is not an independent result. The weakest correct reading in the tests scored 0.64. |

**Known limits**

- The reader expects the Noto Sans Cuneiform shapes used by the studio; photographs of tablets, other sign styles and handwriting are not supported.
- Rotated (other than ancient columns) or skewed images are not handled.
- Use the SVG export when you need an exact result.
