# Subagent Reference: UI And Asset Explorer

Agent nickname: James

## Design Tokens

- Base look: dark sci-fi blueprint, neon grid, pixel art, clear stage bands.
- Stage colors:
  - `baby #7CFF3A`
  - `in-training #18C8FF`
  - `rookie #FFE12B`
  - `champion #FF9A22`
  - `ultimate #FF3D36`
  - `mega #B45CFF`
  - `special #9D6CFF`
- Background: `#020812`
- Panels: `#071827`
- Text: `#EAF8FF`
- Muted text: `#7DAAC0`
- UI shape: chamfered cards, 2px neon borders, subtle glow, no rounded pastel cards.
- Typography: blocky display font for title, mono or pixel-like font for IDs and labels.
- Lines: standard solid cyan, alternate dashed white, reverse purple, special magenta/orange. Use both color and line style.

## Asset Naming

- Stay neutral: use `creature`, `mon`, or `evolution`; avoid protected franchise terms in filenames.
- Suggested schema:
  - `creature-id-001-baby-slug.png`
  - `stage-baby-icon.svg`
  - `link-standard-arrow.svg`
  - `tree-bg-circuit.png`
- Use three-digit IDs such as `001`, `010`, `100`.
- Keep runtime sprites separate from concepts:
  - `public/assets/creatures/...`
  - `docs/concept-images/...`

## Renamed Image Files

- `10mons.png` -> `concept-creature-roster-010.png`
- `40mons.png` -> `concept-creature-roster-040.png`
- `ChatGPT Image 23. Mai 2026, 17_58_08.png` -> `concept-evolution-tree-wide-reference.png`
- `ChatGPT Image 23. Mai 2026, 17_58_13.png` -> `concept-evolution-tree-poster-v1-reference.png`
- `ChatGPT Image 23. Mai 2026, 17_58_18.png` -> `concept-evolution-tree-poster-v2-primary-reference.png`

## README And Gitignore Notes

- README should include visual direction, stage/link legend, asset naming, concept-source notes, and target resolutions.
- `.gitignore` should include dependencies, build output, coverage, logs, env files, and temporary exports.
- Do not ignore `docs/concept-images`, final `public/assets`, or README-adjacent references.
- If PNG volume grows heavily, consider Git LFS later.

## Visual QA

- Pixel art must remain crisp: no blur, no bilinear-looking scaling.
- IDs and stage labels must stay readable at 100%, 150%, and mobile sizes.
- Lines must not cover labels or sprites.
- Stage colors must be consistent across legend, borders, icons, and connections.
- Check `390px`, `768px`, and `1440px` widths.
- Screenshot QA should include full tree view, scroll behavior, contrast, and glow intensity.
