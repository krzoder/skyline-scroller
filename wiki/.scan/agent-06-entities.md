# Agent 06 — City entities (Building, Tree, CityEntity, TextureGenerator)

## Files scanned

- `src/engine/CityEntity.ts` (65 LOC) — abstract base
- `src/engine/Building.ts` (127 LOC) — concrete building (does NOT extend CityEntity, see Surprises)
- `src/engine/Tree.ts` (187 LOC) — concrete tree, six variants
- `src/engine/TextureGenerator.ts` (46 LOC) — static texture factory (brick + wood)

## Public surface (exports/classes/functions/types)

### `CityEntity` (abstract class, implements [[engine/Renderable]])

- Fields: `x`, `y`, `width`, `height` (public, mutable); `cacheCanvas` (protected).
- `constructor(x, width, height)` — sets `y = 0` and assigns a placeholder canvas.
- `protected initCache(padding = 0)` — allocates the offscreen canvas at `width + 2*padding` by `height + 2*padding`, translates the context by `padding`, then calls `drawToCache`.
- `protected abstract drawToCache(ctx)` — subclass hook; draws into a context whose origin is already padded.
- `draw(ctx, offsetX)` — blits the cache at `(x - offsetX - padding, y - height - padding)`. Padding is reverse-engineered from `cacheCanvas.width - this.width` (assumes symmetric padding).
- `isVisible(viewX, viewWidth)` — AABB-on-X bounds test.

### `Building` (class, implements `Renderable` directly)

- Types exported: `BuildingMaterial = 'wood' | 'brick' | 'stone' | 'plaster'`, `RoofType = 'flat' | 'gabled' | 'dome' | 'crenelated'`.
- Fields: `x, y, width, height, material, roofType, baseColor, roofColor`; private `cacheCanvas`.
- Constructor takes all geometry, material, roof, and both colors. Calls `generateTexture()` eagerly.
- `private generateTexture()` — bakes a canvas of size `width x (height + 30)` (30 = `roofHeight` constant) containing body + windows + roof.
- `draw(ctx, offsetX)` — blits at `(x - offsetX, y - cacheCanvas.height)`.
- `isVisible()` — **always returns `true`** (unused params prefixed `_`).

### `Tree` extends `CityEntity`

- Type exported: `TreeType = 'sequoia' | 'pine' | 'oak' | 'bush' | 'hedge' | 'cactus'`.
- Fields: `type`, `hasFlower` (boolean), `flowerPos: 'left' | 'right' | 'top'`.
- Constructor `(x, type, height, flowerChance = 0)` — picks width from a per-type switch (sequoia 70, pine 60, oak 90 w/ 30px padding, bush 40, cactus 40, hedge 60), rolls flower for cactus only, then `super(...)` + `initCache(padding)`.
- `drawToCache` dispatches to one of six private `draw<Variant>` methods.

### `TextureGenerator` (static-only utility class)

- `static createBrickPattern(w, h, color)` — solid fill + offset rows of `20x10` dark rectangles (every other row offset by 10).
- `static createWoodPattern(w, h, color)` — solid fill + horizontal bezier "grain" strokes every 4px, jittered by `Math.random()`.

## Internal state

- **`CityEntity.cacheCanvas`** — per-instance offscreen canvas; sole persistent state.
- **`Building.cacheCanvas`** — same idea but private (not the inherited one — see Surprises).
- **`Tree.hasFlower / flowerPos`** — per-instance random outcome, decided once at construction.
- **No global / static caches.** `TextureGenerator` does not memoise; every brick/wood call allocates a fresh `<canvas>`. Each `Building` constructs and immediately discards a sub-canvas after `drawImage` copies it into its own cache.
- **No type-level or seed-level caches.** Two buildings with identical parameters produce two independent canvases.

## Control flow

### Build phase (per entity, at construction)

1. Constructor stores params, computes dimensions.
2. `Building`: directly calls `generateTexture()`, returning a canvas it stores.
3. `Tree`: calls `super(...)` (sets `y=0`, allocates placeholder canvas), then `initCache(padding)` which re-allocates `cacheCanvas`, translates context, and calls `drawToCache(ctx)` — virtual dispatch lands on the subclass implementation.

### Draw phase (per frame)

1. Caller computes `screenX = x - offsetX` and blits the pre-baked cache.
2. `Building` aligns the texture's bottom to `this.y`; `CityEntity` aligns the padded content's bottom-left to `(x, y)` via `(screenX - padding, y - height - padding)`.
3. No re-rasterisation on draw; pure `drawImage`.

### Randomness

