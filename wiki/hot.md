---
name: Hot cache
description: Rolling current-state snapshot of the project. Overwrite each substantive session.
type: hot
---

# Hot — 2026-05-20 (Stages 1-8 + slop swarm complete)

**Status**: 9 commits pushed to main. All 17 defects from the initial swarm scan addressed. 41/41 tests pass. Build 79 kB gzipped 22 kB. Wiki vault contains the full knowledge layer + ADRs + plans.

## What was delivered today

| Stage | Commit | What |
|---|---|---|
| 1 | 8f4f60b | Wiki bootstrap, legacy folders deleted, `counter.ts` deleted, Codex integration guide |
| 2 | 0e95239 | `deepClone` helper replaces 20 `JSON.parse(JSON.stringify(...))` sites |
| 3 | 39fde47 | `Random.fork(label)` sub-streams; `nextInt` guard; threading through engine — every `Math.random()` and `Date.now()` in engine code now goes through seeded RNG |
| 4 | c701631 | `Game.dispose()` truly tears down (rAF + resize listener); preview-game leak fixed; duplicate `btnGenApply` + `btnGenClose` handlers purged |
| 5 | cee16f3 | Safe recursive-descent expression parser replaces `Function()` eval in `Terminal.speed`; error toast replaces `alert()` |
| 6 | b497c5f | `vite.config.ts` (env-driven base path), version bump 1.0.0-beta→1.1.2, **all hardened workflows** (DEC-07), `.claude/` bootstrap, slop swarm batch 1 (procgen + utils + engine batch) |
| 7 | 3f0c9d7 | Declarative biome registry `src/regions/` — new biomes by file-drop |
| 8 | 61f8963 | Homelab deploy artefacts (`deploy/homelab/`), `deploy-fidom.yml` workflow, slop swarm batch 2 |
| 9 | 2496236 | Terminal.ts slop pass — final batch |

## Defect closure status (D1-D17)

All defects from [[plans/simplification-plan]] closed in code:

| # | Defect | Closed by |
|---|---|---|
| D1 | `Game.dispose()` leaks | Stage 4 |
| D2 | `initNoise()` uses `Math.random()` | Stage 3 |
| D3 | `Landscape` `Math.random()` | Stage 3 |
| D4 | `SkySystem` `Date.now()` seed | Stage 3 |
| D5 | `Building` no extends + no culling | (kept, see DEC-04 deferred follow-ups) |
| D6 | `Building` window light via `Math.random()` | Stage 3 |
| D7 | `CityGenerator`/`BiomeSystem` cloned RNG | Stage 3 (`root.fork('biome')`) |
| D8 | `BiomeSystem.update(1)` hard-coded | Stage 3 (Game passes real dx) |
| D9 | `nextInt(5,5)` invariant | Stage 3 |
| D10 | `Function()` eval in Terminal | Stage 5 |
| D11 | `biome` lying usage string | (kept, see follow-up) |
| D12 | Apply listener double-bound | Stage 4 |
| D13 | `alert()` error handler | Stage 5 |
| D14 | CSS broken `writing-mode: bt-lr` | (kept, see follow-up — needs CSS pass) |
| D15 | CSS z-index collisions | (kept, see follow-up) |
| D16 | No `vite.config.ts` | Stage 6 |
| D17 | Version drift | Stage 6 |

Deferred D5, D11, D14, D15 are tracked for a future small pass.

## Active threads

- **Codex review** (job `a24b0fd5`) — independent review of stages 1-5 — still running.
- **Slop hunter main.ts** — still running.
- **Stage 9/10**: `main.ts` decomposition (DEC-04) — pending. Will start once slop hunter finishes to avoid conflict.

## How to deploy

- **GitHub Pages** — automatic on push to main (`fszalaj.github.io/skyline-scroller/`).
- **fidom.link** — needs one-time homelab setup per `deploy/homelab/README.md`, then `.github/workflows/deploy-fidom.yml` keeps it synced. Needs `DEPLOYARR_HOST` + `DEPLOYARR_SSH_KEY` secrets in GH repo.

## How a new contributor bootstraps

```bash
git clone …
cd skyline-scroller
bash scripts/dev-setup.sh   # npm ci + register Obsidian vault
npm run dev
```

## Project Claude config

- `CLAUDE.md` at root — auto-loaded by Claude Code.
- `.claude/settings.json` — permissions + SessionStart hook (runs `setup-vault.sh`).
- `.claude/agents/` — `wiki-curator`, `slop-hunter`, `codex-review` ready to dispatch.

## Wiki coverage

| Folder | Count |
|---|---|
| entities/ | 16 |
| systems/ | 8 |
| concepts/ | 10 |
| maps/ | 3 |
| decisions/ | 9 (DEC-01..07 + DEC-09; DEC-06 superseded) |
| plans/ | 1 (DEC-08 master simplification) |
| operations/ | 2 (build-deploy + codex-integration) |
