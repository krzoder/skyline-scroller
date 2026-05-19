# City Generation

The `CityGenerator` (`src/procgen/CityGenerator.ts`) is the primary orchestrator of the endless runner's world. It generates the world dynamically as the camera moves, filling "chunks" across parallax layers.

## City DNA
Upon initialization, the generator rolls a set of overarching parameters called `CityDNA`:
- **Density** (`0.4` - `0.9`): Dictates the frequency of buildings.
- **Greenery** (`0.1` - `0.8`): Governs the probability of a tree spawning if a building doesn't.
- **Building Height** (`0.8` - `1.2`): A scaling factor applied to all building heights.

## Chunk and Layer Generation
The generator tracks the right-most X-coordinate (`lastX`) for each parallax layer. In its `generate()` loop, it looks ahead of the camera and spawns chunks until the horizon limit is reached. 
- **Background Layers** (`index <= 1`): Simplified generation, heavily favoring rolling `landscape` features and relying on biome-specific dirt/grass.
- **Foreground Layers** (e.g., `index 3`): Generates diverse ground types (grass, pavement, water). On non-water chunks, it rolls against the `CityDNA` to spawn either a `building`, a `tree`, or leave an empty gap.

## Biome Integration
Chunk generation constantly queries the [[Biome Mechanics]] system. The current biome dictates:
- Ground types (e.g., desert yields dirt, city yields pavement).
- Entity aesthetics via [[Building Configuration]] and allowed flora via [[Tree Configurations]].

*Note: Generated chunks overlap by 1 pixel to prevent visual tearing, and water chunks force a minimum width of 100 pixels.*
