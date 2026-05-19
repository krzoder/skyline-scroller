# UI Architecture Overview
The User Interface for Skyline Scroller is implemented purely via DOM overlays bound tightly to the underlying HTML5 Canvas 2D game engine. The architecture consists of multiple layers of floating toolbars, modal windows, and an interactive terminal.

## Key Components
- [[CSS Architecture]]: Defines the spatial z-indexing, overarching visual tokens, and responsive layout of the game overlays.
- [[Terminal Grammar State Machine]]: A bespoke parser and execution environment for in-game commands.
- [[Terminal Autocomplete Engine]]: Provides rich contextual suggestions for CLI inputs.
- **Main App Binding (`main.ts`)**: Controls the logic bridging DOM events to the `Game` instance (e.g., speed sliders, volume controls, procedural generation configurators).

## DOM Layering (Z-Index Schema)
The application controls interaction states and visual hierarchy through a strict `z-index` mapping:
- `10`: Informational HUD (`#ui-layer`)
- `100`: Base Controls (`#bottom-right-controls`)
- `150`: Terminal Overlay (`#terminal-output-container`)
- `200`: Custom Gen Window / Volume Popup
- `300`: Advanced Options Window
- `500`: Gesture Slider HUD
- `9999`: Volume Visual Bar
