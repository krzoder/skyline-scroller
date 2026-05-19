---
type: map
title: Complexity Map & Refactor Heat
tags: [map, complexity, refactor]
updated: 2026-05-20
source: wiki/.scan/agent-13-complexity-deps.md
---

# Complexity map & refactor heat

File-by-file static metrics for every `src/` + `tests/` TypeScript file. **17 source files, 4 415 LOC total.** `CC-proxy = if + else-if + for + while + switch + case + ternary` (McCabe-style sum, relative ranking).

## Headline rankings

| Rank | File | LOC | CC-proxy | Density (CC/100 LOC) | Verdict |
|---:|---|---:|---:|---:|---|
| 1 | `src/main.ts` | **1 894** | **215** | 11.4 | Catastrophic — UI wiring + state + multiple subsystems |
| 2 | `src/engine/Terminal.ts` | 596 | **97** | 16.3 | High both in absolute and density — command parser does many things |
| 3 | `src/procgen/CityGenerator.ts` | 233 | **44** | **18.9** | **Highest density** — procgen logic packed tight |
| 4 | `src/engine/SkySystem.ts` | 402 | 43 | 10.7 | Time-of-day branching + weather + clouds |
| 5 | `src/engine/Tree.ts` | 187 | 26 | 13.9 | Per-type rendering branches |

By **mass**: `main.ts` dominates. By **density**: `CityGenerator` is the hotspot. See [[concepts/Cyclomatic Complexity Proxy]].

## File-by-file metrics

| File | LOC | Fn-ish | Arrows | `if` | `elif` | `for` | `while` | `switch` | `case` | `?:` | **CC-proxy** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `src/main.ts` | 1 894 | 255 | 105 | 177 | 22 | 1 | 0 | 1 | 6 | 8 | **215** |
| `src/engine/Terminal.ts` | 596 | 73 | 46 | 70 | 11 | 4 | 0 | 0 | 0 | 12 | **97** |
| `src/engine/SkySystem.ts` | 402 | 35 | 5 | 24 | 8 | 6 | 0 | 0 | 0 | 5 | **43** |
| `src/procgen/CityGenerator.ts` | 233 | 31 | 1 | 28 | 8 | 1 | 1 | 0 | 0 | 6 | **44** |
| `src/engine/Tree.ts` | 187 | 16 | 1 | 14 | 9 | 2 | 0 | 0 | 0 | 1 | **26** |
| `src/engine/Game.ts` | 286 | 36 | 5 | 16 | 1 | 1 | 0 | 0 | 0 | 1 | 19 |
| `src/engine/Landscape.ts` | 175 | 18 | 0 | 8 | 2 | 3 | 0 | 1 | 5 | 1 | 20 |
| `src/engine/Building.ts` | 127 | 14 | 0 | 10 | 4 | 4 | 0 | 0 | 0 | 0 | 18 |
| `src/engine/Layer.ts` | 75 | 6 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| `src/engine/Ground.ts` | 55 | 4 | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 0 | 5 |
| `src/engine/CityEntity.ts` | 65 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `src/engine/TextureGenerator.ts` | 46 | 5 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 1 | 4 |
| `src/engine/Renderable.ts` | 8 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `src/procgen/BiomeSystem.ts` | 51 | 6 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| `src/procgen/TreeConfig.ts` | 68 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 2 |
| `src/utils/Random.ts` | 49 | 9 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 2 |
| `src/counter.ts` | 9 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `tests/Random.test.ts` | 89 | 32 | 20 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 5 |

> `Fn-ish` counts any `<modifier>* name(` pattern — over-counts by design, treat as upper bound. See [[concepts/Cyclomatic Complexity Proxy]] for definitions.

## Public surface (exports)

| File | Exports | Notes |
|---|---:|---|
| `src/main.ts` | **0** | Side-effect entrypoint, pure DOM wiring |
| `engine/Terminal.ts` | 4 | `Terminal` + `AutocompleteSuggestion`, `TerminalState`, internal types |
| `engine/Building.ts` | 3 | `Building` + `BuildingMaterial` + `RoofType` |
| `procgen/TreeConfig.ts` | 5 | `TreeConfig`, `DEFAULT_TREE_CONFIG`, type aliases, helpers |
| `engine/Tree.ts` | 2 | `Tree` + `TreeType` |
| `procgen/BiomeSystem.ts` | 2 | `BiomeSystem` + `BiomeType` |
| `engine/Ground.ts` | 2 | `Ground` + `GroundType` |
| others | 1 each | One concept per file |

`main.ts` having **0 exports** is the structural signal: it's pure side-effect, not a library. See [[entities/main-entrypoint]].

## Refactor heat-map — top-5 candidates

### 1. `src/main.ts` — 1 894 LOC, CC 215 — PRIORITY ONE

Seven clearly delineated regions (banner comments + structural inspection):

| Line range | LOC | Concern | Suggested module |
|---|---:|---|---|
| `1 – 230` | ~230 | Imports, HTML inject, seed/canvas bootstrap | keep in `main.ts` |
| `231 – 289` | ~60 | Game ctor, seed UI handlers, copy-to-clipboard | `src/ui/seed-controls.ts` |
| `290 – 585` | **~295** | Advanced Control Panel (speed slider math, volume sync, resets, time format) | `src/ui/advanced-panel.ts` |
| `586 – 739` | ~155 | Fullscreen, Custom Gen open/close, preview canvas | `src/ui/custom-gen.ts` |
| `740 – 1 387` | **~650** | Generator V3 / tree settings dropdown / preview controls | `src/ui/tree-settings.ts` + `src/ui/preview-controls.ts` |
| `1 388 – 1 473` | ~85 | Custom seed input + speed-from/to-slider math | merge into `src/ui/speed-math.ts` |
| `1 474 – 1 775` | **~300** | Terminal mount, autocomplete render, hint rendering, history, syncUI | `src/ui/terminal-shell.ts` |
| `1 776 – 1 894` | ~120 | Log-scale slider constants, final wiring | leave or fold into preview/advanced |

