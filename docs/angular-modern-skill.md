# Modern Angular 21 Skill

Use this repository-local skill for Angular work in Pixel Evolution Arena.

## Core Rule

Prefer modern Angular primitives before older patterns:

- Standalone components
- Signals for local and service state
- `computed` for derived values
- `effect` only when a real side effect is needed
- New template control flow: `@if`, `@for`, `@switch`
- `input()` / `output()` may be used for new components when it improves clarity
- Dependency injection with `inject()`

## State Pattern

Use services for game state and domain actions.

Good:

```ts
readonly monsters = signal<Monster[]>(initialMonsters);
readonly squad = computed(() => this.player().squadIds.map((id) => this.getMonsterById(id)));
```

Avoid:

```ts
// Avoid spreading gameplay rules across component templates.
// Avoid storing derived values such as team power manually.
```

## Component Pattern

Components should be small, standalone, and feature-focused.

Recommended:

- `HeaderHudComponent`: reads derived HUD values.
- `EvolutionTreeComponent`: groups data and routes user actions.
- `MonsterDetailComponent`: shows requirements and action buttons.
- `ArenaComponent`: starts battle and renders logs/rewards.

Avoid:

- One giant app component.
- Gameplay rules inside templates.
- Duplicated power, XP, or requirement calculations across components.

## Template Pattern

Use Angular control flow:

```html
@if (selectedMonster(); as monster) {
  <app-monster-detail [monster]="monster" />
}

@for (monster of monsters(); track monster.id) {
  <app-monster-card [monster]="monster" />
}
```

Rules:

- Always use stable `track` expressions for lists.
- Move nontrivial filtering or counting out of templates into methods, signals, or `computed`.
- Do not use JavaScript arrow functions directly inside templates.

## Styling Pattern

- Use SCSS or global CSS custom properties for theme tokens.
- Keep component-specific structure local, shared tokens global.
- Prefer CSS transitions and keyframes for lightweight digital effects.
- Do not add Three.js for decorative background only.

## Forms

For small filter controls, `FormsModule` with `ngModel` is acceptable.

For larger future forms, prefer typed reactive forms.

## Performance

- Keep expensive derived lists in `computed`.
- Use stable IDs in `@for`.
- Avoid repeated heavy work from template calls.
- Keep animations lightweight and respect the gameplay loop.

## Testing Mindset

Prioritize pure service methods for future unit tests:

- Battle reward calculation
- XP overflow and level-up
- Evolution requirement checks
- Collection filtering

## Repository Policy

Any future Angular implementation should check:

- `docs/game-design.md`
- `docs/balance-and-progression.md`
- `docs/gameplay-implementation-checklist.md`
- `docs/angular-modern-skill.md`
