# Tests

- `node rt.js`: SVG read-back of sample texts in both layouts.
- `node lexrt.js`: SVG read-back of every dictionary word the studio writes.
- `node imgtest.js cases.json`: render texts in Chromium (Playwright), export PNG/JPEG and read them back. `cases.json` is the 120-case set reported in the README (seed 9191); `dev20.json` is the development set used while tuning. Make new cases with `node gencases.js 120 1234 "[0.6,0.8,1,1.5,2]" > new.json`.
- `node neg.js`: check that the non-cuneiform images in `test/neg/` are refused.
- The studio's own **Self-test** tab runs the built-in checks in the browser.
