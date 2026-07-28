# VOLT RUNNER source

This directory is the versioned source of truth for the GamePass build.

- `index.html` contains the standalone canvas game and UI.
- `engine/movement.js` contains deterministic movement, input buffers and
  swept top collisions without DOM dependencies.
- `engine/save.js` owns save validation and v1/v2 → v3 migration.
- `engine/ui.js` owns deterministic screen visibility and required button
  bindings so a hidden overlay cannot block the menu.
- `tests/` contains Node headless tests for movement, replay determinism,
  moving-platform collision, save recovery and UI state transitions.

Commands:

```bash
npm test
npm run sync:gamepass
```

The sync command publishes the source artifact into
`frontend/public/games/volt-runner/`. From the repository root,
`npm --prefix frontend run volt:check` verifies that the public artifact is
in sync and runs all engine and artifact smoke tests.

Do not edit the generated public copy directly. Edit this source, run the
tests, then sync it.
