# CLAUDE.md

## Project

NeoFermi — a Monte Carlo calculator for Fermi estimation with uncertainty propagation and dimensional analysis.

## Build

```bash
bun install          # install deps
make build           # parser + lib + CLI (two-phase: bundles client-viz IIFE, then CLI)
make embed           # embeddable script → dist/neofermi-embed.js
make test            # vitest
make typecheck       # tsc --noEmit
```

## Release strategy

Built assets (embed script, CLI binary) are not committed on `main`. Instead:

- The **`release` branch** is an orphan branch containing only `dist/neofermi-embed.js` (+ source map). This is what jsDelivr serves.
- The **`v*` tags** point to commits on the `release` branch so that `cdn.jsdelivr.net/gh/alexalemi/neofermi@v0.1.0/dist/neofermi-embed.js` resolves.
- GitHub Release assets are also attached via `gh release create`.

**To publish a new release:**

```bash
# 1. On main: build everything
make build embed

# 2. Switch to release branch, bring in the new build
git checkout release
cp dist/neofermi-embed.js dist/neofermi-embed.js.map .  # already in dist/
git add -f dist/neofermi-embed.js dist/neofermi-embed.js.map
git commit -m "Release vX.Y.Z — built from main at $(git rev-parse --short main)"
git tag vX.Y.Z
git push && git push --tags

# 3. Create GitHub release with the asset
gh release create vX.Y.Z dist/neofermi-embed.js --title "vX.Y.Z"

# 4. Switch back
git checkout main

# 5. Update version references in README.md if the version changed
```

jsDelivr caches by tag, so each version is immutable once published. Update the `@vX.Y.Z` in the README embed URLs when bumping versions.

## Architecture notes

- Four rendering surfaces: embed (`src/embed.ts`), editor (`src/editor/`), CLI notebook (`src/cli/`), front page (`index.html`)
- Shared utilities live in `src/utils/` (format.ts, html.ts) and `src/visualization/`
- CLI dotplot rendering uses a two-phase build: `src/cli/assets/client-viz.ts` is bundled into a browser IIFE by esbuild, written to `_generated-client-viz.ts` (gitignored), then imported as a string by the CLI bundle
- Theme colors for CLI dotplots come from CSS custom properties (`--nf-dot-color`, etc.) set in `src/cli/assets/styles.ts`
