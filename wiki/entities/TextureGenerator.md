---
name: TextureGenerator
description: Stateless static factory for brick and wood pattern canvases consumed only by Building.
type: entity
source: src/procgen/entities/TextureGenerator.ts
loc: 45
---

# TextureGenerator

## Role

Static-only utility class that returns fresh `<canvas>` elements containing brick or wood patterns. Used exclusively by [[entities/Building]]; trees draw materials inline with flat fills.

## Public surface

- `class TextureGenerator`
  - `static createBrickPattern(w, h, color): HTMLCanvasElement` — solid fill + offset rows of `20×10` dark rectangles (every other row offset by 10 px).
  - `static createWoodPattern(w, h, color): HTMLCanvasElement` — solid fill + horizontal bezier "grain" strokes every 4 px, jittered.

## Internal state

- None. Stateless. No memoisation. Every call allocates a new canvas.

## Confirmed defects

- **No texture cache** — N buildings of identical size/material/colour allocate N intermediate canvases. Allocation pressure in dense scrolling scenes.
- **`Math.random()` for wood-grain jitter** — non-seeded. Breaks deterministic replay; see [[decisions/DEC-01-unified-rng]].
- Intermediate canvases are immediately drawn into a `Building.cacheCanvas` and discarded — short-lived but GC-heavy.

## Dependencies

- Imports: none.
- Imported by: [[entities/Building]] only. `stone` and `plaster` materials skip the generator (inline fills + small noise).

## Invariants

- Output canvas dimensions equal the requested `w × h`.
- Brick row spacing is `10 px`, brick offset alternates by `10 px`.
- Wood grain spacing is `4 px`; stroke count = `height / 4`.

## See also

- [[systems/entity-rendering]] — texture vs flat-fill dualism.
- [[decisions/DEC-01-unified-rng]] — wood-grain `Math.random()` leak.
- [[entities/Building]].
