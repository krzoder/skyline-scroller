# Agent 05 — Landscape / Ground / Layer

Scope: parallax scene infrastructure. `Layer` is the parallax container, `Landscape` is a hill/silhouette `CityEntity`, `Ground` is a flat coloured strip implementing `Renderable` directly.

## Files scanned

- `src/engine/Layer.ts` (75 LOC) — parallax container with `objects: Renderable[]`, `speedModifier`, `zIndex`, `yOffset`, `scale`.
- `src/engine/Landscape.ts` (175 LOC) — `CityEntity` subclass producing biome-shaped silhouettes (forest hill, desert dune, tundra peaks, plains hill, city skyline strip).
- `src/engine/Ground.ts` (55 LOC) — `Renderable` directly; flat textured strip (`grass | pavement | water | dirt`).
- Cross-read: `Renderable.ts`, `CityEntity.ts`, `Game.ts` (lines 100–125), `CityGenerator.ts` (lines 1–180).

## Public surface (exports/classes/functions/types)

### `Layer`
```ts
class Layer {
  objects: Renderable[]
  speedModifier: number   // parallax factor: 0.2 .. 1.0
  zIndex: number          // 0 = furthest, 3 = nearest
  yOffset: number         // pixels to shift UP (translate(0, -yOffset))
  scale: number           // ctx.scale(scale, scale), default 1.0
  constructor(speedModifier, zIndex, yOffset=0, scale=1.0)
  add(obj: Renderable)
  prune(cameraX, buffer=2000)
  draw(ctx, cameraX, screenWidth, _screenHeight)
}
```
Note: `Layer` does **not** implement `Renderable` — it is a container, not a drawable in the `Renderable` sense. Its `draw` signature differs (takes `cameraX` not `offsetX`).

### `Landscape extends CityEntity`
```ts
class Landscape extends CityEntity {
  biome: BiomeType
  points: {x,y}[]   // polyline silhouette in local coords (y is negative-up)
  constructor(x, width, height, biome)
  draw(ctx, offsetX): void   // OVERRIDES CityEntity.draw — calls super then paints a 2000px-tall fill rect downward
  // private: generateShape(), drawToCache(ctx), decorate(ctx, baselineY), getColor(), getDecorColor()
}
```

### `Ground implements Renderable`
```ts
type GroundType = 'grass' | 'pavement' | 'water' | 'dirt'
class Ground { x, y=0, width, height=100, type
  constructor(x, width, type)
  draw(ctx, offsetX)
  isVisible(_viewX, _viewWidth) { return true }
}
```

## Internal state

### Layer
- `objects[]` — flat array of Renderables (mixed: `Ground`, `Building`, `Tree`, `Landscape`). No spatial index. No sort.
- `speedModifier`/`zIndex`/`yOffset`/`scale` are immutable after construction.
- Configured in `Game.reset()`:
  - L0: `(0.2, 0, 190, 1.3)` — slowest, lifted highest, scaled up 1.3×
  - L1: `(0.4, 1, 100)`
  - L2: `(0.6, 2, 50)`
  - L3: `(1.0, 3, 0)` — foreground, full speed, no Y lift

### Landscape
- `biome` drives shape, fill colour, decoration logic.
- `points[]` precomputed at construction (cached polygon).
- Inherits `cacheCanvas` from [[CityEntity]] (offscreen canvas) — `initCache(50)` pads with 50px to fit tree decorations that overflow the peak.

### Ground
- Stateless beyond constructor inputs. `y=0` (relative to layer space), `height=100` arbitrary depth below screen.

## Control flow

### Layer.draw — the parallax pipeline
```
layerViewX = cameraX * speedModifier
ctx.save()
ctx.translate(0, -yOffset)       // lift the layer up
if (scale != 1) ctx.scale(s, s)  // scale L0 up 1.3× for "hill bigness"
for each obj in objects:
   screenX = obj.x - layerViewX
   if visible bounds: obj.draw(ctx, layerViewX)   // pass parallax-adjusted offset
ctx.restore()
```
The same `layerViewX` is passed to children as `offsetX`, so children compute `screenX = obj.x - offsetX` in their own local terms.

### Landscape.draw — double-rendering quirk
1. `super.draw(ctx, offsetX)` — blits the cached silhouette polygon at `(screenX - padding, y - height - padding)`.
2. Then **also** paints `ctx.fillRect(screenX - 1, this.y, this.width + 2, 2000)` — a 2000px-tall flood downward in the biome fill colour. This is the "fix floating artifacts" patch: hides gaps between the silhouette polygon's bottom edge and whatever lies further down when the layer is lifted via `yOffset`.

### Layer.prune
- Removes objects whose right edge is more than `buffer` (2000px) behind `layerViewX`. Called from elsewhere (presumably the game loop) to bound memory.

