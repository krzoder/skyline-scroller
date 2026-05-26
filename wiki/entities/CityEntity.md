---
name: CityEntity
description: Abstract base providing offscreen-cache + padding template-method for renderables.
type: entity
source: src/procgen/entities/CityEntity.ts
loc: 48
---

# CityEntity

## Role

Abstract base for [[entities/Renderable]] objects that want a pre-baked offscreen canvas. Implements `initCache(padding)` as a template method that allocates the cache at `(width + 2·padding) × (height + 2·padding)`, translates the context by `padding`, and calls the subclass `drawToCache(ctx)`. `draw(ctx, offsetX)` blits the cache, reverse-engineering padding from `cacheCanvas.width - this.width`.

## Public surface

- `abstract class CityEntity` implements [[entities/Renderable]]
  - `public x, y, width, height` (mutable).
  - `protected cacheCanvas: HTMLCanvasElement`.
  - `constructor(x, width, height)` — sets `y = 0` and a placeholder canvas.
  - `protected initCache(padding = 0): void` — allocates cache, translates by padding, dispatches to `drawToCache`.
  - `protected abstract drawToCache(ctx: CanvasRenderingContext2D): void`.
  - `draw(ctx, offsetX)` — blits at `(x - offsetX - padding, y - height - padding)`.
  - `isVisible(viewX, viewWidth)` — AABB-on-X bounds test.

## Internal state

- `cacheCanvas` — per-instance offscreen canvas; sole persistent state. No global or static caches.

## Dependencies

- Imports: [[entities/Renderable]] (type only).
- Extended by: [[entities/Tree]], [[entities/Landscape]].
- **Not** extended by [[entities/Building]] despite identical shape (see Building's defects).

## Invariants

- Subclasses must call `super(x, width, height)` then `initCache(padding)` after setting any subclass state needed by `drawToCache`.
- `cacheCanvas.width === width + 2·padding` and `cacheCanvas.height === height + 2·padding` — symmetric padding is assumed by `draw`'s padding recovery.
- `y` defaults to `0` and is mutated later by chunk placement code.

## Control flow / lifecycle

1. Subclass constructor calls `super(x, width, height)` — placeholder cache assigned.
2. Subclass calls `initCache(padding)` — real cache allocated, context translated, `drawToCache` invoked (virtual dispatch lands on subclass).
3. Per frame: caller invokes `draw(ctx, offsetX)`; the cache is blitted in a single `drawImage` call. No re-rasterisation.

## See also

- [[systems/entity-rendering]] — baked-canvas caching protocol.
- [[entities/Renderable]] — interface contract.
- [[entities/Tree]], [[entities/Landscape]], [[entities/Building]].
