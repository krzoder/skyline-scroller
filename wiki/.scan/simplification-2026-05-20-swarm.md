---
name: Simplification swarm 2026-05-20
description: Aggregated findings from 5 parallel Explore agents proposing safe code reductions. Pre-Codex verification.
type: scan
date: 2026-05-20
---

# Simplification swarm - 2026-05-20

Five Explore agents ran in parallel against the post-Stage-11 codebase (~5k LOC). Brief: enumerate concrete LOC reductions, file:line, risk. No edits.

## Aggregate estimate

| Slice | LOC reduction | Highest-value item |
|---|---:|---|
| main.ts | ~170 | shared range-calc + single-caller inline |
| engine/* | ~200-280 | Terminal validateArgs helper, SkySystem cloud/celestial tables |
| procgen + utils | ~98-108 | Expression Parser inline, CityGenerator style table |
| tests + config | ~160-170 | merge lint+typecheck, parametrize tests, drop dead release.yml read |
| dead exports / cross-cutting | ~30 + 2 archi | regions registry consolidation, VALID_BIOMES dedup |
| **TOTAL** | **~660-760 LOC** | ~13-15% of src+tests+CI |

Plus ~11 minutes saved per CI run (merge lint+typecheck job, demote Node 24 to weekly).

## Top 10 high-confidence wins (low risk, mechanical)

| # | File:line | Change | LOC | Risk |
|---|---|---|---:|---|
| 1 | `ci.yml:17-33` | Merge `lint` + `typecheck` (both run `tsc --noEmit`) | -1 job (~8min/PR) | safe |
| 2 | `ci.yml:45-50` | Node 24 -> weekly cron, PR runs Node 22 only | -1 matrix (~3min/PR) | low |
| 3 | `release.yml:25-28` | Drop `src/config/version.ts` read (file does not exist; fallback always used) | -8 LOC | safe |
| 4 | `src/utils/Expression.ts:92-151` | Inline Parser class into `evalExpression()` | -25 LOC | low |
| 5 | `src/utils/Expression.ts:162-168` | Merge tokenize + parse phases (single-pass) | -10 LOC | low (needs op-precedence regression) |
| 6 | `src/procgen/BiomeSystem.ts:10-17` | Move transitions table to `private static readonly` | -8 LOC | safe |
| 7 | `src/procgen/CityGenerator.ts:167-200` | Replace 3 biome-conditional methods with single style table lookup | -20 LOC | low |
| 8 | `src/regions/_index.ts:26,28-30` | Drop unused `ALL_BIOMES` + `getRegion()` exports | -4 LOC | safe |
| 9 | `src/regions/{forest,desert,plains,tundra,city}.ts` | Inline 5 region const files into `_index.ts` | -20 LOC + 5 fewer files | safe |
| 10 | `tests/Expression.test.ts:60-91` | Parametrize 8 safety-rejection tests | -15 LOC | safe |

## Medium-risk items (need Codex pass)

| File:line | Change | LOC | Why risk |
|---|---|---:|---|
| `src/engine/SkySystem.ts:258-328` | Extract `computeCelestialPhase(t, peakHour, flipWin, rayWin)` from sunrise/sunset mirror | ~-40 | timing-sensitive; may shift visual output if RNG-coupled |
| `src/procgen/CityGenerator.ts:70-81` | Move `groundType` selection into `BiomeSystem` | -15 | mixes layer index with biome; determinism risk if RNG draw reorders |
| `src/engine/Terminal.ts:128-570` | Data-driven command registry (28 validation checks -> `validateArgs(args, min, max, usage)`) | -40-50 | many call sites; risk of changing error message text or arg parsing semantics |
| `src/engine/Tree.ts:16-29,43-57` | `TREE_SPECS` table replaces dispatch | -20 | trivial behaviorally but touches draw cache key |

## Architectural changes (defer, propose ADR)

1. **VALID_BIOMES single source of truth** - hardcoded `['forest','desert','tundra','plains','city']` lists in `BiomeSystem.ts`, `main.ts:1057`, `Terminal.ts:460`. Export `VALID_BIOMES = Object.keys(REGIONS)` from regions, replace 3 sites. Small (saves 3 lines) but eliminates sync risk.
2. **Region registry inline** - candidate #9 above plus collapse `regions/types.ts` into `_index.ts` (BiomeDefinition interface used only there). Net: 5 files -> 1 file, ~30 LOC saved.
3. **Cancel-confirm factory in main.ts** - `cancelAdvResetConfirm` (line 511) and `cancelResetConfirm` (1228) share structure. Factory `createCancelConfirm(btn, defaultText)`. -25 LOC.
4. **Window toggle standardization** - 8 scattered `classList.add/remove('visible')` in main.ts. Standardize on `toggleWindow()` helper. -30 LOC.

## Hard NO list (constraint-blocked - do not touch)

- `src/utils/Random.ts` public API (`nextInt`, `nextFloat`, `fork`) - DEC-01 contract.
- `src/utils/Expression.ts` external API + safety rejection table - DEC-05 contract.
- `src/utils/deepClone.ts` entire module - hard rule per CLAUDE.md.
- `alert()` -> any rollback to `alert()` for errors - DEC-05.
- `tests/Determinism.test.ts` - DEC-01 contract guarantee, stays as-is.
- `Math.random()` reintroduction anywhere in engine code.

## Suggested execution order (one PR per row)

1. **PR A (zero-risk, ~60 LOC)**: items #1, #2, #3, #6, #8 from top-10. Pure config + dead export cleanup.
2. **PR B (low-risk, ~85 LOC)**: items #4, #5, #7, #10. Touches Expression + CityGenerator + tests. Requires `Determinism.test.ts` + `Expression.test.ts` green.
3. **PR C (low-risk, ~30 LOC)**: item #9 + region registry inline.
4. **PR D (medium-risk, ~70 LOC)**: SkySystem celestial phase + Terminal validateArgs. Needs visual smoke test + Codex review.
5. **PR E (architectural, defer)**: DEC-04 main.ts decomposition (out of scope for tactical slim).

## Counter-recommendations from one agent

- Tests agent flagged `auto-merge.yml` (109 LOC) as overkill for solo dev. **Do not remove** - user has been actively using it, and once contributors join it's a net win. Document as "kept intentionally".

## Open questions for Codex

1. Is the SkySystem celestial-phase mirror at lines 258-328 actually two parameterized passes, or do sunrise/sunset have asymmetric details that would break under a shared helper?
2. Does the Expression parser's two-phase design (tokenize -> parse) protect any safety invariant that single-pass eval would lose?
3. Is `groundType` selection at `CityGenerator.ts:70-81` truly safe to delegate to `BiomeSystem`, or does the layer-index coupling (`if (layerIndex === 3)`) encode an invariant that's not captured in biome metadata?
4. The `nextInt` / `nextRange` consolidation was rejected by one agent on contract grounds - confirm both are part of the public API or only one is.
