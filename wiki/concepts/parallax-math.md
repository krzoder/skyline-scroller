---
name: Parallax Math
description: Four-layer depth illusion via per-layer speed multipliers, with the layerViewX equation as the single source of truth.
type: concept
---

# Parallax Math

## Definition

Depth on a 2D canvas is faked by maintaining **four layers**, each with its own `speedModifier ∈ [0, 1]`. When the camera advances by `Δx` in real coordinates, layer `i` shifts by `Δx * speedModifier_i`. Lower `speedModifier` = farther back = slower apparent motion. The render order in `Game.layers[]` is the **only depth ordering** — there is no z-buffer (see [[concepts/single-canvas]]).

The core equation, in `Layer.draw`:

```ts
const layerViewX = cameraX * this.speedModifier;
const screenX    = obj.x - layerViewX;
```

Every object's screen position is its world `x` minus the layer's view. There is no other depth transform.

## Where it lives

| Element | Anchor |
|---|---|
| `Layer.speedModifier` | `src/engine/Layer.ts:5, 31, 39` |
| `Layer.yOffset / scale` | `src/engine/Layer.ts:7-8` |
| Four-layer config | `src/engine/Game.ts:110-115` |
| Per-layer chunk space | `src/procgen/CityGenerator.ts:18` (`lastX[i]` in layer-`i` space) |
| Render order = depth | `Game.render` iterates `this.layers` in array order |

## The 4-layer config table

From `Game.reset()`:

| Layer index | `speedModifier` | `yOffset` (px) | `scale` | Role |
|---|---|---|---|---|
| 0 | 0.2 | 190 | 1.3 | Deep background — distant hills, mountain silhouettes |
| 1 | 0.4 | 100 | 1.0 | Mid background — closer hills |
| 2 | 0.6 | 50 | 1.0 | Mid foreground — small buildings, trees |
| 3 | 1.0 | 0 | 1.0 | Foreground — full-speed, biome-blind ground (pavement/grass/water) |

Notes:

- `yOffset` is **hand-tuned per layer**, not derived from a perspective formula. Pure aesthetic.
- The background layer is **bigger** (`scale=1.3`), opposite to standard "far things look smaller" perspective. Deliberate — makes distant hills look mountainous, even though it inverts the usual intuition.
- Foreground (`layerIndex === 3`) **ignores the biome** for ground type, picking random `pavement/grass/water`. A foreground river can appear in any biome. See [[concepts/dualisms]] #23.

## Why it matters

- **Each layer has its own world.** `lastX[i]` is in layer-`i` space, so the same world `x` in two layers corresponds to two different on-screen positions. You **cannot put one object into two layers** — its `x` would mean two different things.
- **Render order is meaning.** The layer with `speedModifier=0.2` *must* render first; `1.0` *must* render last. Reordering `Game.layers[]` is a visible bug.
- **Parallax is the only depth concept** the engine has. There is no separate "z" field on `Renderable`. Two objects in the same layer are coplanar regardless of `x`.
- **The chunked-world system rides on this.** [[concepts/chunking]] computes generation/prune horizons in *layer space* using `cameraX * speedModifier`. Without parallax, there'd be no need for per-layer `lastX`.

## Counter-examples

- **Background scale=1.3 inverts perspective.** Standard parallax: far = smaller. Here: far = bigger. Aesthetic, not physical.
- **`yOffset` is data, not formula.** Each layer's vertical anchor is hand-set. There is no "horizon at y=H/2, layer-i at y = H/2 + k·i" rule.
- **Sky is not a layer.** [[entities/SkySystem]] renders before any layer, on its own coordinate system. It doesn't use `speedModifier` at all (clouds drift via their own wind).
- **The foreground layer is biome-blind for ground.** Layers 0-2 derive ground from biome; layer 3 picks random `pavement/grass/water`. So a desert can have a foreground river.

## Invariants

- `Layer.objects[]` is sorted by ascending `x` per layer.
- `speedModifier_0 < speedModifier_1 < speedModifier_2 < speedModifier_3` (monotone). Currently `0.2, 0.4, 0.6, 1.0`.
- Every active `Renderable` belongs to exactly one `Layer` (no cross-layer aliasing — see "Each layer has its own world" above).
- Each layer's prune horizon (`layerViewX - 2000`) is in *that layer's* space, not world space.

## The `layerViewX` equation

The single source of truth for "where is this layer's camera":

```ts
const layerViewX = cameraX * this.speedModifier;
const screenX    = obj.x - layerViewX;
```

Concretely, at `cameraX = 5000` px (the camera has scrolled 5000 px right):

| Layer | `speedModifier` | `layerViewX` | An object at `obj.x = 5200` renders at `screenX = …` |
|---|---|---|---|
| 0 (background) | 0.2 | 1000 | 4200 (far off-screen right — not yet visible) |
| 1 | 0.4 | 2000 | 3200 |
| 2 | 0.6 | 3000 | 2200 |
| 3 (foreground) | 1.0 | 5000 | 200 (just to the right of camera origin) |

This is what "the same `obj.x` in different layers is not the same place" means concretely. The background's `obj.x = 5200` is 4200 px to the right of the screen origin (because the background has barely scrolled). The foreground's `obj.x = 5200` is 200 px right (because the foreground scrolls at full speed). Both are correct — each layer's `obj.x` lives in that layer's world coordinates.

## Why four layers, not more

Four is hand-tuned. There is no procedural reason for the count — `Game.reset()` literally constructs four `Layer` instances. The trade:

- **More layers** → smoother depth illusion, but more entities to draw per frame ([[concepts/chunking]] active-set grows with layer count) and more `lastX[]` bookkeeping.
- **Fewer layers** → cheaper, but the parallax stair-step becomes visible. Three layers shows a "card-stack" effect; two looks like a sticker on a background.

Four is the sweet spot for this codebase's chunk density and viewport size. Changing it would require re-tuning `yOffset` and `scale` for the new count.

## See also

- [[concepts/chunking]] — why per-layer `lastX` is sensible
- [[concepts/single-canvas]] — why render order is the only depth
- [[entities/Layer]] — the implementation
- [[entities/Game]] — the four-layer config
- [[concepts/dualisms]] #23, #24, #27, #106, #107 — fg/bg, near/far, world/screen, yOffset asymmetry, scale asymmetry
