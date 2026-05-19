# Engine Architecture

The core architecture of the `skyline-scroller` is a monolithic game engine wrapper that orchestrates multiple procedural generation and rendering subsystems.

## Entry Point: `main.ts`
The [[State_Management|Application State]] and DOM interactions are bootstrapped in `main.ts`. This file dynamically injects the HTML UI into the page, initializes the primary `Game` instance, and wires up extensive event listeners for the control panels (Custom Generation, Advanced Settings, and Terminal).

## Core Class: `Game` (`src/engine/Game.ts`)
The `Game` class is the central orchestrator of the engine. It manages the [[Game_Loop_and_Time|Game Loop]] and delegates responsibilities to various subsystems.

### Key Subsystems
- **Layers System**: The scene is divided into a `Layer[]` (background, mid-back, mid-fore, foreground). Each layer manages its own entities and parallax scrolling effects based on `cameraX`. See [[Layering_System|Layering System]].
- **Procedural Generation**: Handled by `CityGenerator`, which populates the layers dynamically as the `cameraX` advances. It relies on a `seed` to ensure deterministic generation.
- **Sky System**: The `SkySystem` handles day/night cycles, weather, and calculates ambient lighting colors which are overlaid via canvas composite operations.

### Rendering Paradigm
The engine utilizes the HTML5 Canvas 2D API for rendering. The rendering pipeline in `Game.render()` follows a strict painter's algorithm:
1. **Clear/Draw Sky**: The background is filled with the sky gradient/celestials.
2. **Translate to Ground**: A global coordinate transformation aligns layers to a lifted `groundY` baseline.
3. **Draw Layers**: Layers are rendered back-to-front.
4. **Draw Earth**: A solid overlay beneath the ground hides entities moving off-screen or sky peeking through.
5. **Post-Processing**: 
   - **Ambient Light**: An overlay of the `SkySystem`'s ambient color with a `multiply` composite operation.
   - **Dithering**: A pre-computed noise pattern is applied to fix rendering banding.

## Multi-Instance Support
The architecture allows for multiple game instances. `main.ts` leverages this by running a main `Game` instance and a lightweight `previewGame` instance for the [[UI_and_Configuration|Custom Generation]] window. The preview instance uses `isPreview = true`, bypassing global resize events and DOM UI syncs.
