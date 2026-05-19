# Biome System
The `BiomeSystem` (`src/procgen/BiomeSystem.ts`) dictates the overarching environmental context of the game. It controls visual aesthetics, chunk materials, and what types of trees or buildings can spawn in the [[Chunk System]].

## Architecture
The system accepts a seed (used by [[Deterministic Randomness]]) to initialize a starting `BiomeType` and duration. Biomes currently supported:
- `forest`
- `desert`
- `tundra`
- `plains`
- `city`

### Core Loop
Biomes change continuously based on camera displacement (via a simple ticker reducing `durationRemaining`). Each biome typically spans 3000 to 8000 pixels.
When the timer depletes, a new biome is chosen deterministically according to the [[Biome Transitions]] graph.

### Modifying the Environment
The biome context heavily drives [[City Generation]]. Depending on the active biome, different materials, roofs, colors, and foliage (controlled via `TreeConfig`) will be populated. For example:
- `desert` biomes favor orange/yellow hues, flat/dome roofs, and stone/plaster buildings.
- `tundra` biomes favor cyan/blue hues and gabled roofs to shed snow.
