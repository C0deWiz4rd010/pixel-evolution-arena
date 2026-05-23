# Pixel Evolution Arena Agent Instructions

These instructions apply to every agent working in this repository.

## Product Direction

- Build a brand-safe browsergame prototype named **Pixel Evolution Arena**.
- Keep the fantasy close to original digital monster collecting: cute early forms, stronger later forms, evolution paths, squad building, and arena battles.
- Do not use protected creature names, franchise logos, copied silhouettes, or third-party game assets.
- Prefer original fantasy names, CSS pixel-art placeholders, emojis, simple SVG motifs, or generated assets stored under `docs/` or `public/assets/`.
- Optimize for game feel before decoration: fast feedback, clear goals, useful rewards, visible progression, and low-friction squad/evolution decisions.

## Technical Direction

- Use Angular, TypeScript, HTML, and SCSS.
- Keep all data local as mock data. No backend, no login, no external runtime APIs.
- Separate game rules from Angular templates. Components should render state and call service actions; services and pure helpers should own battle, XP, rewards, evolution, and filtering behavior.
- Use responsive DOM UI for HUD, cards, filters, squad slots, detail panels, and battle logs.
- Keep the app as a singlepage experience with tabbed sections.
- Favor snappy local interactions over cinematic delays. Animations may polish state changes but must not slow the core loop.

## Visual Direction

- Dark sci-fi game HUD with crisp neon stage colors and digital grid/circuit motifs.
- Stage colors:
  - Baby: green
  - In-Training: cyan
  - Rookie: yellow
  - Champion: orange
  - Ultimate: red
  - Mega: purple
  - Special: magenta
- Use sharp/chamfered panels, 1-2px borders, controlled glows, and monospace or pixel-style typography.
- Avoid glossy generic dashboards, soft pastel cards, decorative orbs, and placeholder-looking blank boxes.

## Asset Policy

- Store user/reference images under `docs/concept-images/reference/`.
- Store generated concept images under `docs/concept-images/generated/`.
- Runtime assets belong under `public/assets/` if they are used by the app.
- Use descriptive lowercase filenames with hyphens.
- Do not leave project-referenced generated assets only in external Codex output folders.

## Git Workflow

- Work from a feature branch prefixed with `codex/`.
- Make small, named commits for meaningful steps.
- Do not revert user changes unless explicitly asked.
- Before merges or branch changes, inspect `git status --short --branch`.

## Quality Gates

- `npm.cmd run build` must pass before handoff.
- Render the app locally and smoke test the core flows: tab switching, monster selection, squad add/remove, evolution, battle rewards, and collection filtering.
- Check desktop and mobile layouts for overlap, clipped text, blank screens, and unreadable glow.
- The prototype should answer "what should I do next?" from every tab through requirements, recommendations, rewards, or clear disabled states.