### CityGenerator.generate
- For each layer: while `lastX[i] < cameraX * speedModifier + viewport + 500`, append a chunk.
- A "chunk" = one `Ground` strip + optionally one feature (`Landscape` for layers ≤1, `Building`/`Tree` for layers ≥2). See [[concepts/Chunk-Generation]].
- `lastX[i] += chunkWidth - 1` — chunks overlap by 1px to hide seams.

## Dependencies

### Imports
- `Layer.ts` → `Renderable` (type only).
- `Landscape.ts` → `CityEntity`, `BiomeType` (from procgen).
- `Ground.ts` → `Renderable` (type only).

### Imported-by
- `Layer` ← `Game.ts`, `CityGenerator.ts`.
- `Landscape` ← `CityGenerator.ts` (created for layerIndex ≤ 1).
- `Ground` ← `CityGenerator.ts` (one per chunk, every layer).
- All three render targets are children of `Layer.objects`.

See [[entities/Game]], [[entities/CityGenerator]], [[entities/CityEntity]], [[entities/Renderable]].

## Complexity & hotspots

- **`Layer.draw` is O(n) per layer per frame** — no spatial culling beyond per-object screen-bounds check. With pruning at 2000px buffer this is bounded but could grow large on long sessions. No early-exit if objects were sorted by X.
- **`Landscape.drawToCache`** — runs once per Landscape at construction. Cheap.
- **`Landscape.draw`** — runs twice per frame per landscape (cached blit + flood fillRect). The flood `fillRect(width+2, 2000)` is enormous overdraw but cheap in canvas terms; still, every parallax landscape paints a 2000px column every frame.
- **`Landscape.decorate`** uses `Math.random()` directly — non-deterministic, breaks reproducibility from `seed` (the rest of generation goes through `Random`). See "Surprises".
- **Layer.draw visibility test** mixes scaled and unscaled coordinates: `screenX * this.scale < screenWidth` but `screenX = obj.x - layerViewX` is in pre-scale local space — math is correct only when the scaled content origin is at `(0,0)`. With `scale=1.3` on L0, the visible region is effectively `screenWidth / 1.3` in local coords; the check `screenX * 1.3 < screenWidth` correctly handles that, but `(screenX + obj.width) * scale > 0` matches.

## Dualisms & duality patterns observed

- **Owner vs owned**: `Layer` owns `Renderable[]`; it is itself NOT a `Renderable`. Inverted ownership compared to e.g. compositing patterns where a container also draws as a unit.
- **CityEntity vs raw Renderable**: `Landscape` extends [[entities/CityEntity]] (gets offscreen cache canvas + padding). `Ground` implements `Renderable` directly (no cache, paints fresh every frame). Same interface, different cost model.
- **Foreground vs background**: split at `layerIndex <= 1` (Landscapes only) vs `layerIndex >= 2` (Buildings/Trees). Hard threshold in `CityGenerator.addChunk`.
- **Scroll-with vs slower-scroll**: all layers scroll *with* the camera (no scroll-against / counter-parallax). Speed modifiers 0.2/0.4/0.6/1.0 are all positive.
- **Lifted vs grounded**: `yOffset` 190/100/50/0 — background layers are translated UP so their baselines stack like distant hills receding into the picture. Foreground sits at canvas baseline.
- **Scaled vs unscaled**: only L0 has `scale=1.3`. Asymmetric — only the furthest layer is enlarged (makes background hills feel imposing/closer despite slow scroll, intentional cheat).
- **Biome-dependent vs biome-independent**: `Landscape` shape and colour are biome-dependent (forest/desert/tundra/plains/city), while `Ground` type is biome-correlated in background layers but **random** in foreground (60% pavement, 20% grass, 20% water).
- **Cached vs live**: Landscape silhouette is cached, but Landscape's flood fillRect is live. Ground is fully live.
- **Solid silhouette vs decorated silhouette**: city biome has no decorations (smooth skyline strip); other biomes get pine-tree props sprinkled along the slope.
- **Y points negative-up in local space, positive-down in screen space**: shape `points[]` use `y = -height` for peaks (CSS-inverted convention inside cache), but Canvas screen space is y-down. The cache draws with `baselineY + point.y` so peaks render upward.

## Invariants

