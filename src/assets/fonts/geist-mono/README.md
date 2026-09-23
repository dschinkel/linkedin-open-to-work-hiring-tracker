# Geist Mono (subset)

**Geist Mono** 1.700 by Vercel, from the `geist` npm package 1.7.2, under the SIL Open Font License 1.1 (`OFL-geist-mono.txt`).
The license declares no Reserved Font Name, so the subsets keep the name Geist Mono.

- `geist-mono-variable.woff2`, `geist-mono-italic-variable.woff2`: variable weight (100–900), trimmed to
  Latin text (U+0020–007E, U+00A0–00FF, U+0100–017F), punctuation and currency (U+2000–206F, U+20A0–20CF),
  and arrows and math (U+2190–21FF, U+2200–22FF). Layout features kept: `ccmp, locl, mark, mkmk, kern, tnum`.

**Δ** (the only Greek letter the UI shows, in "7-day Δ"): Geist Mono has no Greek, so `delta-from-commit-mono.woff2`
holds that one glyph, cut from **Commit Mono** 1.143 (`@fontsource/commit-mono` 5.3.0), also under the SIL Open Font
License 1.1 (`OFL-commit-mono.txt`). As a modified version it carries its own internal name, "Tracker Delta".
`styles/fonts.css` maps it into the Geist Mono family with `unicode-range: U+0394`, so it's used for Δ and nothing else.

To regenerate, with `fonttools` and `brotli` installed:

    UNI="U+0020-007E,U+00A0-00FF,U+0100-017F,U+2000-206F,U+20A0-20CF,U+2190-21FF,U+2200-22FF"
    FEATURES='ccmp,locl,mark,mkmk,kern,tnum'
    pyftsubset "$GEIST/dist/fonts/geist-mono/GeistMono-Variable.woff2" --unicodes="$UNI" \
      --layout-features="$FEATURES" --flavor=woff2 --output-file=geist-mono-variable.woff2
    pyftsubset "$GEIST/dist/fonts/geist-mono/GeistMono-Italic[wght].woff2" --unicodes="$UNI" \
      --layout-features="$FEATURES" --flavor=woff2 --output-file=geist-mono-italic-variable.woff2
    pyftsubset "$COMMIT/files/commit-mono-latin-500-normal.woff2" --unicodes=U+0394 \
      --layout-features='' --flavor=woff2 --output-file=delta-from-commit-mono.woff2
    # then set its name table (IDs 1, 3, 4, 6) to "Tracker Delta" with fontTools

To add a character range, add it to `UNI` and rerun.
