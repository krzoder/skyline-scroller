# Chunk System
Within [[City Generation]], the background and foreground environments are composed dynamically out of "chunks". A chunk conceptually maps to a horizontal slice that contains a base ground layer and optionally a feature (such as a tree, a building, or a landscape background).

## Background vs Foreground Generation
Chunks differ radically depending on their assigned parallax layer.

### Foreground Layers (Layer Index > 1)
The foreground consists of complex urban and natural features.
- Ground types randomly cluster into `pavement`, `grass`, or `water`. Water requires at least 100px of width and suppresses any object spawns.
- Uses `CityDNA` (see [[City Generation]]) and [[Deterministic Randomness]] to decide if a chunk should spawn a `building` or a `tree`.
- Buildings receive randomized dimensions, colors (via HSL), and materials/roofs tailored to the [[Biome System]].
- Tree sizes and types are pulled from the `TreeConfig` depending on the current biome context.

### Background Layers (Layer Index <= 1)
Background layers are heavily simplified. They strictly spawn `landscape` chunks (hills, mountains) with varying widths and heights. Ground types correspond directly to the current biome (e.g., `desert` yields `dirt`, `city` yields `pavement`).
