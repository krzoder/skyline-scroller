---
name: Chunked World
description: Infinite scroll implemented by appending chunks ahead of the camera and pruning behind — per-layer chunks, no shared world coordinate, bounded memory.
type: concept
---

# Chunked World

## Definition

The world is infinite in the camera-forward direction but materialised lazily. Each parallax layer maintains its own ordered chunk stream — entities are appended at a per-layer high-water mark `lastX[i]` when the camera approaches the generation horizon, and pruned from the head when they drift behind the prune horizon. There is **no shared world coordinate system across layers**: layer `i`'s `lastX` is in layer-`i` space (i.e. `cameraX * speedModifier_i`), and an object at `x=1000` in layer 0 corresponds to a totally different on-screen position than the same `x` in layer 3.

## Where it lives

| Element | Anchor |
|---|---|
| Per-layer high-water mark | `src/procgen/CityGenerator.ts:18` (`lastX: number[]`) |
| Generation horizon | `src/procgen/CityGenerator.ts:45-58` (`while (lastX[i] < cameraX*spd + viewportWidth + 500)`) |
| Chunk append | `CityGenerator.addChunk` (lines 68-180+) |
| Prune horizon | `src/engine/Layer.ts:22-36` (`obj.x + obj.width > layerViewX - 2000`) |
| Chunk-width budgets | landscape 200–500, building 60–120+20·layerIndex, tree `w+10..30`, gap 20–100, water ≥100 |
| Hairline-seam fix | `CityGenerator` appends with `lastX[i] += chunkWidth - 1` (1 px overlap) |

## Why it matters

- **Bounded memory** in an unbounded scene. Without prune, `Layer.objects[]` would grow without bound; with it, the active set is roughly `(generation_horizon + prune_horizon) / avg_chunk_width` ≈ a few hundred entities per layer.
- **Bounded per-frame draw cost**. With [[concepts/entity-caching]] making each entity a single `drawImage`, the per-frame budget is "active entities × 1 blit" — independent of how far the camera has travelled.
- **`cameraX` is the only authoritative cursor.** `lastX[i]` is derived (`= cameraX * speedModifier`), so the chunk system rides on top of [[concepts/parallax-math]] without any extra state.
- **No need for a world map.** There is no `Map<chunkId, ChunkData>`, no save format, no "go back". The world is a forward-only stream.

## Counter-examples

- **Sky clouds are NOT chunked.** `SkySystem.clouds[]` is a fixed-size pool of ~20 clouds (`SkySystem.ts:49`) populated across the *screen*, not the *world*. When a cloud exits right, it's spliced and a replacement is created on the left (`SkySystem.update` 166-182). So the sky is a separate world model — see [[concepts/control-flow]] §SM3.
- **Going back is impossible.** `cameraX` is monotone non-decreasing; pruned chunks are unrecoverable. The seed re-entry path (`setSeed → reset`) restarts at `cameraX = 0`, which is *not* the same as scrolling backward.
- **No hard cap on `Layer.objects.length`.** Memory is bounded only by `prune` running every frame. If `cameraSpeed` were ever raised dramatically without resizing, the generation horizon (`viewportWidth + 500`) would expand and the active set could grow large.
- **Chunks overlap by 1 px** (`lastX[i] += chunkWidth - 1`) to avoid sub-pixel seams. This is a counter to the "chunks are disjoint" intuition.

## Chunk policy table

| Chunk type | Width range | Layer condition |
|---|---|---|
| Landscape | 200–500 | layers 0..1 (background) |
| Building | 60–120 + 20·layerIndex | layers 2..3 (mid/foreground) |
| Tree | `w + 10..30` (where w = tree visual width) | layers 2..3 |
| Gap | 20–100 | foreground only |
| Water (ground) | ≥ 100 | foreground only, suppresses object placement |
| Generation horizon | `cameraX * speedModifier + viewportWidth + 500` | per layer |
| Prune horizon | `layerViewX - 2000` | per layer |

## Invariants

1. `Layer.objects` is sorted by ascending `x` (chunks appended at `lastX[i]` which only grows).
2. `lastX[i]` is monotone non-decreasing per layer.
3. `cameraX` is monotone non-decreasing within a session.
4. Every active `Renderable` is owned by exactly one `Layer`. No cross-layer ownership — see [[concepts/parallax-math]] for why.
5. Each layer's "world" is independent — same `x` in different layers is not the same place.

## The generate loop

The single hot loop in `CityGenerator.generate` is:

```ts
for (let i = 0; i < layers.length; i++) {
  const speedModifier = layers[i].speedModifier;
  const layerViewX = cameraX * speedModifier;
  while (lastX[i] < layerViewX + viewportWidth + 500) {
    addChunk(i, layers[i], lastX[i]);  // appends an entity, increments lastX[i]
  }
}
```

Three things to notice:

1. The `+ 500` lookahead means chunks are generated **slightly off-screen to the right**, so they enter the visible area pre-baked. No pop-in.
2. `lastX[i] < limit` is the only termination — once `lastX[i]` catches up, no more chunks are appended that frame. A slow camera generates few chunks; a fast camera generates many.
3. `addChunk` advances `lastX[i]` by `chunkWidth - 1` (the 1 px overlap fix). So `lastX[i]` is *not* the position of the next chunk — it's `nextChunkX + 1`.

Then `Layer.prune(cameraX)` runs per layer:

```ts
this.objects = this.objects.filter(obj =>
  obj.x + obj.width > layerViewX - 2000
);
```

The 2000 px back-buffer is generous — it ensures entities scrolling off-left aren't pruned mid-frame. The `viewportWidth + 500` forward generation budget and the `2000` back-prune budget together set the active-set size.

## Why "infinite" but not "endless"

The world is infinite in the *forward* direction but **not endless in either direction simultaneously**. `cameraX` is monotone, so there is no "behind". Pruned chunks are gone for good. The seed `(setSeed → reset → cameraX = 0)` re-entry path restarts the stream at zero — which generates the **same** chunks again deterministically, modulo the [[concepts/determinism]] leaks.

This asymmetry is load-bearing: it means the engine never has to serialize or look up past chunks. The world is a forward-only token stream, and the camera is the read head.

## See also

- [[concepts/parallax-math]] — the per-layer view transform that makes per-layer `lastX` sensible
- [[concepts/procedural-budgets]] — width caps and density floors per chunk type
- [[concepts/entity-caching]] — what makes each chunk cheap per frame
- [[concepts/determinism]] — why re-entry at `cameraX = 0` yields the same chunks
- [[entities/CityGenerator]] — the generator that owns `lastX`
- [[entities/Layer]] — the prune side of the pipeline
- [[concepts/dualisms]] #25, #26 — visibility cull vs memory cull
