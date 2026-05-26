---
name: Landscape
description: Biome-shaped silhouette (hill, dune, peaks, skyline) on layers 0 and 1.
type: entity
source: src/procgen/entities/Landscape.ts
loc: 144
---

# Landscape

## Role

A biome-shaped silhouette polygon, baked into an offscreen canvas via [[entities/CityEntity]]'s template-method, then blitted plus a 2000 px-tall downward flood to hide gaps under lifted background layers. Only ever instantiated for layer indices `≤ 1` by [[entities/CityGenerator]].

## Public surface

- `class Landscape extends CityEntity`
  - `public biome: BiomeType`
  - `public points: { x, y }[]` — polyline silhouette in local coords (y is negative-up).
  - `constructor(x, width, height, biome: BiomeType)`
  - `draw(ctx, offsetX): void` — **overrides** `CityEntity.draw`: calls `super.draw` then paints a 2000 px downward flood.
- Private: `generateShape()`, `drawToCache(ctx)`, `decorate(ctx, baselineY)`, `getColor()`, `getDecorColor()`.

## Internal state

- `biome` — drives silhouette shape, fill colour, and decoration palette.
- `points[]` — precomputed at construction.
- `cacheCanvas` — inherited; padded by 50 px to fit tree-prop decorations overflowing the peak.

## Confirmed defects

- **`Math.random()` in `generateShape` and `decorate`** — bypasses the seeded [[entities/Random]] used everywhere else. Two replays with the same seed produce different hill silhouettes and decoration placement. City biome's skyline step heights are likewise `Math.random()`-driven. See [[decisions/DEC-01-unified-rng]].
- **Double-paint**: every frame, `draw` blits the cached silhouette **and** floods `fillRect(screenX - 1, this.y, this.width + 2, 2000)` downward in the biome colour. Acknowledged in comments as a fix for "floating artifacts" under `yOffset` lift. Huge overdraw, but cheap. Risk: if silhouette ever gains gradient/texture, the flat flood will mismatch.
- **Tundra decoration mismatch**: tundra has 4 peak points but `decorate` uses single-peak triangle interpolation (`peakRatio = 0.5`, or `0.4` for desert) — props don't sit on the curve. Author comment confirms PoC compromise.

## Dependencies

- Imports: [[entities/CityEntity]] (extends), `BiomeType` from [[entities/BiomeSystem]].
- Imported by: [[entities/CityGenerator]] (constructs for `layerIndex ≤ 1`).

## Invariants

- `points[0].x === 0` and `points[last].x === width` — polyline spans full local width.
- Cache padding = 50 px symmetric (for tree-tops above the silhouette).
- Local `y` is negative-up; render baseline is `y` and peaks render upward.

## See also

- [[systems/entity-rendering]] — cached silhouette pattern.
- [[systems/parallax-layers]] — why lifted layers need the downward flood.
- [[decisions/DEC-01-unified-rng]] — the `Math.random()` leaks ticket.
- [[concepts/determinism]].
- [[entities/CityEntity]], [[entities/CityGenerator]], [[entities/BiomeSystem]].
