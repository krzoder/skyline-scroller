---
name: Tree
description: Six-variant CityEntity drawn from primitive shapes; cactus optionally flowered.
type: entity
source: src/procgen/entities/Tree.ts
loc: 160
---

# Tree

## Role

The natural counterpart to [[entities/Building]] on layers 2 and 3. Six species (`sequoia`, `pine`, `oak`, `bush`, `hedge`, `cactus`) drawn from canvas primitives (ellipses, polygons, arcs) into a padded offscreen cache. Cactus optionally renders a pink `#E91E63` flower.

## Public surface

- `type TreeType = 'sequoia' | 'pine' | 'oak' | 'bush' | 'hedge' | 'cactus'`
- `class Tree extends CityEntity`
  - `constructor(x, type: TreeType, height: number, flowerChance = 0)`
  - `public type, hasFlower: boolean, flowerPos: 'left' | 'right' | 'top'`
  - Inherits `draw`, `isVisible`, `cacheCanvas` from [[entities/CityEntity]].
- Private: `drawToCache(ctx)` dispatching to `drawSequoia`, `drawPine`, `drawOak`, `drawBush`, `drawHedge`, `drawCactus`.

## Internal state

- `type` — chosen by [[entities/CityGenerator]] via `pickTreeType` (uniform random among enabled species for the current biome).
- `width` — fixed per type (sequoia 70, pine 60, oak 90 + 30 px padding, bush 40, cactus 40, hedge 60).
- `hasFlower`, `flowerPos` — decided once at construction. `flowerPos` defaults to `'top'` but is only ever assigned `'left'` or `'right'`.

## Confirmed defects

- **Cactus flower side bug**: `flowerPos === 'top'` is **unreachable**. The constructor only assigns `'left'` or `'right'` when `hasFlower` is true; the default `'top'` survives only when `hasFlower === false`, so the `top`-branch initialisers in `drawCactus` are dead code.
- **`Math.random()` for flower roll** (non-seeded) — breaks deterministic replay from `seed`. See [[decisions/DEC-01-unified-rng]].
- `drawSequoia` bottom layer width reaches `0.3 + 1.0·0.9 = 1.2` of `this.width`; without per-type padding (only oak pads), the bottom layer clips outside the cache canvas.
- Tree height is caller-supplied with no aspect-ratio guard — a `height=10` sequoia produces 1.5 px layers.
- `drawHedge` uses `ctx.roundRect` (Chrome 99+, Safari 16+) with no fallback.
- `padding` recovery in `CityEntity.draw` assumes symmetric padding (computed from `width` only). Asymmetric subclasses would break the blit offset.

## Dependencies

- Imports: [[entities/CityEntity]] (extends), and transitively [[entities/Renderable]].
- Imported by: [[entities/CityGenerator]] (constructs when building roll fails and tree roll succeeds), [[entities/TreeConfig]] (re-uses `TreeType`), [[entities/Layer]] (stored in `objects[]`).

## Invariants

- `hasFlower === true` implies `type === 'cactus'` **and** `flowerPos in {'left', 'right'}`.
- Cache canvas is square-padded: `cacheCanvas.width - width === cacheCanvas.height - height === 2·padding`.
- Only `oak` requests non-zero padding (30 px); all others assume content fits within `width × height`.
- `drawToCache` is invoked once via the inherited `initCache(padding)` template-method.

## See also

- [[systems/entity-rendering]] — template-method `initCache` + `drawToCache`.
- [[decisions/DEC-01-unified-rng]] — flower-roll `Math.random()` leak.
- [[concepts/determinism]].
- [[entities/CityEntity]], [[entities/CityGenerator]], [[entities/TreeConfig]], [[entities/Building]].
