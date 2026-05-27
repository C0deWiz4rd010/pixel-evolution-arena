# Handbook / Navigation Worker Note

Scope completed on `2026-05-23`: sharpened the top navigation and Handbook surfaces without changing gameplay rules, shared services, models, data, or global styles.

## Rationale

- The tab bar now keeps primary tabs on the left, a denser digital route legend in the middle, and the Handbook as a distinct right-side manual/data port. Mobile breakpoints wrap or scroll dense controls so labels do not clip.
- The Handbook was reframed from static documentation into an in-game field manual. It now shows a live directive, ordered next-step rules, selected route status, reward packets, squad power, inventory gates, stage colors, and recent log signals.
- All live values are UI-only derivations from `GameStateService`; battle, XP, rewards, evolution, filtering, and squad behavior remain unchanged.

## Files Touched

- `src/app/components/tab-navigation/tab-navigation.component.html`
- `src/app/components/tab-navigation/tab-navigation.component.ts`
- `src/app/components/tab-navigation/tab-navigation.component.scss`
- `src/app/components/handbook/handbook.component.html`
- `src/app/components/handbook/handbook.component.ts`
- `src/app/components/handbook/handbook.component.scss`
- `docs/reference/subagent-handbook-nav-worker.md`
