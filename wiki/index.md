---
name: Index
description: Master table of contents for the skyline-scroller wiki.
type: index
---

# Index

> Populated by the swarm scan on 2026-05-20. See [[log]] for history, [[hot]] for current state.

## Entities (code units)

- [[entities/main]] — UI shell + orchestration entry (`src/main.ts`, ~1894 LOC)
- [[entities/Game]] — Game-loop owner, render coordinator (`src/engine/Game.ts`)
- [[entities/Terminal]] — Terminal state-machine and autocomplete engine (`src/engine/Terminal.ts`)
- [[entities/SkySystem]] — Sky, celestial bodies, day/night cycle (`src/engine/SkySystem.ts`)
- [[entities/Landscape]] — Background landscape layer (`src/engine/Landscape.ts`)
- [[entities/Ground]] — Ground strip renderable (`src/engine/Ground.ts`)
- [[entities/Layer]] — Parallax layer container (`src/engine/Layer.ts`)
- [[entities/Building]] — Building entity (`src/engine/Building.ts`)
- [[entities/CityEntity]] — Base for placed entities (`src/engine/CityEntity.ts`)
- [[entities/Tree]] — Tree entity and variants (`src/engine/Tree.ts`)
- [[entities/TextureGenerator]] — Procedural texture/canvas baker (`src/engine/TextureGenerator.ts`)
- [[entities/Renderable]] — Shared rendering interface (`src/engine/Renderable.ts`)
- [[entities/CityGenerator]] — Procedural city assembler (`src/procgen/CityGenerator.ts`)
- [[entities/BiomeSystem]] — Biome selection and parameters (`src/procgen/BiomeSystem.ts`)
- [[entities/TreeConfig]] — Tree configuration defaults and types (`src/procgen/TreeConfig.ts`)
- [[entities/Random]] — Seeded RNG and hashing (`src/utils/Random.ts`)
- [[entities/index-html]] — Shell HTML + DOM topology (`index.html`, `public/`)

## Systems (cross-file behaviour)

- [[systems/game-loop]] — RAF loop, frame timing, render/update split
- [[systems/parallax-layers]] — Multi-depth scrolling math and layer composition
- [[systems/procgen]] — Seed → biome → entity pipeline
- [[systems/sky]] — Gradient stacks, sun/moon, time-of-day model
- [[systems/terminal]] — Grammar, autocomplete, command dispatch
- [[systems/ui-shell]] — DOM controls, windows, settings, gestures
- [[systems/entity-rendering]] — Building/Tree/Ground draw pipeline + caching
- [[systems/css-architecture]] — Stylesheet structure and theming

## Concepts (cross-cutting)

- [[concepts/determinism]] — Seed → reproducible scene chain
- [[concepts/dualisms]] — Duality patterns embedded in the codebase
- [[concepts/control-flow]] — State machines, event flow, data flow
- [[concepts/chunking]] — Chunked world streaming
- [[concepts/time]] — In-world time vs frame time vs wall clock
- [[concepts/parallax-math]] — Speed ratios and depth ordering

## Operations

- [[operations/build-deploy]] — Vite build, GitHub Actions, Pages
- [[operations/codex-integration]] — How Claude reads from and writes to Codex (canonical reference)

## Decisions (ADRs)

- [[decisions/DEC-01-unified-rng]] — Sub-stream RNG via `Random.fork(label)`; replace every `Math.random()`/`Date.now()` leak
- [[decisions/DEC-02-lifecycle]] — Proper `dispose()` with `cancelAnimationFrame` + handler-removal; preview-game leak fix
- [[decisions/DEC-03-safe-eval-and-error]] — Recursive-descent expression parser replacing `Function()` eval; toast replacing `alert()`
- [[decisions/DEC-04-main-decomposition]] — `main.ts` → 9 `ui/` modules + `Window` abstraction; kill duplicate Apply handler
- [[decisions/DEC-05-low-code-config]] — `src/config/` + `src/regions/` declarative biomes; `vite.config.ts`; CSS tokens
- [[decisions/DEC-06-cloudflare-outpost]] — **SUPERSEDED** by DEC-09 (wrong infrastructure assumption)
- [[decisions/DEC-07-enterprise-workflows]] — Composite setup action, SHA-pinned actions, CodeQL, dep-audit, release-drafter
- [[decisions/DEC-09-homelab-deploy]] — Deploy via homelab Traefik + Authentik embedded outpost at `skyline-scroller.fidom.link`

## Plans

- [[plans/simplification-plan]] — DEC-08 — Master 10-stage simplification plan; slop inventory; expansion inventory; estimated −1300 net LOC

## Maps

- [[maps/dependencies]] — Module dependency graph
- [[maps/complexity]] — Hotspots and complexity heatmap
- [[maps/wiki-drift]] — Diff between legacy wiki and current code
