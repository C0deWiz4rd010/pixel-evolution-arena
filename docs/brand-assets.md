# Brand Assets

## Beschreibung

Pixel Evolution Arena uses a dark sci-fi HUD identity with a small original pixel creature emblem. The mark combines a chamfered arena shield, a digital monster face, and a compact evolution core so it reads as creature collecting, squad building, and arena combat without using protected names, logos, silhouettes, or third-party assets.

All files are deterministic repo-native SVGs. They are safe to edit in source control and do not depend on external images, fonts, or runtime APIs.

## 2026-05-23 Graphics Audit

The brand files were present and already usable, but the first pass leaned slightly toward a generic sci-fi mascot badge. The updated versions add more explicit Pixel Evolution Arena signals from the reference boards:

- seven stage-color ticks using the Baby through Special palette
- orthogonal route arrows and branch lines, echoing the evolution chart references
- a stronger evolution-core motif inside the creature mark
- crisper small-size favicon route pixels so the tab icon reads as a game network, not only a face

The result stays brand-safe: no protected creature names, no copied silhouettes, no third-party logos, and no external image dependencies.

## Dateien

- `public/assets/brand/pixel-evolution-arena-logo.svg` - wide title logo for splash, menus, documentation, and large HUD headers.
- `public/assets/brand/pixel-evolution-arena-mark.svg` - square brand mark for app icons, compact navigation, social previews, and loading states.
- `public/favicon.svg` - simplified 64x64 icon for browser favicon usage.
- `public/assets/effects/**` - runtime-ready SVG effects for particles, impact, evolution pulses, type glows, and arena hazards.
- `public/assets/ui/**` - runtime-ready SVG UI motifs for DNA, coins, route arrows, branch nodes, node frames, and scanline panels.

## Farben

| Token | Hex | Nutzung |
| --- | --- | --- |
| Void black | `#050913` | Transparent-safe outer shape, deep HUD contrast |
| Panel navy | `#08111f` | Main dark panel surface |
| Grid blue | `#12324a` | Low-contrast digital grid and circuit lines |
| Neon cyan | `#19f8ff` | Primary rim glow, left eye, active HUD signal |
| Evo green | `#39ff88` | Evolution core, creature outline, progression accents |
| Neon magenta | `#ff35d1` | Secondary rim glow, right eye, special-stage accent |
| Reward yellow | `#ffe66b` | Small reward/stage spark, used sparingly |

These colors intentionally echo the game stage language, especially Baby green, In-Training cyan, and Special magenta, while staying readable on a dark HUD.

## Effect Asset Language

Effects and UI motifs should remain crisp and composable:

- Use `shape-rendering="crispEdges"` for SVGs that appear near creature sprites.
- Prefer hard polygons, rects, and orthogonal paths over soft blobs.
- Use the stage palette for evolution/routing and the type palette for creature affinity glows.
- Keep effects behind or around gameplay surfaces; do not let decoration obscure requirements, squad actions, battle logs, or disabled states.
- Treat assets as optional presentation layers. They should never encode battle, XP, reward, or evolution rules.

## Nutzung

Use the wide logo on dark or near-black backgrounds with at least one mark-width of clear space around it. The logo is designed for horizontal spaces and should not be squeezed into square UI.

Use the mark anywhere the full title would be too dense: app shell, loading screens, square buttons, avatar-like previews, and compact cards. Keep it on dark surfaces so the cyan, magenta, and green edges stay crisp.

Use `public/favicon.svg` for browser tabs when the app shell is ready to reference SVG favicons. If `index.html` currently points at `favicon.ico`, wire it locally with:

```html
<link rel="icon" type="image/svg+xml" href="favicon.svg">
```

Do not stretch the assets non-proportionally, recolor them into a single hue, or add soft pastel backgrounds. If a light-background variant becomes necessary, create a dedicated variant rather than placing the current dark HUD asset on white.
