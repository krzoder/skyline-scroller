# Agent 02 — `src/engine/Game.ts` & `src/engine/Renderable.ts`

## Files scanned

- `/Users/fszalaj/Documents/git/skyline-scroller/src/engine/Game.ts` (286 LOC)
- `/Users/fszalaj/Documents/git/skyline-scroller/src/engine/Renderable.ts` (8 LOC)

Cross-references (not opened, listed by `ls`): `Layer.ts`, `SkySystem.ts`, `Terminal.ts`, `Building.ts`, `Ground.ts`, `Landscape.ts`, `Tree.ts`, `CityEntity.ts`, `TextureGenerator.ts`, `../procgen/CityGenerator.ts`, `../procgen/TreeConfig.ts`, `../procgen/BiomeSystem.ts`.

## Public surface (exports/classes/functions/types)

### `class Game` (default render coordinator — `[[entities/Game]]`)

Public fields:
- `generator: CityGenerator | null` — exposed so external code can read or mutate generator state. (`[[entities/CityGenerator]]`)
- `treeConfig: TreeConfig` — deep-cloned from `DEFAULT_TREE_CONFIG`; mutable from outside (e.g. terminal). (`[[concepts/tree-config]]`)
- `timeScale: number = 1.0` — multiplier on dt fed into `update`.
- `timeFormat: 'score' | '24h' | '12h' = '24h'` — UI clock display mode.

Public methods (one-liners):
- `constructor(canvas, isPreview=false)` — bootstraps ctx, noise pattern, layers, generator, optional sky and resize hook.
- `dispose()` — sets `isRunning=false`; the next rAF tick exits the loop. (No removeEventListener — see Risks.)
- `setSeed(seed)` — stores seed and calls `reset()` (full world rebuild).
- `getSeed()` — current seed string.
- `getCameraX()` / `setCameraX(x)` — read/write camera scroll offset (in-world horizontal position).
- `resize()` — syncs `canvas.width/height` from `clientWidth/clientHeight`.
- `start()` — idempotent; arms `isRunning`, records `lastTime`, kicks `requestAnimationFrame`.
- `setTimeScale(scale)` — alias setter for `timeScale`.
- `getVolume()` / `setVolume(vol)` — stub: stored only, logged, never applied to audio.
- `getMuted()` / `setMuted(muted)` — stub: stored only, logged, never applied to audio.

Private methods:
- `initNoise()` — generates a 256x256 RGBA noise tile at ~3% alpha (`data[i+3] = 8`) and stores it as a repeating `CanvasPattern` for dithering.
- `reset()` — rebuilds the 4-layer parallax stack, instantiates `CityGenerator`, instantiates `SkySystem` (skipped in preview mode).
- `loop(time)` — rAF tick: computes safe dt, drives `update` + `render`, schedules next frame.
- `update(dt)` — advances camera, sky, generator, layer pruning, UI text.
- `render()` — runs the full draw pipeline (sky → layers → solid earth → ambient multiply → noise).

### `interface Renderable` (`[[concepts/renderable-contract]]`)

```ts
interface Renderable {
    x: number; y: number; width: number; height: number;
    draw(ctx, offsetX): void;
    isVisible(viewX, viewWidth): boolean;
}
```

Contract:
- Geometry-positioned (`x,y,w,h`) — implementers are AABB-shaped.
- `draw` takes a camera offset (caller subtracts/adds — convention defined by `Layer`).
- `isVisible(viewX, viewWidth)` — implementer decides culling (likely simple horizontal interval overlap).
- Likely implementers (by filename): `Building`, `Tree`, `Ground`, `Landscape`, possibly `CityEntity` as a base. Confirmed by file inventory; not verified contents.

## Internal state

Fields on `Game`:

| Field | Type | Default | Role |
|---|---|---|---|
| `canvas` | `HTMLCanvasElement` | ctor | render target |
| `ctx` | `CanvasRenderingContext2D` | from canvas | drawing surface |
| `lastTime` | `number` | 0 | last rAF timestamp (ms) |
| `isRunning` | `boolean` | false | loop gate |
| `cameraX` | `number` | 0 | world-space scroll position |
| `cameraSpeed` | `number` | 100 | px/s scroll velocity (constant — never modified) |
| `layers` | `Layer[]` | [] | 4 parallax layers, rebuilt in `reset` |
| `generator` | `CityGenerator \| null` | null | procedural city emitter |
| `sky` | `SkySystem \| null` | null | day/night driver (null in preview) |
| `seed` | `string` | "default" | reseeded via `setSeed` |
| `treeConfig` | `TreeConfig` | clone of `DEFAULT_TREE_CONFIG` | passed by reference to generator |
| `noisePattern` | `CanvasPattern \| null` | null | dithering overlay |
| `scaleFactor` | `readonly 1.6` | const | global zoom; logical = device / 1.6 |
| `timeScale` | `number` | 1.0 | multiplier on dt |
| `volume` | `number` | 1.0 | stored only, no audio wiring |
| `isMuted` | `boolean` | false | stored only |
| `isPreview` | `boolean` | ctor arg | gates sky + resize + DOM-UI |
| `timeFormat` | `'score'\|'24h'\|'12h'` | `'24h'` | clock display |

