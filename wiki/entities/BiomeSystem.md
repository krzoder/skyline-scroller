---
name: BiomeSystem
description: Frame-counted finite-state machine over five biomes connected by a hand-authored climate-adjacency graph.
type: entity
source: src/procgen/BiomeSystem.ts
loc: 51
---

# BiomeSystem

## Role

Tracks the current biome and drifts to adjacent biomes after a duration elapses. Owned by [[entities/CityGenerator]]; consulted on every chunk to bias ground type, feature palette, roof archetype, and tree species. Also consumed by [[entities/SkySystem]] for sky tint.

## Public surface

- `type BiomeType = 'forest' | 'desert' | 'tundra' | 'plains' | 'city'`
- `class BiomeSystem`
  - `constructor(seed: number | string)`
  - `public update(dx: number): BiomeType`
  - `public getCurrentBiome(): BiomeType`
  - `public forceBiome(b: BiomeType): void`
- Private: `switchBiome()`, `transitions` adjacency graph.

## Internal state

- `rng: Random` — independent Mulberry32 stream from the seed (cloned-not-forked from the generator's stream; see [[decisions/DEC-01-unified-rng]]).
- `currentBiome: BiomeType` — picked uniformly from all 5 at construction.
- `durationRemaining: number` — pixels-of-camera-travel until next switch; range `[3000, 8000)`.
- `transitions: Record<BiomeType, BiomeType[]>` — hardcoded climate-adjacency graph:
  - `tundra ⇄ forest, plains`
  - `forest ⇄ tundra, plains`
  - `plains ⇄ forest, desert, city`
  - `city ⇄ plains, desert`
  - `desert ⇄ plains, city`
- `plains` is the only 3-degree hub; no direct `tundra↔city` or `tundra↔desert` edge.

## Confirmed defects

- **`update(1)` is called with a hard-coded `1`** from `CityGenerator.generate`, despite `dx` being named as if it carried real camera-advance. Effective duration is "3000–8000 frames", not pixels — at 60 fps that's ~50–130 s per biome. Naming and intent disagree. See [[decisions/DEC-01-unified-rng]] context.
- `forceBiome` does not reseed `rng` — RNG state continues, so replays via `forceBiome` are deterministic given the same sequence of forces, not relative to a no-forces run.
- Constructor and `switchBiome` `console.log` internal state — debugging leak, mild noise in production.

## Dependencies

- Imports: [[entities/Random]].
- Imported by: [[entities/CityGenerator]] (composition). `BiomeType` is re-imported by [[entities/Landscape]], [[entities/Ground]], [[entities/Building]], [[entities/SkySystem]], and main.ts (custom-gen UI).

## Invariants

- `durationRemaining` strictly decreases by 1 per call until `≤ 0`, then a switch occurs.
- Switches only follow edges in `transitions` — no teleporting except via `forceBiome`.
- `currentBiome` is always one of the 5 enum values.

## See also

- [[systems/procgen]] — how biome drives ground/feature/material selection.
- [[decisions/DEC-01-unified-rng]] — shared-seed-not-forked pattern.
- [[concepts/determinism]].
- [[entities/CityGenerator]], [[entities/SkySystem]], [[entities/Landscape]].
