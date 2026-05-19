# State Management

In `skyline-scroller`, state is cleanly separated between the DOM-centric user interface defined in `src/main.ts` and the deterministic simulation enclosed in `src/engine/Game.ts`.

## Engine State (`Game.ts`)
The `Game` class acts as the centralized store for the simulation.
- **Spatial / Time State:** `cameraX` measures how far the infinite scroller has progressed, essentially driving the [[Game_Loop_and_Time|Game Loop]] generation.
- **Procedural Seed:** `seed` stores a string representing the deterministic seed for the city generation. 
- **Subsystem Managers:** Contains `CityGenerator`, `SkySystem`, and an array of `Layer` objects (see [[Layering_System|Layering System]]).
- **Audio & Visual Settings:** Parameters like `volume`, `isMuted`, `timeScale`, and `timeFormat` govern the audiovisual presentation.

## UI State (`main.ts`)
The `main.ts` file orchestrates the UI, holding ephemeral state that doesn't belong in the engine:
- **Sliders & Inputs:** Values related to the advanced control windows (e.g. logarithmic speed slider's `currentAdvSpeedCenter`).
- **Preview Instance:** A secondary, parallel instance of the `Game` class (`previewGame`) is spawned for the "Custom World Generation" panel. Changes inside the preview window mutate `previewGame` state before being flushed into the main game state upon applying.
- **Volume State:** Variables like `lastVolume` persist user volume preferences when toggling the mute state.

## Synchronization (Push vs Pull)
Most interactions use a one-way binding: modifying a DOM element updates the corresponding state variable in `Game`.
However, some high-frequency state updates inside the [[Game_Loop_and_Time|Game Loop]]'s `update()` phase are pushed directly to DOM elements (e.g., setting the inner text of `#ui-seed-val` and `#ui-time-val`). This circumvents the need for a complex frontend framework and keeps the architecture lightweight.
