# Biome Transitions
The [[Biome System]] manages shifts between distinct climates and environments using an Adjacency Graph. This prevents unnatural, jarring transitions (e.g., jumping straight from `tundra` to `desert`).

## Adjacency Graph Logic
The graph restricts which biomes can naturally follow the current one. The allowed transitions are:
- **Tundra** -> `forest`, `plains` (Cold to Temperate)
- **Forest** -> `tundra`, `plains`
- **Plains** -> `forest`, `desert`, `city`
- **City** -> `plains`, `desert`
- **Desert** -> `plains`, `city` (Hot to Temperate)

When a biome duration expires, the [[Biome System]] queries this graph and randomly (but deterministically, thanks to [[Deterministic Randomness]]) selects an allowed successor.
