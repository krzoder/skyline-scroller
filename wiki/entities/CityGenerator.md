---
name: CityGenerator
description: Procedural pipeline that fills parallax layers with grounds and features per camera advance.
type: entity
source: src/procgen/CityGenerator.ts
loc: 233
---

# CityGenerator

## Role

Owns the procedural generation pipeline. Per frame, `Game.update` calls `generate(layers, cameraX, viewportWidth)` which advances each layer's write cursor up to a lookahead horizon, emitting one chunk at a time. A chunk = one `Ground` strip plus zero or one feature (`Building` | `Tree` | `Landscape` | nothing). Owns a `BiomeSystem` and a `CityDNA` triplet (`density`, `greenery`, `buildingHeight`) drawn once at construction.

## Public surface

- `class CityGenerator`
  - `constructor(seed: number | string, layerCount: number, config?: TreeConfig)`
  - `public config: TreeConfig` — live, mutable; the custom-gen UI in [[main.ts]] reaches in and rewrites this field (see [[decisions/DEC-05-low-code-config]]).
  - `public generate(layers: Layer[], cameraX: number, viewportWidth: number): void`
  - `public forceBiome(b: BiomeType): void`
  - `public getCurrentBiome(): BiomeType`
- Private: `addChunk`, `pickTreeType`, `pickMaterial`, `pickRoof`, `pickColor`.
- Internal-only `interface CityDNA { density; greenery; buildingHeight }` — not exported.

## Internal state

- `rng: Random` — single Mulberry32 stream forked from constructor seed.
- `biomeSystem: BiomeSystem` — given the **same seed** as the generator (parallel cloned stream, not sub-stream).
- `dna: CityDNA` — `density ∈ [0.4, 0.9)`, `greenery ∈ [0.1, 0.8)`, `buildingHeight ∈ [0.8, 1.2)`. Drawn once.
- `lastX: number[]` — per-layer monotonic write cursor (length = `layerCount`).
- `config: TreeConfig` — deep-cloned via `JSON.parse(JSON.stringify(...))` from arg or `DEFAULT_TREE_CONFIG`.

## Confirmed defects

- **Dual RNG seed sharing**: `CityGenerator` and `BiomeSystem` are constructed with the same seed and each instantiates `new Random(seed)`. Mulberry32 is single-state, so both streams produce **identical sequences** from identical starts — they're cloned, not sub-streamed. The two streams happen to be consumed independently, but conceptually this violates the seed-forking pattern; see [[decisions/DEC-01-unified-rng]].
- `addChunk` is a single 110-line procedure (ground choice + feature choice + construction + water override + commit) with positionally entangled RNG draws. Reordering any branch reshuffles all downstream chunks.
- Water override drops the rolled feature **after** material/roof/colour/height rolls were consumed — safe for determinism today, but a "skip rolls on water" optimization would silently break replays.
- `pickTreeType` enumerates via `Object.keys(this.config)` — relies on insertion order; reordering `DEFAULT_TREE_CONFIG` breaks every existing seed.

## Dependencies

- Imports: [[entities/Building]], [[entities/Layer]], [[entities/Random]], [[entities/Tree]], [[entities/BiomeSystem]], [[entities/Ground]], [[entities/Landscape]], [[entities/TreeConfig]].
- Imported by: [[entities/Game]] (constructs in `reset()`, drives `generate()` in `update()`).

## Invariants

- `lastX[i]` is monotonically non-decreasing per layer.
- Every chunk emits exactly one `Ground` and zero or one feature.
- Water chunks never carry a feature; feature-width on water has a 100 px floor.
- Landscapes only on layers 0/1; buildings/trees only on layers 2/3.
- Chunks overlap by 1 px (`lastX[i] += chunkWidth - 1`) to hide ground seams.
- Same seed + same config + same call pattern ⇒ byte-identical output (modulo the [[entities/Landscape]] `Math.random()` leak).

## See also

- [[systems/procgen]] — full pipeline diagram and decision tree.
- [[concepts/determinism]] — RNG-draw ordering as an invariant.
- [[decisions/DEC-01-unified-rng]] — shared-seed-not-forked pattern.
- [[decisions/DEC-05-low-code-config]] — how the custom-gen UI mutates `generator.config`.
- [[entities/BiomeSystem]], [[entities/TreeConfig]], [[entities/Random]].
