---
name: Single Canvas
description: One canvas, one 2D context — and the downstream consequences (no z-buffer, no shaders, manual lighting, render-order-as-depth).
type: concept
---

# Single Canvas

## Definition

There is exactly **one `<canvas>` element** and **one `CanvasRenderingContext2D`**. All depth, lighting, weather, and post-processing must be expressible as a sequence of 2D draw calls (plus composite operations and scratch off-screen canvases). No WebGL, no WebGPU, no second compositing pass — just `ctx`.

This is the most architecturally consequential constraint in the codebase. Every other concept page references it (it's a foundation node in [[concepts/control-flow]]'s concept graph).

## Where it lives

| Anchor | Notes |
|---|---|
| `src/engine/Game.ts:10, 35` | `this.ctx = canvas.getContext('2d')` — single allocation |
| `src/engine/Renderable.ts:6` | `draw(ctx: CanvasRenderingContext2D, offsetX: number): void` — the only signature |
| `src/engine/Game.ts:215` | `ctx.scale(scaleFactor=1.6, scaleFactor)` — global resolution multiplier |
| `src/engine/Game.ts:243-251` | `ctx.globalCompositeOperation = 'multiply'` — the entire lighting system |
| `src/engine/Game.ts:62-83, 254-258` | Noise dither pattern for banding |
| `src/engine/Layer.ts:53-59` | Per-layer `ctx.translate / ctx.scale` |
| `src/engine/CityEntity.ts`, `Building.ts`, `TextureGenerator.ts` | Off-screen 2D contexts — scratch space, not a parallel pipeline |

## Why it matters — the downstream design consequences

The single-canvas constraint is **not just a tech choice** — it dictates the shape of the rest of the engine. The downstream consequences:

### 1. No z-buffer → depth = array index

Render order in `Game.layers[]` is the only depth ordering. The layer with `speedModifier=0.2` *must* render first; `1.0` *must* render last. There's no `obj.z` to sort by. See [[concepts/parallax-math]]. The dualism [[concepts/dualisms]] D3 is exactly this: parallax math vs single-canvas.

### 2. No shaders → manual lighting

Ambient day/night tint is a single `ctx.globalCompositeOperation = 'multiply'` plus one full-screen `fillRect` in the ambient colour (`Game.ts:243-251`). That's the entire lighting system. Consequences:

- **Lighting is uniform across the scene.** Can't light individual windows, can't have a localised glow on a streetlamp, can't shadow one building.
- **Per-object translucency must be baked into the cache** ([[concepts/entity-caching]]). An object can't dynamically fade.
- **The ambient colour comes from [[entities/SkySystem]]** via `sky.getAmbientColor()`, which interpolates the same 17 keyframes used for the sky gradient. So sky-time → ambient tint is a single colour.

### 3. No alpha tricks → bake or skip

There is no compositing layer per object. If an entity wants partial transparency, it bakes it into its cache. There is no `globalAlpha` ramp per object that would survive [[concepts/entity-caching]].

### 4. Off-screen canvases are still 2D

`CityEntity.cacheCanvas`, `Building.generateTexture`, `Game.noisePattern`, and `TextureGenerator.create*` all use `document.createElement('canvas').getContext('2d')`. They are **scratch space**, not a parallel rendering pipeline. They share the limitations of the main context — no shaders there either.

### 5. Two coordinate spaces on the same canvas

`ctx.scale(scaleFactor=1.6, …)` at the top of `render` (`Game.ts:215`) is a one-time global resolution multiplier. Everything below works in *logical* pixels (1.6× smaller than physical). So there are really two coordinate spaces on the same canvas — logical (used by code) and physical (used by display). `canvas.width = clientWidth * 1.6`.

### 6. Per-layer sub-canvas via save/restore

`Layer.draw` does its own `ctx.translate(0, -yOffset)` and optional `ctx.scale(scale, scale)` (`Layer.ts:53-59`), so each layer is briefly a *sub-canvas* coordinate-wise. `Save/restore` brackets are load-bearing — drop one and everything cascades. See [[concepts/dualisms]] #89.

### 7. Noise dither for gradient banding

8-bit colour gradients (e.g. the sky) show visible Mach bands on real displays. Mitigation: a 256×256 noise pattern at `α=8/255` is tiled over the whole canvas after the multiply pass (`Game.ts:62-83, 254-258`). The dither is itself a counter to the "all pixels come from defined sources" rule — it's high-frequency random noise injected at the very end.

## The render-order pipeline

The single-canvas constraint forces a strict sequence:

```
ctx.save()
  ctx.scale(scaleFactor, scaleFactor)
  sky.draw                                  // sky gradient + sun/moon + clouds
  ctx.translate(0, groundY)
  layers.forEach(layer => layer.draw(ctx))  // background → foreground
  earth fillRect                            // hide sky below ground
  ctx.globalCompositeOperation = 'multiply'
  fillRect with sky.getAmbientColor()       // ambient tint
  ctx.globalCompositeOperation = 'source-over'
  fill with noisePattern                    // dither
ctx.restore()
```

Any reorder is a visible bug. The composite multiply must come *after* the layers (otherwise it tints only the sky). The dither must come *after* the multiply (otherwise the multiply scales the noise itself).

## Counter-examples

The single-canvas concept is rarely "broken" — but there are escape hatches:

- **`ctx.scale(scaleFactor)`** is the only deviation from "one logical coordinate space" — there are two, and the boundary is exactly one `ctx.scale` call.
- **Off-screen scratch canvases** (cache, texture, noise) are *additional* 2D contexts, but they all funnel back into the main context via `drawImage`. So the constraint holds at the output stage.
- **The DOM HUD** (`#ui-seed-val`, `#ui-time-val`, all the buttons and sliders) is *not* on the canvas — it's HTML overlay. [[concepts/side-effect-surface]] covers this boundary.

## Invariants

- Exactly one `CanvasRenderingContext2D` is held by the engine at any time.
- Render order is sky → layers → earth → ambient multiply → noise dither.
- Save/restore brackets balance: one outer for `scale(scaleFactor)`, one inner for the layer-translate, plus one per `Layer.draw`.
- Off-screen canvases never reach the screen except via `drawImage` into the main context.

## See also

- [[concepts/parallax-math]] — render order = depth (D3)
- [[concepts/entity-caching]] — why lighting must be a global pass (D5)
- [[concepts/side-effect-surface]] — engine vs DOM split
- [[concepts/control-flow]] — render pipeline order
- [[entities/Game]] — `render()` is the canonical render-order site
- [[entities/SkySystem]] — `getAmbientColor()` feeds the multiply pass