## Control flow

### Bootstrap (`constructor`)

1. Store canvas, isPreview; grab 2D context (throws if null).
2. `treeConfig = JSON.parse(JSON.stringify(DEFAULT_TREE_CONFIG))` — defensive deep clone.
3. `initNoise()` — bakes the dither pattern.
4. `reset()` — builds layers, generator, optional sky.
5. If not preview: bind `window.resize` and call `resize()`. If preview: just call `resize()`.

### Main loop (`start` → `loop`)

- `start()` is idempotent (guards on `isRunning`).
- Records `lastTime = performance.now()` then schedules `loop`.
- `loop(time)`:
  1. Bail if `!isRunning` — but **note**: the next `requestAnimationFrame` is scheduled **after** the try/catch unconditionally (line 163). If `isRunning` is false, the next loop call returns immediately — but rAF is still queued.
  2. `deltaTime = (time - lastTime) / 1000`; `lastTime = time`.
  3. `safeDt = min(dt, 0.1)` — caps stall recovery at 100 ms to avoid teleporting after tab-blur.
  4. `update(safeDt * timeScale)` — note: timeScale multiplies the already-capped dt.
  5. `render()`.
  6. On any thrown error: log + `isRunning = false` (loop self-disarms on error).
  7. Schedule next frame.

### `update(dt)` pipeline (`[[systems/game-loop]]`)

1. `cameraX += cameraSpeed * dt` — single scroll integrator.
2. Compute `logicalW = canvas.width / scaleFactor`.
3. `sky?.update(dt, logicalW)`.
4. `generator?.generate(layers, cameraX, logicalW)` — generator owns layer mutation.
5. `layers.forEach(l => l.prune(cameraX))` — drop entities left behind.
6. If not preview: write DOM textContent for `#ui-seed-val` and `#ui-time-val` (the latter switches on `timeFormat`).

### `render()` pipeline order (the canonical Z-order)

Top of stack ↓ bottom of stack:

1. `ctx.save()` and `ctx.scale(1.6, 1.6)` — global pixel-art scale.
2. **Sky** — `sky.draw(ctx, W, H)` (gradient fill). Fallback solid `#000` if no sky.
3. `ctx.save()` + `translate(0, groundY)` where `groundY = logicalH - 80`.
4. **Layers** (back-to-front per array order — index 0 first: `0.2`, `0.4`, `0.6`, `1.0` speed modifier) — each `layer.draw(ctx, cameraX, W, H)`.
5. `ctx.restore()` (cancel groundY translate).
6. **Solid Earth bar** — `#2e2e2e` rect from `groundY` to `groundY+80`. This hides any sky pixels showing below the horizon.
7. **Ambient multiply overlay** — `globalCompositeOperation = 'multiply'`, fill with `sky.getAmbientColor()`, then reset to `'source-over'`. This is the day/night tint applied to **everything below it** (sky + layers + earth).
8. **Noise dither** — `fillRect` with `noisePattern` over the full logical rect to break banding from the multiply overlay.
9. `ctx.restore()` (cancel scale).

So the strict order is: **sky → layers → ground bar → ambient → noise**. There is no Terminal/UI drawing in `Game.render()` — terminal and `#ui-*` elements live in DOM, not canvas.

## Dependencies (imports / imported-by)

Direct imports in `Game.ts`:
- `./Layer` — `Layer` class (4 instances constructed in `reset`).
- `../procgen/CityGenerator` — class. (`[[entities/CityGenerator]]`)
- `../procgen/TreeConfig` — type `TreeConfig` + value `DEFAULT_TREE_CONFIG`. (`[[concepts/tree-config]]`)
- `./SkySystem` — class. (`[[entities/SkySystem]]`)

`Renderable.ts` has zero imports — pure interface.

Likely imported-by (not verified by reading):
- `Game` is constructed somewhere in `src/main.ts` / `src/index.ts` / `src/App.*` — the entry point that owns the `<canvas>` element and the terminal.
- `Renderable` is likely implemented by `Building`, `Tree`, `Ground`, `Landscape` (filenames in `src/engine/`).

## Complexity & hotspots

