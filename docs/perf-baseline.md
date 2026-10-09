# Performance Baseline (2026-10-02, before optimization roadmap)

Measured on `codex/ui-ux-simplification` after Phase 0 (Research Lab fixes).

## Bundle (`npm.cmd run build`, production)

| Chunk | Raw | Transfer |
| --- | --- | --- |
| Initial total | 476.07 kB | 120.29 kB |
| Global styles | 64.75 kB | 11.22 kB |
| Lazy `three-module` | 728.15 kB | 153.52 kB |
| Lazy Pixi (`index`) | 359.99 kB | 83.99 kB |
| Lazy `arena-component` | 58.60 kB | 14.12 kB |

Build completes without warnings.

## Runtime (dev server, built-in browser pane 800x600)

- Idle `requestAnimationFrame` callbacks on the Evolve tab with no animation active: ~30/s
  (the full-screen Three.js arena-effects loop never idles; pane is throttled, real tabs run ~60/s).
- Save payload: ~10 kB of JSON per `localStorage.setItem`.
- `persistState()` call sites in `GameStateService`: 49 (one action often writes 2-6 times;
  `prependLog` alone persists on every log line).
- Auto Build Best Squad: 2 synchronous full-save writes for one click.

## Targets (Phase 3)

- Idle rAF: 0/s outside active effects.
- One debounced save per user action (max ~4 writes/s).
- Initial bundle warning budget: 450 kB.
- Mobile LCP < 2 s, INP < 100 ms.

## After Phase 3 (2026-10-09)

`npm run build && npm run perf` (production build, phone 390x844, 4x CPU throttle):

| Metric | Baseline | After Phase 3 |
| --- | --- | --- |
| Initial bundle | 476.07 kB | 455.64 kB |
| Lazy Three.js chunk | 728.15 kB | removed |
| Idle `requestAnimationFrame` | ~30-60/s (never idles) | 0/s |
| Collection idle frames | continuous (71 animated SVG `<img>`) | 0/s |
| Saves per arena battle | one per log line / action | 1 (debounced) |
| LCP (throttled phone) | not measured | ~0.66-0.96 s |
| Startup long tasks (throttled) | not measured | ~1.0-1.5 s |
| Collection tab switch (throttled) | not measured | ~0.75 s |

Profiling the Collection switch shows almost no JavaScript; the time is style/layout/paint of 71
cards against the 3.8k-line global stylesheet. Phase 4 (style system cleanup) re-measures this.

Other Phase 3 changes: idle prefetch of every view chunk and Pixi, 30 fps cap and off-screen pause
for Pixi stages, still sprite copies for grids (`npm run sprites`), compositor-only background drift,
stale-while-revalidate for unhashed assets in the service worker, initial bundle budget 480/650 kB.
