---
name: Hot cache
description: Rolling current-state snapshot of the project. Overwrite each substantive session.
type: hot
---

# Hot — 2026-05-20 (autonomous loop complete)

**Status**: 11 commits pushed to main. All 17 verified defects addressed (D1-D13 + D16-D17 directly; D14/D15/D11 closed; D5 deferred). 44/44 tests pass. Build 79 kB gzipped 22 kB.

## What was delivered

| Stage | Commit | LOC delta | What |
|---|---|---:|---|
| 1 | 8f4f60b | -9000+ | Wiki bootstrap, legacy delete, Codex integration guide |
| 2 | 0e95239 | +153 | `deepClone` helper + 20 sites |
| 3 | 39fde47 | +164/-68 | Unified RNG (`fork`), nextInt guard, engine threading |
| 4 | c701631 | +25/-26 | Dispose hygiene + handler purge |
| 5 | cee16f3 | +319/-13 | Safe expression parser + error toast |
| 6 | b497c5f | +900+ | vite.config, version bump, workflows, .claude bootstrap, slop batch 1 |
| 7 | 3f0c9d7 | +180 | Declarative biome registry |
| 8 | 61f8963 | +250 | Homelab deploy artefacts + deploy-fidom workflow |
| 9 | 2496236 | -16 | Terminal slop |
| 10 | 4948c9f | +20/-57 | Wiki hot/log refresh |
| 11 | d7eabaa | +110/-18 | D11/D14/D15 closed + Determinism integration test |

Net delta: roughly **+1300 LOC of new structure** (wiki + tests + regions + workflows + scripts), **-2000+ LOC of legacy/slop**, total **-700 LOC**. The shipping bundle stayed nearly flat at ~79 kB.

## Defect closure

| # | Defect | Status |
|---|---|---|
| D1 | `Game.dispose()` leaks | ✅ Stage 4 |
| D2 | `initNoise()` uses `Math.random()` | ✅ Stage 3 |
| D3 | `Landscape` `Math.random()` | ✅ Stage 3 |
| D4 | `SkySystem` `Date.now()` seed | ✅ Stage 3 |
| D5 | `Building` no extends + no culling | ⏸ deferred (not user-visible) |
| D6 | `Building` window light via `Math.random()` | ✅ Stage 3 |
| D7 | `CityGenerator`/`BiomeSystem` cloned RNG | ✅ Stage 3 |
| D8 | `BiomeSystem.update(1)` hard-coded | ✅ Stage 3 |
| D9 | `nextInt(5,5)` invariant | ✅ Stage 3 |
| D10 | `Function()` eval in Terminal | ✅ Stage 5 |
| D11 | `biome` lying usage string | ✅ Stage 11 (now actually wires through to forceBiome) |
| D12 | Apply listener double-bound | ✅ Stage 4 |
| D13 | `alert()` error handler | ✅ Stage 5 |
| D14 | CSS broken `writing-mode: bt-lr` | ✅ Stage 11 (vertical-lr + @supports fallback) |
| D15 | CSS z-index collisions | ✅ Stage 11 (volume-popup → 250) |
| D16 | No `vite.config.ts` | ✅ Stage 6 |
| D17 | Version drift | ✅ Stage 6 (1.0.0-beta → 1.1.2) |

## Tests

44 tests across 5 files:
- `Random.test.ts` — 14 tests (was 8). Adds fork() + nextInt edge cases.
- `deepClone.test.ts` — 4 tests.
- `Expression.test.ts` — 16 tests (basic arithmetic, precedence, constants, safety/rejection).
- `regions.test.ts` — 6 tests (registry completeness, transition graph, identity).
- `Determinism.test.ts` — 3 tests (proves the DEC-01 contract end-to-end).

## Deployment story

- **GitHub Pages** — `fszalaj.github.io/skyline-scroller/` — automatic on push to main.
- **fidom.link** — `skyline-scroller.fidom.link` via homelab Traefik + nginx container on Deployarr (PUBLIC — `chain-no-auth`). One-time homelab setup per `deploy/homelab/README.md`, then `deploy-fidom.yml` keeps it synced. Needs `DEPLOYARR_HOST` + `DEPLOYARR_SSH_KEY` GH secrets.
- **CI** — `.github/workflows/ci.yml` runs lint/typecheck/test/build in parallel.
- **Auto-merge** — PR with `auto-merge` label + green CI + owner author → GitHub auto-merge enables via `gh pr merge --auto --squash`.
- **CodeQL** — weekly + PR scan for TypeScript.
- **Dep audit** — daily; opens an issue on high+ severity.
- **Release notes** — release-drafter v6, auto-generated, no AI attribution.

## Project Claude config (shipped in repo)

- `CLAUDE.md` at root — auto-loaded.
- `.claude/settings.json` — permissions + SessionStart hook registers Obsidian vault.
- `.claude/agents/` — `wiki-curator`, `slop-hunter`, `codex-review`.
- `scripts/setup-vault.sh` — idempotent Obsidian vault registration (mac+linux).
- `scripts/dev-setup.sh` — one-shot fresh-clone bootstrap.

A new contributor's first three commands:
```bash
git clone https://github.com/krzoder/skyline-scroller
cd skyline-scroller
bash scripts/dev-setup.sh
```

## Open threads

- **Codex review** (job `a24b0fd5...`) — still running in background; verdicts will be folded into a follow-up commit if anything actionable surfaces.
- **DEC-04 main.ts decomposition** — deferred. main.ts is down to 1724 LOC after slop; the 7-way breakup is a separate substantial refactor for a later session.
- **D5 Building extends CityEntity** — deferred. Not user-visible; cosmetic class-hierarchy fix.
