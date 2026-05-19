---
name: Ground
description: Flat coloured strip — one per chunk per layer; the only always-present chunk component.
type: entity
source: src/engine/Ground.ts
loc: 55
---

# Ground

## Role

A flat, textured horizontal strip painted live every frame (no cache). The only chunk component that's always present — every chunk on every layer carries exactly one `Ground` and zero or one feature ([[entities/Building]], [[entities/Tree]], [[entities/Landscape]]). Implements [[entities/Renderable]] directly (does not extend [[entities/CityEntity]]).

## Public surface

- `type GroundType = 'grass' | 'pavement' | 'water' | 'dirt'`
- `class Ground` implements [[entities/Renderable]]
  - `public x, y = 0, width, height = 100, type: GroundType`
  - `constructor(x, width, type: GroundType)`
  - `draw(ctx, offsetX): void`
  - `isVisible(_viewX, _viewWidth): boolean` — **always returns `true`**.

## Internal state

- Stateless beyond constructor inputs.
- `y = 0` (layer-local baseline), `height = 100` (arbitrary depth below screen).

## Dependencies

- Imports: [[entities/Renderable]] (type only).
- Imported by: [[entities/CityGenerator]] (one per chunk, every layer).

## Invariants

- `y === 0` always.
- `height === 100` always.
- Water draws at `y + 5` to `y + 100` (5 px recess at top) — if `yOffset` doesn't account for it, the seam reveals sky colour.
- Foreground (`layer 3`) ground type is biome-blind — pure RNG mix (60 % pavement / 20 % grass / 20 % water); backgrounds map by biome (`desert → dirt`, `forest → grass`, `city → pavement`, else `dirt`).
- `isVisible` is a no-op; culling is punted to [[entities/Layer]]'s inline bounds check.

## See also

- [[systems/procgen]] — chunk layout (ground + optional feature).
- [[systems/entity-rendering]] — live-paint vs cached dualism.
- [[entities/Layer]], [[entities/CityGenerator]], [[entities/Renderable]].
