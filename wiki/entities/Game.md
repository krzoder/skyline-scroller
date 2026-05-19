---
name: Game
description: Render coordinator — owns canvas, rAF loop, parallax layers, generator, sky, and global pixel-art scale.
type: entity
source: src/engine/Game.ts
loc: 286
---

# Game

## Role

`Game` is the top-level render coordinator. It owns the canvas + 2D context, bakes a noise dither pattern, builds the 4-layer parallax stack, instantiates the [[entities/CityGenerator]] and (outside preview) the [[entities/SkySystem]], and drives the requestAnimationFrame loop. Each tick it advances the camera, ticks sky + generator, prunes off-screen entities, writes DOM HUD text, then runs the canonical render pipeline (sky → layers → earth bar → ambient multiply → noise). See [[systems/game-loop]].

## Public surface

| Member | Kind | Notes |
|---|---|---|
| `generator` | field `CityGenerator \| null` | public so terminal can mutate live |
| `treeConfig` | field `TreeConfig` | deep-cloned from `DEFAULT_TREE_CONFIG`, shared by-ref with generator |
| `timeScale` | field `number = 1.0` | multiplier on dt; `0` is the only "pause" |
| `timeFormat` | field `'score' \| '24h' \| '12h'` | HUD clock mode |
| `constructor(canvas, isPreview=false)` | ctor | binds ctx, noise, layers, generator, sky, resize |
| `dispose()` | method | sets `isRunning=false`; **does not** remove resize listener |
| `setSeed(s)` / `getSeed()` | method | `setSeed` calls full `reset()` |
| `getCameraX()` / `setCameraX(x)` | method | world-space scroll offset |
| `resize()` | method | syncs canvas size from clientWidth/clientHeight |
| `start()` | method | idempotent; arms loop |
| `setTimeScale(s)` | method | no clamp, no validation |
| `getVolume()` / `setVolume(v)` | method | **stub** — stored, never applied |
| `getMuted()` / `setMuted(m)` | method | **stub** — stored, never applied |

Private: `initNoise()`, `reset()`, `loop(time)`, `update(dt)`, `render()`.

## Internal state

| Field | Type | Notes |
|---|---|---|
| `canvas`, `ctx` | DOM | render target |
| `lastTime` | `number` | last rAF timestamp |
| `isRunning` | `boolean` | loop gate |
| `cameraX` | `number` | world-space scroll |
| `cameraSpeed` | `number = 100` | px/s, **hardcoded** |
| `layers` | `Layer[]` | exactly 4 after `reset()` |
| `sky` | `SkySystem \| null` | `null` iff `isPreview` |
| `seed` | `string` | `"default"` initial |
| `noisePattern` | `CanvasPattern \| null` | 256×256, alpha=8, **unseeded** |
| `scaleFactor` | `1.6` const | global pixel-art zoom |
| `volume`, `isMuted` | stub | dual state, no consumer |

## Control flow / lifecycle

1. **Construct** — context, deep-clone `treeConfig`, `initNoise()`, `reset()`, optional `window.resize` binding.
2. **`start()`** — idempotent; records `lastTime`, schedules `loop`.
3. **`loop(time)`** — compute `safeDt = min(dt, 0.1)`, call `update(safeDt * timeScale)` then `render()`. Self-disarms on thrown error. Next rAF scheduled unconditionally (one harmless extra tick after `dispose`).
4. **`update`** — `cameraX += cameraSpeed * dt`; `sky?.update`; `generator?.generate(layers, cameraX, logicalW)`; `layers.forEach(prune)`; write DOM HUD (`#ui-seed-val`, `#ui-time-val`).
5. **`render`** — `save` + `scale(1.6, 1.6)`, draw sky (fallback `#000`), translate to `groundY = logicalH - 80`, draw layers back-to-front, restore, draw 80px `#2e2e2e` earth bar, ambient `multiply` fill with `sky.getAmbientColor()`, noise pattern overlay, `restore`.
6. **`dispose()`** — sets `isRunning=false`. Leaks the resize listener — see [[decisions/DEC-02-lifecycle]].

## Confirmed defects (Codex 2026-05-20)

- **Resize listener leak** — `dispose()` never `removeEventListener`s the bound `resize` handler; the arrow closure keeps the `Game` alive across hot reload / preview→main swaps. Tracked in [[decisions/DEC-02-lifecycle]].
- **Unseeded noise** — `initNoise()` uses `Math.random()`, so the dither pattern differs per page load even with identical `seed`. Breaks pixel-determinism. See [[decisions/DEC-01-unified-rng]] and [[concepts/determinism]].
- **DOM coupling in `update`** — `document.getElementById` every frame for HUD text; silent no-op if markup is missing.
- **`cameraSpeed` hardcoded** — no setter; only `timeScale` can change scroll, which also affects sky.
- **`timeScale` unvalidated** — negative values would break `prune` and `generator` invariants.
- **Audio stubs** — `volume`/`isMuted` stored but never wired to an audio context.

## Dependencies

Imports:
- `./Layer` — [[entities/Layer]]
- `./SkySystem` — [[entities/SkySystem]]
- `../procgen/CityGenerator` — [[entities/CityGenerator]]
- `../procgen/TreeConfig` — `TreeConfig` type + `DEFAULT_TREE_CONFIG` value

Imported by:
- App entry (`src/main.ts` / `src/index.ts`) — owns the `<canvas>` and the [[entities/Terminal]].

## Notable invariants

- `0 <= safeDt <= 0.1` per tick (stall cap).
- `cameraX` monotonically non-decreasing while running (assuming `timeScale >= 0`).
- `layers.length === 4` after every `reset()`.
- Layer array order === draw order === back-to-front Z-order.
- `groundY === logicalH - 80` (magic constant).
- After `render()`: `globalCompositeOperation === 'source-over'` and ctx transform depth balanced.
- `sky === null` iff `isPreview === true`.
- `treeConfig` is a fresh deep clone — never aliases `DEFAULT_TREE_CONFIG`.

## See also

- [[systems/game-loop]] — rAF tick contract and error containment
- [[systems/sky]] — what `sky.update` / `sky.draw` / `getAmbientColor` deliver
- [[entities/SkySystem]], [[entities/CityGenerator]], [[entities/Layer]], [[entities/Renderable]]
- [[concepts/renderable-contract]] — the 8-line `Renderable` interface
- [[concepts/determinism]] — what is and isn't reseeded (noise isn't)
- [[concepts/dualisms]] — update/render, run-state/world-time, preview/main, etc.
- [[decisions/DEC-01-unified-rng]] — Date.now seeding and unseeded noise
- [[decisions/DEC-02-lifecycle]] — dispose leak and listener teardown