The line-735 second `import { Tree }` (already pulled transitively) is the canary — file grew past manual import discipline. Target: `main.ts` shrinks to ~150 LOC pure bootstrap, seven UI modules each <300 LOC, CC drops from 215 → <40 per file. See [[decisions/Split main.ts]].

### 2. `src/engine/Terminal.ts` — 596 LOC, CC 97

Command parsing + autocomplete + state + history packed into one class. Twelve ternaries cluster in the autocomplete logic. Split:

- `src/engine/terminal/CommandRegistry.ts` — command schemas + descriptions
- `src/engine/terminal/Autocomplete.ts` — suggestion logic (12 ternaries live here)
- `src/engine/terminal/Terminal.ts` — orchestrator

See [[entities/Terminal]], [[systems/terminal]].

### 3. `src/engine/SkySystem.ts` — 402 LOC, CC 43

24 `if` + 8 `else if` — time-of-day phase switching dominates. Lines `282–401` (`drawCelestialBody`) are the most dualism-dense single function in the codebase (see [[maps/dualisms]] entries #1–#8). Candidate split:

- `src/engine/sky/CelestialBodies.ts` — sun/moon + flip
- `src/engine/sky/CloudField.ts` — spawn/despawn loop
- `src/engine/sky/SkyPalette.ts` — keyframe colour interpolation

Keep `SkySystem.ts` as per-frame conductor. See [[entities/SkySystem]], [[systems/sky]].

### 4. `src/procgen/CityGenerator.ts` — 233 LOC, CC 44 (highest density: 18.9)

8 outbound imports + 28 `if`s in 233 lines = orchestrator with embedded policies. Lines `99–116` (`addChunk` dispatch) and `179–194` (`pickTreeType` biome-filter) carry most decisions. Extract:

- `src/procgen/placement/BuildingPlacement.ts`
- `src/procgen/placement/TreePlacement.ts`
- `src/procgen/policies/biome-policy.ts` — biome → eligible types

Leaving `CityGenerator` as top-level pipeline. See [[entities/CityGenerator]], [[systems/procgen]].

### 5. `src/engine/Tree.ts` — 187 LOC, CC 26 (density 13.9)

Per-`TreeType` branching in render path. Strategy-pattern win:

- `src/engine/trees/PineTree.ts`, `OakTree.ts`, `PalmTree.ts`, `CactusTree.ts`, `SequoiaTree.ts`, `BushTree.ts`, `HedgeTree.ts`
- `src/engine/Tree.ts` becomes a thin dispatcher

See [[entities/Tree]].

## Dualisms surfaced by these metrics

1. **Density vs mass.** `main.ts` heaviest (215) at 11.4/100 LOC. `CityGenerator` densest (18.9). Refactoring `main.ts` is volume work; `CityGenerator` is decomposition.
2. **Hot path vs cold path.** Per-frame loops: `Game.update` (CC 19) + `SkySystem.tick` (CC 43). Procgen hot mass (`CityGenerator` CC 44) runs once per regen — high static complexity, cold at runtime. Don't optimise CC out of `Game.ts`/`SkySystem.ts` at the cost of legibility in `CityGenerator`.
3. **Declarations vs side-effects.** `main.ts` has 0 exports, 44 `addEventListener` calls, 62 `getElementById` calls — pure side-effect module. Every other file has ≥1 export, few-to-zero side effects. Binary split.

See [[maps/dualisms]] (full catalogue) and [[concepts/Refactor Heat-Map]].

## Surprises / risks

1. **`main.ts:735` re-imports `Tree`** that's already pulled in by `./engine/Game` transitively. Linter rule `import/no-duplicates` would catch it.
2. **`main.ts` 44× `addEventListener` + 62× `getElementById`** with no central DOM registry — single biggest UI-fragility source. Refactor into `src/ui/dom-registry.ts`.
3. **`CityGenerator` has highest CC density + highest outbound fan-out** — when it changes, ~half the engine sees ripples. Highest blast radius per LOC.
4. **`Terminal.ts` type-only imports of `Game`** hide runtime wiring. Readers see no `Game` dependency in the class, but `terminal.bind(game)` is required. Consider a `TerminalHost` interface contract.
5. **Test coverage = 1 file** (`Random.test.ts`, 89 LOC) vs 4 326 LOC production source (~2%). Procgen layer has zero direct tests despite being deterministic on `Random`.

## Cross-links

- [[maps/dependencies]] — sibling map: edge graph + inbound/outbound rankings
- [[maps/dualisms]] — duality patterns including density vs mass
- [[decisions/Split main.ts]] — the 7-way breakup proposal
- [[concepts/Cyclomatic Complexity Proxy]] — definition of CC-proxy
- [[concepts/Refactor Heat-Map]] — methodology
- [[entities/CityGenerator]] — flagged as highest-density hotspot
- [[entities/Terminal]] — flagged for command/autocomplete extraction
- [[entities/Game]] — orchestrator; do not absorb work from main.ts
- [[entities/main-entrypoint]] — current pure-side-effect bootstrap
