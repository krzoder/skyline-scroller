# Skyline Scroller

Procedurally generated parallax city scroller with a day/night cycle and weather, rendered entirely to an HTML5 Canvas - no graphics libraries, just plain TypeScript.

**Version**: 1.2.0

## Where to see it

**[krzoder.github.io/skyline-scroller/](https://krzoder.github.io/skyline-scroller/)** -
production, always reflecting `main`, updated about two minutes after each merge.

Repository: https://github.com/krzoder/skyline-scroller

> Until 2026-08-18 a second copy was also served from `skyline-scroller.fidom.link`, a
> self-hosted box that rendered the most recently pushed PR head. That preview and its approval
> gate are gone: GitHub Pages already publishes the site, and the preview pipeline depended on a
> runner that no longer exists, so every PR carried a check that could only time out.

---

## The pipeline at a glance

```
PR commit ──► CI (lint, typecheck, test, build)
              CodeQL, npm audit
                     │
                     ▼
              squash-merge to main
                     │
                     ▼
              deploy.yml ──► GitHub Pages
                     ▼
              krzoder.github.io serves main
```

## How an end-to-end change actually goes

### 1. Open a PR

```bash
git checkout -b my-change
# ... edit ...
git add .
git commit -m "short description"
git push -u origin my-change
```

Open the PR via the link GitHub prints.

### 2. CI runs automatically (a few green checks)

- **Lint & Typecheck** - `tsc --noEmit`
- **Test** - 67 vitest cases, must all pass
- **Build (Node 24)** - production bundle compiles
- **CodeQL** - security/quality scan

If any check is red, fix it. Push the fix - everything below reruns.

### 3. Merge when the checks are green

Nothing else gates the PR. Squash-merge from the GitHub UI, or add the `auto-merge` label and
let `auto-merge.yml` do it once every check passes.

### 4. Production deploys automatically

`deploy.yml` triggers on every push to `main`:
- Downloads the dist artifact built by CI (the one from the merged PR).
- Publishes to the `gh-pages` branch.
- GitHub Pages serves it at https://krzoder.github.io/skyline-scroller/.

End-to-end: about three minutes from "Squash and merge" to the change being live.

---

## Workflow files

| File | What it does |
|---|---|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Lint, typecheck, test, build. Runs on PR + push to main. |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Builds main → publishes to GitHub Pages. Triggers on CI success on main. |
| [`.github/workflows/auto-merge.yml`](.github/workflows/auto-merge.yml) | If a PR has the `auto-merge` label and all checks pass, GitHub auto-merges it. |
| [`.github/workflows/dependabot-automerge.yml`](.github/workflows/dependabot-automerge.yml) | Merges a Dependabot PR once every check on its head commit is green. |
| [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml) | Weekly + PR security scan. |
| [`.github/workflows/dep-audit.yml`](.github/workflows/dep-audit.yml) | Daily `npm audit`. Opens issue if high+ vulnerability appears. |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | Drafts GitHub release notes from PRs since last tag. |

The self-hosted copy on fidom.link was retired on 2026-08-18 along with its container, Traefik
route and nginx config in `fszalaj/homelab`. [`wiki/decisions/DEC-09-homelab-deploy.md`](wiki/decisions/DEC-09-homelab-deploy.md)
and [`wiki/decisions/DEC-10-pr-preview-on-fidom.md`](wiki/decisions/DEC-10-pr-preview-on-fidom.md)
record why it existed.

---

## Local development

Requirements: **Node.js 24+** (Active LTS). `package.json` has `engines.node: ">=24.0.0 <27.0.0"` and `scripts/dev-setup.sh` checks the version before installing.

```bash
# first time after cloning:
git clone https://github.com/krzoder/skyline-scroller
cd skyline-scroller
bash scripts/dev-setup.sh

# from then on:
npm run dev        # dev server (http://localhost:5173)
npm run build      # production build to dist/
npx vitest run     # run the test suite (67 cases)
```

### In-app developer console

Built-in terminal: press `t` or `Enter` from the main view. Commands:

- `seed [value|random]` - show or set the world seed
- `speed <value>` - time scale (accepts expressions like `2*pi`)
- `biome [name]` - force a biome (or show the current one)
- `debug-state` - dumps current state (seed, cameraX, biome, sky time, etc.) as JSON to the clipboard - useful for bug reports
- `format [24h|12h|score]` - clock display format
- `help` - list all commands

### Codebase layout

- `src/main.ts` (~427 LOC) - orchestrator: creates `Game`, wires up UI modules, installs keyboard shortcuts.
- `src/ui/` - 10 modules covering individual UI slices (settings, advanced, custom-gen, terminal-bind, gestures, audio-controls, error-toast, seed-controls, keyboard-shortcuts, window-manager).
- `src/engine/` - rendering engine (`Game`, `Layer`, `SkySystem`, `Terminal`, `Renderable`).
- `src/procgen/` - procedural generation (`CityGenerator`, `BiomeSystem`, `TreeConfig`).
- `src/procgen/entities/` - drawable entities (`Building`, `Tree`, `Landscape`, `Ground`, `CityEntity`, `TextureGenerator`).
- `src/regions/` - declarative biome registry (trees, materials, roofs, palette).
- `src/utils/` - contract modules: `Random` (seeded RNG with `.fork(label)`), `Expression` (sandboxed parser instead of `eval()`), `deepClone` (`structuredClone`).
- `src/config.ts` - central tunable constants (biome durations, camera speed, feature height ranges).

Full technical documentation and architecture notes live in the [`wiki/`](wiki/) directory - it's an Obsidian vault. Open the `wiki/` folder as a vault in Obsidian.

Most useful entry points:

- [`wiki/index.md`](wiki/index.md) - table of contents
- [`wiki/hot.md`](wiki/hot.md) - current project state
- [`wiki/decisions/`](wiki/decisions/) - architecture decisions (DEC-NN)

---

## Tech stack

- **TypeScript** (compiler: `tsc`)
- **Vite** (bundler)
- **Vitest** (67 test cases across 5 files)
- **Canvas API 2D** (rendering - no WebGL, no graphics libraries)
- **Zero runtime dependencies** - the bundle that lands in the browser is purely the app code (~79 kB, ~22 kB gzipped).

## Hosting

**GitHub Pages** - free static hosting, deploying automatically on every merge to `main`. It is
the only place the site is served from; the self-hosted `fidom.link` copy was retired on
2026-08-18.

Why the second copy existed, and the preview flow built on it:
[`wiki/decisions/DEC-09-homelab-deploy.md`](wiki/decisions/DEC-09-homelab-deploy.md),
[`wiki/decisions/DEC-10-pr-preview-on-fidom.md`](wiki/decisions/DEC-10-pr-preview-on-fidom.md).
