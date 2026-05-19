# Procedural Generation Overview

The Skyline Scroller uses a robust procedural generation engine to construct endless, non-repeating yet deterministic city skylines. The architecture separates structural logic, biome constraints, and entity styling into distinct modules, all unified by a shared seed.

## Seed Handling
At the core of the system is the `Random` utility class. A single string or number seed is provided at startup. This seed is passed down to instantiate isolated PRNG (Pseudo-Random Number Generator) instances within:
- `CityGenerator` (for layout and sizing)
- `BiomeSystem` (for environment transitions)

Because each subsystem consumes randomness deterministically, the same seed will produce the exact same skyline, biomes, and building details.

## Key Subsystems
The generation logic is split into the following components:
- [[City Generation]]: The orchestrator that populates background layers and foreground chunks based on "City DNA".
- [[Biome Mechanics]]: A state machine managing the environment (e.g., desert, forest) and logical transitions.
- [[Building Configuration]]: Defines materials, roofs, and colors based on the current biome, caching them to canvases.
- [[Tree Configurations]]: Defines parametric constraints and drawing logic for flora across different biomes.