- `Layer.objects` is monotonically appended (in `add`) and filtered (in `prune`). Order = insertion order = roughly X-ascending (because `CityGenerator` walks `lastX[i]` strictly forward).
- `Landscape.points[0].x === 0 && points[last].x === this.width` — polyline always spans the full local width.
- `Ground.y === 0` — Ground is always at layer-local baseline.
- `Ground.height === 100` — never changes.
- `speedModifier > 0` and ≤ 1.0 across all current layers (no inverted parallax).
- `lastX[i]` advances by `chunkWidth - 1`, so seams overlap by 1px (matches Landscape's `screenX - 1, width + 2` overlap).
- `cacheCanvas` padding for Landscape = 50px each side (for tree-tops poking above the silhouette).

## Surprises / risks / TODOs

- **`Math.random()` in `Landscape.generateShape` and `decorate`** — bypasses the seeded `Random` used everywhere else. Two replays with the same seed produce different hill silhouettes and decoration placement. Likely bug. See [[decisions/Use-Seeded-Random-Everywhere]].
- **Double-paint in `Landscape.draw`** — calls cached silhouette **and** floods downward 2000px. Acknowledged in comments as a fix for "Floating Artifacts" when `yOffset` lifts the layer. The flood overdraws part of the cached silhouette but with the same fill colour so it's invisible. Risk: if a future change adds gradient/texture to the silhouette, the flat flood will mismatch.
- **`Landscape.decorate` peak interpolation is hardcoded to triangle shape (`peakRatio = 0.5` / `0.4` for desert)**. Tundra has 4 peak points but decoration still uses single-peak triangle interp — props won't sit on the curve. Author comment acknowledges: "Tundra has complex shape, but for now we focus on fixing the Desert/General mismatch".
- **City biome silhouette uses `Math.random()` inside `generateShape`** to pick step heights — each `Landscape` constructed gets a different skyline despite shared seed.
- **`Ground.isVisible` always returns `true`** — culling responsibility punted to `Layer.draw`'s inline bounds check. Means if any other code paths call `isVisible` (which doesn't currently happen) they'll get false positives.
- **`Layer.prune` is defined but I don't see it called from `Game.ts` lines 100–160** — worth checking who calls it; if nobody does, `objects[]` grows unbounded. (Not in scope to confirm; flag for synthesis.)
- **`scale` only applies to objects via the canvas matrix, not their `width`** — `obj.x`, `obj.width`, `obj.y` are passed through unchanged; visibility math `screenX * scale` partially compensates but the right-edge check `(screenX + obj.width) * scale > 0` is correct only because scale > 0.
- **`Ground` water `y + 5` recess** but `height - 5` — water draws at `y+5` to `y+100`, leaving 5px of background showing. If `yOffset` doesn't account for this, the seam at water's top will reveal sky colour.
- **`Layer.zIndex` is stored but unused inside `Layer`** — must be consumed by `Game.render` to order layers. (Risk: nothing in `Layer` enforces draw order matches zIndex.)
- **`Layer.draw` mutates context state** with `save/restore` but does NOT reset `globalAlpha`, `globalCompositeOperation`, etc. — children leak state if they mutate without restoring.

## Parallax math summary

```
For layer L with speedModifier s_L and camera position cameraX:
   layerViewX = cameraX * s_L           // L's "virtual camera" — slower for distant layers

For each object in L with world-local x_obj, width w_obj:
   screenX = x_obj - layerViewX
   visible iff screenX*scale < screenWidth && (screenX + w_obj)*scale > 0
   draw at screenX (inside transformed ctx: translate(0, -yOffset) then scale(s,s))

Generation horizon for L:
   while lastX[L] < cameraX*s_L + screenWidth + 500:
       addChunk(L)
```

Key consequences:
- Slow layers (s=0.2) generate ~5× less chunk content per scroll-distance than fast layers — far background advances slowly.
- Each layer has its OWN world-X space (`lastX[layerIndex]` per layer), not a shared world. There's no canonical "world coordinate" — each layer is its own frame of reference whose `x` is scaled by `speedModifier` relative to the camera.
- No wrap-around / no chunking-by-region — infinite scroll handled by continuous append + far-behind prune. There is no modulo wrap.
- `yOffset` is a pure visual lift, not a coordinate offset for hit testing (no hit testing exists in scope).
- `scale=1.3` on L0 enlarges drawn content (including its `x` coordinates) — `screenX * 1.3 < screenWidth` is the corrected visibility test.

## Suggested wiki pages

- [[concepts/Parallax-Scrolling]] — speedModifier semantics, layer-local X spaces, prune horizon.
- [[concepts/Chunk-Generation]] — how `CityGenerator.addChunk` populates layers; chunk = Ground + optional feature.
- [[concepts/Layer-Composition]] — yOffset, scale, zIndex; how `Game.render` walks layers.
- [[entities/Layer]] — container API and lifecycle.
- [[entities/Landscape]] — biome silhouettes; double-paint quirk.
- [[entities/Ground]] — strip vs entity; type → colour mapping.
- [[entities/CityEntity]] (cross-ref) — cache canvas pattern shared by Landscape, Building, Tree.
- [[entities/Renderable]] (cross-ref) — interface contract.
- [[decisions/Use-Seeded-Random-Everywhere]] — flag `Math.random()` leaks in Landscape.
- [[decisions/Fix-Floating-Artifacts-Flood-Fill]] — Landscape's 2000px downward flood.
- [[questions/Why-Only-Layer-0-Is-Scaled]] — asymmetric 1.3× scale choice.
- [[questions/Is-Layer-prune-Called]] — verify caller for memory safety.