- `Math.random()` is called freely inside `generateTexture` (window presence/colour, stone noise) and inside `Tree` constructor (flower) plus `TextureGenerator.createWoodPattern` (grain jitter). **All randomness is non-deterministic** — no seed is threaded through.

## Dependencies (imports / imported-by)

### Imports

- `CityEntity` ← `./Renderable` (type-only).
- `Building` ← `./Renderable`, `./TextureGenerator`.
- `Tree` ← `./CityEntity` (and transitively `Renderable`).
- `TextureGenerator` — none.

### Imported by (inferred)

- Both `Building` and `Tree` are consumed by layer/world builders (probably `Layer` / `City` / scene-generation modules under `src/engine/`), via the `Renderable` contract.
- `TextureGenerator` is used only by `Building`. Trees draw materials inline (solid fills) rather than going through the generator — see Dualisms.

## Complexity & hotspots

- **Allocation pressure at construction.** Each `Building` creates ≥1 canvas (the cache) and, for `brick`/`wood`, an additional intermediate canvas inside `TextureGenerator` (immediately drawn onto the cache and dropped). Stone adds 50 `fillRect` calls of 2x2 random noise. Wood does `height/4` bezier strokes.
- **Tree.drawSequoia** does 8 ellipse layers; **drawOak** does 5 arcs; **drawPine** does 4 multi-vertex polygons. All cheap once baked.
- **No texture memoisation** — N buildings with identical sizes/colours allocate N canvases. For a dense scrolling city this could be a real memory hotspot.
- **Per-instance random branching in `Building.generateTexture`** — `ctx.fillStyle` is set once per call to either warm light or sky-blue based on a single coin flip, so every window in a building shares the same colour. The 0.2 "missing window" gate applies per-cell.
- **`isVisible` is overridden to `true` in `Building`** — culling is disabled for buildings, enabled for trees. If a caller (e.g. `Layer`) relies on `isVisible` for off-screen skipping, every building still gets a `drawImage` call regardless of viewport.

## Dualisms & duality patterns observed

- **`Building` vs `Tree`** — urban vs natural, orthogonal/grid construction vs organic/biomorphic primitives.
- **`Building` does NOT extend `CityEntity`; `Tree` does** — the would-be inheritance hierarchy is half-realised. Both implement `Renderable`, but only `Tree` participates in the `initCache`/`drawToCache` padding protocol.
- **Cache lifecycle dualism** — `Building` bakes eagerly in `generateTexture()` returning a canvas; `Tree` bakes via the inherited `initCache()` template-method. Same intent, two different mechanisms.
- **Deterministic shape vs stochastic decoration** — building dimensions, roof geometry, brick rows are deterministic from parameters; windows (presence, hue) and stone noise are stochastic. Tree silhouette/branching is deterministic from `type+height`; only cactus flower position is stochastic, and only if `flowerChance` rolls.
- **Lit vs unlit windows** — single coin flip per building (`#FDF5E6` warm vs `#87CEEB` "day reflection"). All windows in one building share the same state — a building is wholly lit or wholly dim, never mixed (see Surprises).
- **Leaf vs bare** — not modelled; all trees are foliated. No seasonal/bare variant.
- **Evergreen vs deciduous** — represented implicitly: sequoia, pine, cactus, hedge use conifer/desert greens (`#2E7D32`, `#1B5E20`, `#558B2F`); oak/bush use brighter deciduous greens (`#43A047`, `#7CB342`).
- **Urban vs natural** — material palette `wood/brick/stone/plaster` (urban) vs foliage palette (natural).
- **Texture-from-pattern vs texture-from-fill** — `brick`/`wood` go through [[engine/TextureGenerator]]; `stone`/`plaster` are inline solid + optional noise. Trees never use `TextureGenerator` (no bark/leaf textures), only flat fills.
- **Padding vs no-padding** — only `oak` requests padding (30px) because its puffs extend beyond `width`; everything else assumes content fits inside `width x height`.
- **`Math.PI, 0` arcs (upward domes/bushes)** vs full circles — domes, bush blobs, and hedge corners use half-arcs to draw "ground-rooted" rounded shapes; oak puffs are full circles.
- **Roof archetypes form a small dualism grid**: `flat` (modern/industrial), `gabled` (residential/vernacular), `dome` (civic/religious), `crenelated` (castle/military). Building selection at population time decides which axis the scene leans on.
- **Flower (cactus only)** — colour `#E91E63` pink dot is the single "ornamental" element; all other entities are decoration-free. Flower can be at `left`, `right`, or `top` — `top` is the default seed value but the constructor only ever sets `left|right`, so a flowered cactus is never `top` in practice (`top` is dead code).

## Invariants

