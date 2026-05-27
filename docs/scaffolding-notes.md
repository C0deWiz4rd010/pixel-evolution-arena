# Scaffolding Notes

The repository started nearly empty, with a minimal `README.md` plus untracked `concepts/` and `docs/`.

## Angular Setup

Use Angular in-place with the repository root as the app root.

Recommended command shape:

```bash
npx.cmd @angular/cli new pixel-evolution-arena --directory . --standalone --style=scss --routing=false --skip-git
```

Use `npm.cmd` and `npx.cmd` on Windows PowerShell if script execution blocks `npm.ps1`.

## Git Notes

- Work on a `codex/` feature branch.
- Keep concept/reference files versioned unless they become too large.
- If assets grow substantially, consider Git LFS later.

## Known Risk

The reference images visually mention a protected franchise. They must remain references only. App copy, data, and assets must use original names and designs.
