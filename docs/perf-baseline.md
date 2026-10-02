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
