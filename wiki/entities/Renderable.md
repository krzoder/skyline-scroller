---
name: Renderable
description: Cross-cutting interface contract for anything a Layer can draw.
type: entity
source: src/engine/Renderable.ts
loc: ~10
---

# Renderable

## Role

The thin interface implemented by every object a [[entities/Layer]] can hold. Defines geometry (`x, y, width, height`), a `draw(ctx, offsetX)` blit hook, and an `isVisible(viewX, viewWidth)` predicate. Implemented directly by [[entities/Building]] and [[entities/Ground]]; inherited via [[entities/CityEntity]] by [[entities/Tree]] and [[entities/Landscape]].

## Public surface

```ts
interface Renderable {
  x: number
  y: number
  width: number
  height: number
  draw(ctx: CanvasRenderingContext2D, offsetX: number): void
  isVisible(viewX: number, viewWidth: number): boolean
}
```

## Internal structure

- Pure type — no implementation. Each implementer manages its own state and cache (if any).

## Dependencies

- Imports: none.
- Imported by: [[entities/Layer]], [[entities/CityEntity]], [[entities/Building]], [[entities/Ground]], and transitively [[entities/Tree]], [[entities/Landscape]].

## Invariants

- `draw(ctx, offsetX)` must paint at `screenX = x - offsetX` (subclasses may apply per-cache padding adjustments).
- `isVisible(viewX, viewWidth)` is advisory; the canonical viewport test lives in `Layer.draw`. Several implementations return `true` unconditionally (`Building`, `Ground`).
- `width` and `height` are positive numbers; `x, y` may be world-local or layer-local depending on owner.

## Confirmed defects

- The contract is silent on padding — implementations differ ([[entities/CityEntity]] subclasses use symmetric padding via `cacheCanvas.width - this.width`; [[entities/Building]] doesn't). Migrating to a uniform offset rule would require touching every implementer.
- `isVisible` is unreliable as a culling signal — several implementations always return `true`. See defects on [[entities/Building]] and [[entities/Ground]].

## See also

- [[systems/entity-rendering]] — the rendering contract and cache patterns.
- [[systems/parallax-layers]] — how `offsetX` is the layer-virtual-camera position.
- [[entities/Layer]], [[entities/CityEntity]], [[entities/Building]], [[entities/Ground]], [[entities/Tree]], [[entities/Landscape]].
