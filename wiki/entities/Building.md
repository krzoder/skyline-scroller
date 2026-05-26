---
name: Building
description: Pre-baked canvas of body + windows + roof; the urban feature on layers 2 and 3.
type: entity
source: src/procgen/entities/Building.ts
loc: 114
---

# Building

## Role

A rectangular structure with a material body, a 6×10 px window grid, and a roof archetype on top. Bakes its entire visual into an offscreen canvas at construction; `draw(ctx, offsetX)` is a single `drawImage` blit. The urban counterpart to [[entities/Tree]] in the [[systems/procgen]] dualism.

## Public surface

- `type BuildingMaterial = 'wood' | 'brick' | 'stone' | 'plaster'`
- `type RoofType = 'flat' | 'gabled' | 'dome' | 'crenelated'`
- `class Building` implements [[entities/Renderable]]
  - `constructor(x, y, width, height, material, roofType, baseColor, roofColor)`
  - `public x, y, width, height, material, roofType, baseColor, roofColor`
  - `draw(ctx, offsetX)` — blits cache at `(x - offsetX, y - cacheCanvas.height)`.
  - `isVisible(_viewX, _viewWidth): boolean` — **always returns `true`**.
- Private: `generateTexture()`, `cacheCanvas`.

## Internal state

- `cacheCanvas` — private offscreen canvas of size `width × (height + 30)`. The `30` is the hardcoded `roofHeight`.
- No texture memoisation. Each construction allocates a fresh cache and (for `brick`/`wood`) an additional intermediate canvas from [[entities/TextureGenerator]] that's immediately copied and discarded.

## Confirmed defects

- **Does not extend [[entities/CityEntity]]** despite re-declaring the same `x, y, width, height, cacheCanvas` fields. The inheritance tree is asymmetric: `Tree` extends `CityEntity`, `Building` doesn't. Looks like `CityEntity` was extracted from `Tree` and never retrofitted. Refactor candidate.
- **No culling**: `isVisible()` always returns `true`. If anything relied on it to skip off-screen draws, every building would render every frame regardless of viewport. Culling is currently punted to `Layer.draw`'s inline bounds check.
- **`Math.random()` for window colour** (warm `#FDF5E6` vs sky-blue `#87CEEB`) and the 0.2 "missing window" gate — non-seeded, breaks reproducibility from `seed`. A single coin flip per building decides the colour for *all* its windows.
- Narrow buildings (`width ≤ 20`) render zero windows (`for wx < width - 10` with first window at `x=10`).
- Hardcoded `roofHeight = 30` — a `height=20` building gets a roof 1.5× its body.
- Bypasses any future `Renderable` padding contract (doesn't go through `CityEntity.draw`).

## Dependencies

- Imports: [[entities/Renderable]] (type), [[entities/TextureGenerator]].
- Imported by: [[entities/CityGenerator]] (constructs on layers 2/3 when `rng < dna.density`), [[entities/Layer]] (stored in `objects[]`).

## Invariants

- `y = 0` immediately after construction; mutated later by the chunk placer.
- `cacheCanvas.height === height + 30`.
- Window grid: `winW=6`, `winH=10`, `gapX=10`, `gapY=20`; 10 px margin left/right, 20 px top/bottom.
- All windows in a single building share the same lit/unlit state.

## See also

- [[systems/entity-rendering]] — Renderable contract, baked-canvas caching.
- [[decisions/DEC-01-unified-rng]] — `Math.random()` leak ticket.
- [[concepts/determinism]].
- [[entities/CityEntity]], [[entities/Tree]], [[entities/TextureGenerator]], [[entities/Renderable]].