- `render()` is ~50 lines of canvas state choreography. Two nested `save/restore` levels — easy to leak transforms if a future edit forgets a `restore`. Currently balanced (2 saves, 2 restores).
- `update` does O(layers) prune calls; pruning cost dominated by `Layer.prune` (not inspected here).
- The **multiply pass** over the whole canvas is the most expensive per-frame fill — every pixel is read and multiplied. On Retina canvases this is full physical-pixel cost.
- The **noise pattern** repeat blit is also full-canvas every frame. Cheap but not free.
- `initNoise` uses `Math.random()` — pattern is regenerated only at boot, never on reseed, so noise is non-deterministic across page loads but constant within a session. **Not seeded.**
- Loop has no fixed-timestep substep — pure variable-dt. Long stalls clamp to 0.1 s (so world skips, doesn't catch up).

## Dualisms & duality patterns observed

This file is dense with dualities. Listed:

1. **update vs render** — classic separation: `update(dt)` mutates world state, `render()` reads it. Both run every frame, no interpolation. (`[[concepts/update-render-split]]`)
2. **paused vs playing** — actually **not** a true pause; `timeScale = 0` is the only way to pause (no `isPaused` flag). `isRunning` is run-vs-stopped, a different axis. Two booleans worth of "is the world moving" collapsed into one continuous knob.
3. **run-state vs world-time** — `isRunning` (loop alive) is orthogonal to `timeScale` (world tick rate). Stopping the loop ≠ pausing the world; setting timeScale=0 pauses the world but keeps rAF spinning.
4. **frame-time vs world-time** — `deltaTime` (real ms) vs `safeDt * timeScale` (in-world dt). Sky and camera live in world-time; rAF callbacks live in frame-time.
5. **deterministic vs procedural** — generator takes `seed` (deterministic), but `initNoise()` uses `Math.random` (procedural per-load). The noise overlay alone breaks pixel-identical reproducibility even with same seed.
6. **preview vs main game** — `isPreview` gates: window resize listener, sky instantiation, DOM UI writes. Preview is sky-less, UI-less, single-canvas — a hermetic instance.
7. **foreground vs background (parallax)** — 4 layers, speed modifier 0.2 (slowest, "highest" with yOffset 190) to 1.0 (fastest, ground level). Z-order matches draw order.
8. **logical vs device pixels** — `scaleFactor = 1.6` defines logical space; every dimension in `render` uses `canvas.width / scaleFactor`. Coarse pixel-art scaling, not DPR-aware.
9. **world-space vs screen-space** — `cameraX` is world-space scroll; rendering subtracts it inside `Layer.draw`. `Renderable.draw(ctx, offsetX)` codifies this convention.
10. **canvas vs DOM UI** — clock and seed badge are DOM `innerText` writes (`#ui-seed-val`, `#ui-time-val`), not canvas draws. Two parallel UI surfaces.
11. **sky-time vs score-time** — `timeFormat === 'score'` displays `cameraX` (distance scrolled), other modes display `sky.getTime()` (24h cycle). Two unrelated clocks share one UI slot.
12. **12h vs 24h** — clock string formatting branch.
13. **additive vs multiplicative blending** — the ambient pass is `multiply` (darkens), the noise pass is `source-over` (additive-ish via low alpha). Two compositing regimes per frame.
14. **public vs private** — generator and treeConfig are deliberately public (live-tweakable from terminal); seed and camera have getter/setter pairs; sky and layers are sealed.
15. **stored vs applied** — `volume`/`isMuted` are stored but the comments say `TODO: Apply to audio context`. Dual state with no consumer yet.
16. **reset vs reseed** — `setSeed(seed)` is just `seed = seed; reset()`. But `reset()` itself does more than reseed (rebuilds layers, sky). They are non-symmetric — same call shape, different scopes.
17. **idempotent vs side-effectful start** — `start()` is idempotent on `isRunning`, but does not unbind anything on `dispose`. Asymmetric lifecycle.
18. **catch-up vs skip** — capped dt at 0.1 s means after a stall, the world *skips* the missing time rather than catching up. Choice of frame-skip semantics.

## Invariants

- `0 <= safeDt <= 0.1` per tick.
- `cameraX` is monotonically non-decreasing while running (since `cameraSpeed=100` is constant, `timeScale>=0` assumed but not enforced).
- `layers.length == 4` after every `reset()` — encoded as a magic constant (`this.layers.length` is passed to `CityGenerator`).
- Layer draw order = array order = z-order back-to-front.
- `groundY = logicalH - 80` — magic 80px earth bar everywhere.
- After `render()`: `globalCompositeOperation === 'source-over'` (explicitly reset).
- After `render()`: ctx transform stack at original depth (2 save/2 restore balanced).
- `sky === null` iff `isPreview === true` (after construction, never re-instantiated).
- `treeConfig` is a fresh deep clone — never shares structure with `DEFAULT_TREE_CONFIG`.

## Surprises / risks / TODOs

1. **rAF scheduled even when stopped** (line 163): the next `requestAnimationFrame` is queued outside the try/catch and after the early-return on `!isRunning`. So `dispose()` only stops *one* future tick — the very next rAF will fire `loop(time)` which then early-returns. Not a leak (loop self-terminates), but reads as a bug.
2. **`dispose()` does not removeEventListener** — the `window.addEventListener('resize', ...)` from the constructor is never removed; the bound arrow keeps a strong reference to the `Game`. **Real leak** if `Game` is re-instantiated (e.g. hot reload, preview→main swap).
3. **`reset()` does not null-out the old generator/sky** before reassigning — fine in JS, but if those classes hold their own event listeners or rAF handles, this matters. Not inspected.
4. **Noise pattern is not seeded** — `Math.random()` in `initNoise`. Determinism broken on any frame snapshot test.
5. **`cameraSpeed = 100` is hardcoded** — no setter. The only way to change scroll speed externally is `timeScale`, which also affects sky time.
6. **`timeScale` is uncapped and unvalidated** — negative values would scroll backwards (probably breaking `prune` and `generator`).
7. **`volume`/`isMuted` are stubs** — explicit `TODO`s in the file. No audio system wired in.
8. **DOM coupling in `update`** — game loop reaches into DOM (`document.getElementById`) every frame. Tight coupling between engine and `index.html` markup. Misses `#ui-seed-val` / `#ui-time-val` silently if not present (preview path skips this entirely).
9. **`scaleFactor` not DPR-aware** — high-DPI displays get blurred pixel art unless device pixel ratio is handled upstream when sizing the canvas.
10. **Multiply overlay covers the earth bar too** — the dark earth gets darker at night, which is probably intentional but means the earth color depends on sky time (not constant `#2e2e2e` visually).
11. **Multiply happens **before** noise** — noise is at full brightness on top of a darkened scene; at deep night the dither dots could become the brightest pixels. Visual artefact risk.
12. **Comment archaeology** (lines 118-131) — dead/uncertain comments about whether `SkySystem` was deleted, whether `initNoise` was duplicated. Suggests this file has been live-edited via LLM assistance and not cleaned up. Code smell, not a bug.
13. **`Renderable.isVisible(viewX, viewWidth)`** — signature suggests horizontal-only culling. Tall scenes (e.g. flying objects) cannot vertically cull through this interface. Likely intentional for a 2D side-scroller.
14. **`Renderable.draw(ctx, offsetX)`** — only takes an x-offset, not y-offset and not viewport size. Implementers can't responsively re-layout based on viewport, only translate.
15. **`Game.generator` is public** — terminal commands can swap it out at runtime. Safe, but unguarded.
16. **`treeConfig` shared by reference** with `CityGenerator` — mutating `game.treeConfig.flowerChance = 0.5` from terminal mutates the same object the generator already holds. This is probably the *intended* live-edit mechanism (recent commit `9a7c5df` mentions terminal flowerChance controls).
17. **No `cancelAnimationFrame` on dispose** — combined with #1, you can have multiple rAF callbacks racing if `start()` were not idempotent. It is idempotent, so OK in practice.

## Suggested wiki pages

- `[[entities/Game]]` — class reference, fields, methods, lifecycle.
- `[[entities/SkySystem]]` — referenced; another agent likely owns.
- `[[entities/CityGenerator]]` — referenced; another agent likely owns.
- `[[entities/Layer]]` — 4-instance parallax abstraction.
- `[[concepts/renderable-contract]]` — the 8-line interface and who implements it.
- `[[concepts/render-pipeline-order]]` — sky → layers → earth → ambient-multiply → noise.
- `[[concepts/scale-factor]]` — `1.6x` global pixel-art scale, logical vs device coordinates.
- `[[concepts/camera-and-world-space]]` — `cameraX`, `cameraSpeed`, `getCameraX/setCameraX`.
- `[[concepts/time-model]]` — `lastTime`, `safeDt`, `timeScale`, capped dt, in-world vs frame time.
- `[[concepts/seed-and-reseed]]` — `setSeed → reset` semantics, what is and isn't reseeded (noise is not).
- `[[concepts/preview-mode]]` — `isPreview` gating of sky, resize listener, DOM UI.
- `[[concepts/ambient-lighting]]` — multiply overlay from `sky.getAmbientColor()`.
- `[[concepts/dither-noise-overlay]]` — 256x256 RGBA, alpha=8, unseeded.
- `[[systems/game-loop]]` — rAF tick contract, error containment, dispose semantics.
- `[[decisions/no-true-pause]]` — design note on `timeScale=0` as pause.
- `[[risks/dispose-leaks-resize-listener]]`.
- `[[risks/dom-coupling-in-update]]`.
