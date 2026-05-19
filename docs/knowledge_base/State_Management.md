# State Management

State in `skyline-scroller` is deliberately split between the DOM-oriented application layer (`main.ts`) and the simulation layer (`Game.ts`). 

## Engine State (`Game.ts`)
The `Game` class encapsulates all simulation state, making it easily reproducible and isolated:
- **Spatial State**: `cameraX` dictates the current viewing position and procedural generation boundaries. 
- **Deterministic State**: `seed` dictates the RNG for the `CityGenerator`.
- **Configuration State**: `treeConfig`, `timeScale`, `volume`, `timeFormat`.
- **Subsystem State**: Instances of `SkySystem` and `CityGenerator`, which maintain their own internal state (time of day, current biome, active entities).

## UI Application State (`main.ts`)
The `main.ts` file acts as the controller, maintaining UI-specific state and binding it to the `Game` instance.
- **Audio State**: `currentVolume`, `lastVolume`, and `isMuted` are tracked in the closure to handle smooth mute toggles without losing volume memory.
- **Advanced Options**: `currentAdvSpeedCenter` acts as an anchor for the complex logarithmic slider UI, tracking the mathematical center of the slider's range based on user inputs.
- **Preview State**: A secondary `Game` instance (`previewGame`) is kept in memory. When generating custom worlds, state is manipulated on the `previewGame` first. Upon applying, the configurations (e.g., `previewGame.generator.config`) are extracted and synchronized over to the main `Game` instance.

## One-Way Synchronization
The application largely uses a push-based synchronization model:
- User interacts with UI -> `main.ts` modifies `Game` state directly (e.g., `game.setTimeScale()`).
- Exception: The `Game.update()` loop pushes certain values (like `timeFormat` string calculations and `seed` string checks) back to specific DOM elements directly (`#ui-seed-val`, `#ui-time-val`). This is hardcoded for loop performance rather than relying on a heavy reactive framework.
