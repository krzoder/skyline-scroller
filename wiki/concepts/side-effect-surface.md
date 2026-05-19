---
name: Side-effect Surface
description: The binary architectural split — engine modules are pure draw-to-context, main.ts is the DOM layer, and the boundary is leaky in two specific places.
type: concept
---

# Side-effect Surface

## Definition

skyline-scroller is built around a **binary architectural split**:

- **Engine = pure draw-to-context.** Modules in `src/engine/*` and `src/procgen/*` receive a `CanvasRenderingContext2D` and paint into it. They allocate off-screen canvases for caching ([[concepts/entity-caching]]) but otherwise do not touch the DOM.
- **`main.ts` = DOM layer.** All `document.querySelector`, all event listeners, all DOM mutation, all UI state mirroring lives here. ~1894 LOC of glue.

This boundary is the load-bearing organisational principle of the codebase. It is the reason the engine is headlessly testable (modulo `document.createElement('canvas')` polyfills) and the reason [[concepts/determinism]] is *almost* watertight — the leaks all happen at the boundary or inside engine modules that *should* be pure.

## Where it lives

### Pure-ish (DOM only to allocate off-screen canvases — no `getElementById`, no listeners)

| Module | DOM contact |
|---|---|
| `src/utils/Random.ts` | None |
| `src/procgen/BiomeSystem.ts` | None |
| `src/procgen/CityGenerator.ts` | None |
| `src/procgen/TreeConfig.ts` | None |
| `src/engine/Renderable.ts` (interface) | None |
| `src/engine/Ground.ts` | None |
| `src/engine/Layer.ts` | None |
| `src/engine/CityEntity.ts` | `document.createElement('canvas')` for cache |
| `src/engine/Building.ts` | `document.createElement('canvas')` for texture |
| `src/engine/Tree.ts` | `document.createElement('canvas')` for cache |
| `src/engine/Landscape.ts` | `document.createElement('canvas')` for cache |
| `src/engine/TextureGenerator.ts` | `document.createElement('canvas')` for patterns |

### DOM-coupled

| Module | DOM contact |
|---|---|
| `src/engine/Game.ts` | `window.addEventListener('resize')`, `document.getElementById('ui-seed-val' \| 'ui-time-val')` polled every frame in `update` (lines 183–204) |
| `src/engine/Terminal.ts` | `document.documentElement.requestFullscreen()` (`:370`), DOM IO for the terminal panel |
| `src/main.ts` | Almost everything, by design. ~1894 LOC |
| `src/engine/SkySystem.ts` | Constructor reads `Date.now()` (`:42`) — not DOM, but a non-reproducible env input |

## Why it matters

- **Engine is headlessly testable.** Vitest can run any procgen module without a browser. `Random.test.ts` is the existing example; the architecture supports many more.
- **Determinism is mostly preserved.** The seed contract ([[concepts/determinism]]) holds *because* the engine doesn't reach out for entropy. It only fails at the documented escape hatches (which are all inside engine modules — see "Counter-examples").
- **One file owns side effects.** Refactoring the UI doesn't require touching the engine. Refactoring the engine doesn't require touching the UI. The two ends are coupled only via the `Game` public API and the `Terminal` callbacks.
- **The split is a foundation node.** In [[concepts/control-flow]]'s concept graph, "side-effect surface" is a yellow foundation node — every other concept either lives entirely inside the pure side or crosses the boundary at a documented point.

## Counter-examples (where the boundary leaks)

### Engine reading the DOM every frame

`Game.update` (lines 183–204) calls `document.getElementById('ui-seed-val')` and `document.getElementById('ui-time-val')` **every frame** to keep the HUD strings in sync. This is render-loop polling of the DOM instead of an event-based push. Cheap (the lookups are cached by the browser), but iconic of where the boundary is fuzzy. The seed write is gated by `innerText !== ...`; the time write is not — it changes every frame anyway.

### Engine reading entropy

- **`SkySystem` constructor** reads `Date.now()` (`SkySystem.ts:42`) to seed its own `Random`. Sky is non-deterministic by design. See [[concepts/determinism]].
- **`Math.random()` calls** scattered through `Building.generateTexture`, `Landscape.generateShape`, `Landscape.decorate`, `Tree` constructor, `Game.initNoise`. All inside "pure" engine modules. Each is a determinism leak; see [[concepts/determinism]] for the full list.

### Engine resizing

`Game` registers a `window.addEventListener('resize')` listener in its constructor. This is the only DOM event listener the engine owns directly. Removing it would require pushing resize as a method call from `main.ts` — feasible but not done.

### Terminal touches fullscreen

`Terminal.fullscreen` command calls `document.documentElement.requestFullscreen()` (`Terminal.ts:370`). The Terminal lives in the engine namespace but reaches into the DOM here.

### `main.ts` polls game state

The inverse leak: `main.ts` reads `game.timeScale`, `game.getSeed()`, `game.generator.config`, `game.getVolume()`, etc. each time a UI element needs to refresh. This is "pull" — the boundary is crossed in both directions. The dedicated bridge is `syncUIFromTerminal`, called once per terminal command to re-pull engine state into the DOM widgets. See [[concepts/control-flow]] §6.

## DOM-state vs game-state mirror

The major dualism that the side-effect split implies — the same fact lives in two places, bridged by `syncUIFromTerminal`:

| Concept | Game-state | DOM-state |
|---|---|---|
| Volume | `game.volume` (0..1) | `currentVolume` (0..100), `volumeSlider.value`, `lastVolume` |
| Muted | `game.isMuted` | `isMuted` (module), icon SVG innerHTML |
| Time scale | `game.timeScale` | `speedSlider.value`, `advSpeedSlider.value`, `advSpeedInput.value`, `currentAdvSpeedCenter` |
| Time format | `game.timeFormat` | `btn-selected` class on three buttons |
| Seed | `game.seed` | `seedInput.value`, `custom-seed-input.value`, `#ui-seed-val.innerText` |
| Tree config | `game.treeConfig` and `game.generator.config` | many checkbox/slider/number inputs |
| Pending reset | `terminal.pendingResetTarget` | (none — pure engine) |
| Custom-gen "confirm reset?" | `isResetConfirming` (module) | button innerText + background color |

There's also a triplicate for tree config: `game.treeConfig` ↔ `previewGame.treeConfig` ↔ `previewGame.generator.config`. `refreshPreview` and Apply move config across these. The [[concepts/dualisms]] #121 deep-clone convention is the load-bearing fix for this triplicate.

## Invariants

- No `src/engine/**` or `src/procgen/**` module imports anything from `src/main.ts`. Dependencies flow only one way.
- The engine never calls `addEventListener` on anything other than `window` (only `Game.ts` does, only for `resize`).
- The engine never reads `localStorage`, `sessionStorage`, `cookie`, or `fetch`. There is no persistence layer.
- `main.ts` is the only file that calls `querySelector` on real UI elements.

## See also

- [[concepts/determinism]] — the leaks all live inside engine modules that should be pure
- [[concepts/control-flow]] — `syncUIFromTerminal` and the DOM-state vs game-state mirror
- [[concepts/customisation-flow]] — how user actions cross the boundary
- [[concepts/single-canvas]] — the engine's output side
- [[decisions/DEC-04-main-decomposition]] — proposed split of the 1894-LOC main.ts
- [[entities/Game]] — the boundary-straddling class
