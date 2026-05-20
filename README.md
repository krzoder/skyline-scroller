# Skyline Scroller

Procedurally generated parallax city scroller with a day/night cycle and weather, rendered entirely to an HTML5 Canvas - no graphics libraries, just plain TypeScript.

**Version**: 1.2.0

## Where to see it

Two URLs with different purposes:

| URL | What's there | When it updates |
|---|---|---|
| **[krzoder.github.io/skyline-scroller/](https://krzoder.github.io/skyline-scroller/)** | Production - always reflects `main` | ~2 min after each merge |
| **[skyline-scroller.fidom.link](https://skyline-scroller.fidom.link/)** | PR preview - the **most recently pushed PR HEAD**, or `main` when no PR is open | ~1 min after each PR commit |

Repository: https://github.com/krzoder/skyline-scroller

---

## The pipeline at a glance

```
PR commit ──► CI (lint, typecheck, test, build) ──┐
                                                  │
              build dist on ubuntu-hosted runner ─┤
                                                  ▼
                  artifact downloaded by self-hosted homelab runner
                                                  │
                  atomic-swap into nginx data dir │
                                                  ▼
                          fidom.link shows the PR
                                                  │
                  sticky PR comment with preview URL
                                                  │
                  await-approval job pauses for manual review
                                                  ▼
              user tests fidom -> clicks Approve in GitHub UI
                                                  │
                  branch-protected merge unlocks
                                                  ▼
              squash-merge -> deploy.yml -> GitHub Pages
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

### 3. PR preview deploys to fidom.link

After CI is green, the `PR Preview on fidom.link` workflow runs:

1. Builds the PR commit on a GitHub-hosted ubuntu runner (untrusted code stays here, never on your homelab box).
2. Uploads `dist/` as a workflow artifact.
3. A self-hosted runner on the homelab downloads the artifact and **atomic-swaps** it into nginx (`mv -T` so nginx never serves a half-written tree).
4. Smoke-tests `https://skyline-scroller.fidom.link/health` returns 200.
5. Posts a sticky comment on the PR:

> 🚀 **Preview live**: https://skyline-scroller.fidom.link/
>
> Built from `<sha>`.
>
> **Next step**:
> 1. Open https://skyline-scroller.fidom.link/ and verify everything works.
> 2. Go to the deployment approval page and click **Review deployments → fidom-verified → Approve and deploy**.
> 3. After approval, the `await-approval` status check turns green and you can **Squash and merge**.

### 4. Test on fidom.link

Click the preview link. Verify your change actually works in production-like conditions:
- Does the canvas render?
- Are the new biome/tree/UI buttons functioning?
- Did you break the terminal or the keyboard shortcuts?
- Run `debug-state` in the in-app terminal, copy the JSON, attach to the PR if anything looks off.

### 5. Approve the deployment

The PR has a status check called `await-approval` that's **stuck on "pending"**. It's a job in the workflow that's waiting on a GitHub Environment called `fidom-verified` with you set as a required reviewer.

To approve:
- Either click the link in the sticky comment, or go to **Actions → the latest "PR Preview on fidom.link" run for your PR**.
- You'll see a yellow banner: **"Review deployments"** → click it.
- Tick **`fidom-verified`** → click **"Approve and deploy"**.

The `await-approval` job now succeeds. Status check goes green. The merge button unblocks.

> **Important**: Pushing a new commit invalidates the prior approval. fidom rebuilds, the approval gate resets, and you must approve again. This is by design - each commit must be re-verified.

### 6. Squash and merge

Click the green **"Squash and merge"** button. Confirm.

### 7. Production deploys automatically

`deploy.yml` triggers on every push to `main`:
- Downloads the dist artifact built by CI (the one from the merged PR).
- Publishes to the `gh-pages` branch.
- GitHub Pages serves it at https://krzoder.github.io/skyline-scroller/.

End-to-end: ~3 minutes from "Squash and merge" to the change being live on production.

### 8. fidom.link cleans up

After the PR closes (merged or abandoned), the workflow rebuilds `main` and redeploys to fidom. No stale PR content survives the PR.

---

## One-time repo setup for the approval gate

**You only do this once, per repository owner.**

1. Go to **Settings → Environments → New environment**.
2. Name it `fidom-verified`.
3. Under **Deployment protection rules**, tick **"Required reviewers"** and add yourself.
4. (Optional) Set **"Wait timer"** to 0 (default).
5. Save.

Then add a branch protection rule on `main`:
1. **Settings → Branches → Branch protection rules → Add rule**.
2. Branch name pattern: `main`.
3. Tick **"Require status checks to pass before merging"**.
4. Add the check called `Await manual fidom verification` (the job's display name from `pr-preview.yml`).
5. Save.

After this, no PR can merge into `main` until you've clicked Approve on its deployment to `fidom-verified` for the current HEAD SHA.

---

## Workflow files

| File | What it does |
|---|---|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Lint, typecheck, test, build. Runs on PR + push to main. |
| [`.github/workflows/pr-preview.yml`](.github/workflows/pr-preview.yml) | The full PR-preview-on-fidom + approval-gate flow above. |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Builds main → publishes to GitHub Pages. Triggers on CI success on main. |
| [`.github/workflows/deploy-fidom.yml`](.github/workflows/deploy-fidom.yml) | Emergency manual lever: rebuild main and rsync to fidom. workflow_dispatch only. |
| [`.github/workflows/auto-merge.yml`](.github/workflows/auto-merge.yml) | If a PR has the `auto-merge` label and all checks pass (including `await-approval`), GitHub auto-merges. Useful when you've already approved and want to walk away. |
| [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml) | Weekly + PR security scan. |
| [`.github/workflows/dep-audit.yml`](.github/workflows/dep-audit.yml) | Daily `npm audit`. Opens issue if high+ vulnerability appears. |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | Drafts GitHub release notes from PRs since last tag. |

The container + Traefik route + nginx config for fidom.link live in `fszalaj/homelab`. See [`wiki/decisions/DEC-09-homelab-deploy.md`](wiki/decisions/DEC-09-homelab-deploy.md) and [`wiki/decisions/DEC-10-pr-preview-on-fidom.md`](wiki/decisions/DEC-10-pr-preview-on-fidom.md).

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

- **GitHub Pages** - free static hosting, deploys automatically on every merge to `main`.
- **fidom.link** - self-hosted on a homelab box (Traefik + nginx), public access (no auth).

Architecture decisions and homelab config: [`wiki/decisions/DEC-09-homelab-deploy.md`](wiki/decisions/DEC-09-homelab-deploy.md), [`wiki/decisions/DEC-10-pr-preview-on-fidom.md`](wiki/decisions/DEC-10-pr-preview-on-fidom.md).
