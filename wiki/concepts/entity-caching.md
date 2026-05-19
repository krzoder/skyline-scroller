---
name: Entity Caching
description: Per-instance offscreen canvases — draw-once, blit-many — with no LRU and no de-duplication, plus the missed memoisation opportunity that the design implies.
type: concept
---

# Entity Caching

## Definition

Every drawable entity bakes its pixels **once** into a per-instance offscreen `HTMLCanvasElement` at construction. Per-frame draw is a single `ctx.drawImage(cacheCanvas, …)`. The cache key is implicitly the entity instance — there is **no LRU, no de-duplication, no shared atlas**. Two identical oaks own two separate canvases.

## Where it lives

| Anchor | Notes |
|---|---|
| `src/engine/CityEntity.ts:8` | `cacheCanvas: HTMLCanvasElement` field |
| `src/engine/CityEntity.ts:18-30` | `initCache(padding)` allocates the canvas, calls abstract `drawToCache(ctx)` |
| `src/engine/Building.ts:18, 30, 33` | `Building.generateTexture` does the same pattern *without* inheriting (parallel implementation) |
| `src/engine/Tree.ts` | Each `Tree.draw*` method (`drawOak`, `drawCactus`, `drawPine`, etc.) is called once during cache bake |
| `src/engine/Landscape.ts:172-173` | **Counter-example** — Landscape blits cache *and* fillRects a 2000-px skirt per frame |
| `src/engine/Ground.ts` | **Counter-example** — does not cache; draws cheap `fillRect` directly per frame |
| `src/engine/TextureGenerator.ts` | Static methods that build texture canvases used by `Building.generateTexture` |

## Why it matters

- **Per-frame cost is `O(active entities × 1 blit)`**, independent of how complex the entity's procedural draw was. A 30-stroke building with windows + bricks + roof is the same per-frame cost as a 4-line oak.
- **Procedural draws are expensive** — gradients, bezier paths, loops over windows, parity-checked bricks. Doing those every frame would be unaffordable. Caching is the only thing that makes [[concepts/chunking]] viable.
- The constraint **shapes how lighting works.** Entities are baked at noon-equivalent colors. Day/night tint must be applied *after* blit via the global multiply pass ([[concepts/single-canvas]] §C9). Windows can't actually light up at night without re-rasterising — and they don't.

## Counter-examples

### Cache asymmetry (broken pair)

**`CityEntity.initCache` calls `ctx.translate(padding, padding)` without `save`/`restore`** (`CityEntity.ts:18-30`). Every other render path matches `ctx.save()` with `ctx.restore()` — this one doesn't because the offscreen canvas is discarded after one use. See [[concepts/dualisms]] #90.

### Hybrid (cache + per-frame)

**`Landscape.draw`** blits the cached hill silhouette *and* fillRects an extra `(screenX-1, y, w+2, 2000)` per frame to extend the hill colour below screen (`Landscape.ts:172-173`). A controlled break of the "all pixels come from the cache" rule — the cache is for shape, the per-frame fill is for "extend below viewport indefinitely". See [[concepts/dualisms]] D9.

### Not cached at all

- **`Ground`** draws cheap `fillRect` strips per frame. Caching a single coloured rectangle would not pay off.
- **`SkySystem.draw`** — gradient + clouds + sun/moon are redrawn every frame. Sky-time changes continuously, so a cache would be invalidated every tick.

### Missed memoisation

Two identical oaks own two separate canvases. A weak-keyed cache (`shapeKey → canvas`) on tree species + height bucket + biome could deduplicate many entities, but the code does not do this. The cost trade is:

- Current: every entity has its own canvas. Memory grows linearly with active entities. Blit is fast.
- Hypothetical: shared canvases for "same-shape" entities. Memory bounded, but `pickTreeType / pickMaterial / pickColor` would need to produce a stable hash, and the shape-key would have to absorb every input that affects pixels (including `Math.random()` calls in `Building.generateTexture` — see [[concepts/determinism]]).

The current design accepts memory waste in exchange for not having to define what "same shape" means under stochastic decoration.

## Constraints

- Cache captures the entity at its **construction parameters only**. There is no re-bake. Mutating any property after construction has no visible effect.
- The cache canvas is owned by the entity for its full lifetime. When the entity is pruned ([[concepts/chunking]]), the canvas becomes eligible for GC.
- `padding` in `initCache(padding)` is per-subclass — used for entities whose draws can overflow their bounding box (e.g. building roof spikes, tree foliage that overhangs the trunk).

## Invariants

- Every `CityEntity` subclass invokes `initCache(padding)` **exactly once** at construction.
- `cacheCanvas` is never re-baked.
- The cached pixels are exactly what `drawToCache(ctx)` painted; per-frame draw cannot add detail.
- `Ground` never caches; `Building` and all `CityEntity` subclasses always cache.

## The cache lifecycle (per entity)

```
construct entity
  ├─ compute shape parameters (position, size, biome-derived colours)
  ├─ allocate cacheCanvas via document.createElement('canvas')
  ├─ size cacheCanvas to bounding box + padding
  ├─ get 2D context on cacheCanvas
  ├─ ctx.translate(padding, padding)              // no save/restore (#90)
  ├─ drawToCache(ctx)                              // expensive procedural draw
  └─ retain cacheCanvas as field

each frame:
  ├─ Layer.draw computes screenX = obj.x - layerViewX
  ├─ if on-screen: ctx.drawImage(cacheCanvas, screenX, y)
  └─ done (no per-entity update needed)

eventually:
  ├─ Layer.prune drops obj from objects[]
  ├─ obj.cacheCanvas becomes unreachable
  └─ GC reclaims pixel memory
```

## Trade-off summary

| Property | Current design | Alternative |
|---|---|---|
| Per-entity memory | One canvas (e.g. 80×100 px × 4 bytes = ~30 KB) | Shared atlas would amortise |
| Per-frame cost | 1 `drawImage` | Same with atlas; less with sprite batching |
| Reproducibility | Macro yes, micro no (`Math.random` in bake) | Could be fully reproducible with a forked RNG ([[decisions/DEC-01-unified-rng]]) |
| Mutability | Frozen at construction | Could re-bake on demand but no use case |
| GC pressure | Linear with pruned entities | Atlas would have constant memory |

## See also

- [[concepts/single-canvas]] — why ambient lighting must be a global multiply pass (D5)
- [[concepts/chunking]] — what the cache enables at the per-frame level
- [[concepts/determinism]] — `Math.random()` inside `generateTexture` means the cache is non-reproducible
- [[entities/CityEntity]] — the base class
- [[entities/Building]] — the parallel cache implementation
- [[entities/Landscape]] — the hybrid cache + per-frame draw
- [[concepts/dualisms]] #46, #47, #90 — computed/cached, inline/cached, save/restore broken pair
