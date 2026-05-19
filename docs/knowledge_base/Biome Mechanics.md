# Biome Mechanics

The environment in Skyline Scroller is controlled by the `BiomeSystem` (`src/procgen/BiomeSystem.ts`). It functions as a state machine that dynamically evolves the world's thematic appearance.

## Biome Types
The game features five distinct biomes: `forest`, `desert`, `tundra`, `plains`, and `city`.

## Adjacency and Transitions
To prevent jarring environmental changes (e.g., a snowy tundra immediately snapping into a hot desert), transitions are restricted by a predefined adjacency graph:
- **Tundra** transitions only to `forest` or `plains`.
- **Forest** transitions to `tundra` or `plains`.
- **Plains** can transition to `forest`, `desert`, or `city`.
- **City** transitions to `plains` or `desert`.
- **Desert** transitions to `plains` or `city`.

## Duration Logic
When a new biome starts, the system randomly assigns a `durationRemaining` between 3000 and 8000 pixels. As the camera scrolls and layers are generated, the `CityGenerator` updates the biome system with the scrolled distance. Once `durationRemaining` hits zero, the adjacency graph is used to select the next biome randomly.

This system directly informs the [[City Generation]], altering rules for [[Building Configuration]] and [[Tree Configurations]].