- `y = 0` after construction (set by both base and `Building`); presumably mutated later by a layer/ground placer.
- `Building.cacheCanvas.height === height + 30` (roof headroom hard-coded).
- For `Tree`, `cacheCanvas` is square-padded: `cacheCanvas.width - width === cacheCanvas.height - height === 2*padding` (assumed by `draw` when recovering padding from width-difference only).
- Window grid invariants: `winW=6`, `winH=10`, `gapX=10`, `gapY=20`, leaving a 10px margin on left/right and 20px top/bottom of the body.
- `Tree.hasFlower === true` implies `type === 'cactus'` and `flowerPos in {'left','right'}`.

## Surprises / risks / TODOs

- **`Building` does not extend `CityEntity`.** It re-declares `x,y,width,height,cacheCanvas` and implements `Renderable` directly. The inheritance tree is asymmetric — looks like `CityEntity` was extracted from `Tree` and never retrofitted onto `Building`. Likely a refactor TODO.
- **`Building.isVisible()` always returns `true`.** Culling is silently disabled for buildings. If `Layer`/`City` uses `isVisible` to skip work, every building draws every frame. Could be intentional (parallax layers handle culling outside) or a bug.
- **No texture cache / memoisation anywhere.** `TextureGenerator` is stateless. Two identical buildings allocate two canvases. Risk for large scenes; opportunity for a per-(material, w, h, color) LRU.
- **Single `ctx.fillStyle` coin flip determines all window colours per building.** The intent of "day reflection?" (the comment is a question mark) is ambiguous — there is no day/night system gating this, just `Math.random() > 0.5`.
- **Window loop walks `gapX = 10` with `winW = 6`**, leaving 4px gaps; first window is at `x=10`, but the `for` reads `wx < this.width - 10`, so narrow buildings (width ≤ 20) may render zero windows.
- **`Tree.drawCactus` `flowerPos === 'top'` branch is unreachable.** The constructor only ever sets `'left'` or `'right'` when `hasFlower` is true; the default `'top'` remains only when `hasFlower === false`, so the `fx,fy` initialisers for `top` are dead defaults.
- **`Tree.padding` recovery in `CityEntity.draw`** assumes symmetric padding and recomputes it from `(cacheCanvas.width - this.width) / 2`. This works only because `initCache` always uses the same padding on both axes. Fragile: any future asymmetric-padding subclass breaks the offset math.
- **`Building.draw` ignores the `Renderable.draw` padding contract** entirely — it doesn't go through `CityEntity.draw`. So if `Renderable` ever requires uniform offset handling, buildings need to be migrated.
- **Tree height is caller-supplied (`height` parameter).** Width is type-fixed and ignores the height. No aspect-ratio guard — a `height=10` sequoia would have layers of `1.5px` tall, mostly invisible.
- **`Math.random()` everywhere, no seed.** Same world recreated twice differs. If determinism (replay, screenshot tests, save/load) is ever a requirement, all four files need refactoring.
- **`ctx.roundRect`** in `drawHedge` requires modern Canvas2D (Chrome 99+, Safari 16+). No fallback.
- **Sequoia layer width can reach 120% of `this.width`** (`0.3 + 1.0*0.9 = 1.2`). Without padding (`Tree` constructor only pads oak), the bottom layer clips outside the cache canvas. Visible-but-clipped behaviour, not a crash.
- **Roof height fixed at 30px** even for tiny buildings — a `height=20` building gets a roof 1.5x its body height. Aesthetic risk only.

## Suggested wiki pages

- [[engine/CityEntity]] — abstract base, padding/cache template-method protocol.
- [[engine/Building]] — material/roof matrix, window grid algorithm, lit/unlit coin flip.
- [[engine/Tree]] — six variants catalogue (sequoia/pine/oak/bush/hedge/cactus), foliage palette.
- [[engine/TextureGenerator]] — brick + wood pattern generators, no-cache design.
- [[engine/Renderable]] — the cross-cutting contract; document `draw(ctx, offsetX)` + `isVisible`.
- [[patterns/template-method-drawToCache]] — `initCache` + abstract `drawToCache` as a baked-once render protocol.
- [[patterns/baked-canvas-caching]] — per-instance offscreen canvas as the only caching layer; gaps (no memoisation, no LRU).
- [[concepts/dualism-urban-vs-natural]] — building/tree pairing as the core city/landscape duality.
- [[concepts/deterministic-vs-stochastic-decoration]] — geometry deterministic, decoration random, no seed.
- [[risks/inheritance-asymmetry-building-vs-tree]] — Building bypasses CityEntity; refactor candidate.
- [[risks/no-texture-memoisation]] — allocation pressure under dense scenes.
