---
name: Layer
description: Parallax container — holds Renderables and draws them with a layer-local virtual camera.
type: entity
source: src/engine/Layer.ts
loc: 75
---

# Layer

## Role

A parallax container. Holds a flat array of [[entities/Renderable]] objects and draws them after translating by `-yOffset` and (optionally) scaling. Each layer has its own world-X space; its virtual camera is `cameraX * speedModifier`. There are 4 layers configured in `Game.reset()`: L0 `(0.2, 0, 190, 1.3)`, L1 `(0.4, 1, 100)`, L2 `(0.6, 2, 50)`, L3 `(1.0, 3, 0)`.

## Public surface

- `class Layer` — **does not** implement `Renderable`; its `draw` signature takes `cameraX`, not `offsetX`.
  - `public objects: Renderable[]`
  - `public speedModifier: number` — parallax factor `0.2 .. 1.0`.
  - `public zIndex: number` — `0 = furthest, 3 = nearest`.
  - `public yOffset: number` — pixels to shift UP via `translate(0, -yOffset)`.
  - `public scale: number` — default `1.0`; only L0 uses `1.3`.
  - `constructor(speedModifier, zIndex, yOffset = 0, scale = 1.0)`
  - `add(obj: Renderable): void`
  - `prune(cameraX, buffer = 2000): void` — drops objects whose right edge is more than `buffer` px behind `layerViewX`.
  - `draw(ctx, cameraX, screenWidth, _screenHeight): void`

## Internal state

- `objects[]` — flat, unsorted, mixed (`Ground`, `Building`, `Tree`, `Landscape`). No spatial index; insertion order ≈ X-ascending because [[entities/CityGenerator]] walks `lastX[i]` strictly forward.
- All other fields immutable after construction.

## Confirmed defects

- `zIndex` is stored but not consumed inside `Layer`. Draw-order responsibility lives in `Game.render` — no enforcement that draw order matches `zIndex`.
- `Layer.draw` uses `ctx.save()` / `ctx.restore()` for transform but does not reset `globalAlpha`, `globalCompositeOperation`, etc. — children mutating these without restoring leak state across layers.
- Visibility test mixes pre-scale local-space `screenX = obj.x - layerViewX` with scaled bounds (`screenX * scale < screenWidth`, `(screenX + obj.width) * scale > 0`). Math is correct only because scale > 0 and the scaled origin is at `(0, 0)`.

## Dependencies

- Imports: [[entities/Renderable]] (type only).
- Imported by: [[entities/Game]] (constructs the 4-layer stack in `reset()`), [[entities/CityGenerator]] (consumes via `generate(layers, ...)`).

## Control flow / lifecycle

```
layerViewX = cameraX * speedModifier
ctx.save()
ctx.translate(0, -yOffset)
if (scale !== 1) ctx.scale(scale, scale)
for obj in objects:
   screenX = obj.x - layerViewX
   if visible: obj.draw(ctx, layerViewX)
ctx.restore()
```

## Invariants

- `objects` is monotonically appended (via `add`) and filtered (via `prune`).
- All current `speedModifier` values are in `(0, 1]` (no counter-parallax).
- Per-layer `lastX[i]` (held by [[entities/CityGenerator]]) advances by `chunkWidth - 1`, so chunk content overlaps by 1 px.

## See also

- [[systems/parallax-layers]] — parallax math + lift/scale asymmetry.
- [[systems/procgen]] — how chunks land in layers.
- [[concepts/determinism]].
- [[entities/Game]], [[entities/CityGenerator]], [[entities/Renderable]].
