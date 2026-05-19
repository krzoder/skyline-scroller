# CSS Architecture & UI Bindings

The visual and interactive layer of the Skyline Scroller engine is driven by a bespoke, lightweight CSS implementation found in `src/style.css`, bypassing heavy CSS frameworks. It relies on raw CSS targeting structured DOM IDs, with explicit flexbox and absolute positioning layouts.

## Overarching Styling Approach

The application natively enforces a dark-themed, monospace-heavy visual identity designed to feel like a developer tool or technical dashboard floating over the procedural environment.

- **Color Scheme**: Enforced via `color-scheme: light dark;` on the `:root`, defaulting to a `background-color: #242424;`. Floating windows use heavy transparency `rgba(20, 20, 20, 0.95)` with slight borders `rgba(255, 255, 255, 0.1)` and box shadows to stand out against the dynamic game canvas.
- **Typography**: Uses modern system fonts (`Inter`, `system-ui`) for legibility on dense UI panels, while aggressively falling back to `monospace` for technical readouts like the [[Terminal Overview|Terminal]] and the seed display.
- **Action Colors**: Consistent semantic colors are applied to interactive elements:
  - **Neutral**: `#333` backgrounds with `#555` borders for unselected buttons.
  - **Active/Selected**: `#2E7D32` (Green) via utility classes like `.btn-selected`.
  - **Modified/Destructive**: `#d32f2f` (Red).
  - **Warning/Pending**: `#FBC02D` (Yellow-Orange, primarily seen on `.btn-smart-reset.default`).

## UI Layout & DOM Architecture

The fundamental layout pattern relies on **Absolute Overlaying**:
- The main `#game-canvas` is locked to fill the viewport (`width: 100%; height: 100%;`).
- The entire UI is built in overlapping transparent divs floating above the canvas.

To prevent the UI from swallowing mouse interactions intended for the game engine (like dragging the camera), wrapper layers (e.g., `#ui-layer`, `#gesture-slider-container`) utilize `pointer-events: none`. Interactive elements inside those wrappers then explicitly re-enable `pointer-events: auto`.

Modals like `#settings-window` and `#advanced-window` share common `.ui-window` base styles. They utilize flexbox for vertical stacking, avoiding complex floats or grid systems to keep the DOM rendering performant.

## Custom UI Controls & Data Bindings

Because native HTML forms lack the aesthetic needed for the engine, `style.css` defines extensive overrides:

### Dual Sliders
For complex parameter generation (like tree min/max heights), a custom dual-slider implementation is built entirely in CSS. It uses layered absolute tracks (`.dual-slider-track-bg`, `.dual-slider-track-fill`) combined with invisible `input[type=range]` elements whose thumbs are styled via `::-webkit-slider-thumb` to act as the visual grab handles.

### Smart Reset Buttons
The configuration UI includes contextual reset buttons (`.btn-smart-reset`). The CSS defines states like `.default` (yellow, indicating it matches the engine's default) and `.modified` (red, indicating the user has tweaked the value). The TypeScript UI bindings swap these classes in real-time when changes are detected.

### The Terminal UI
The [[Terminal Overview|Terminal]] subsystem features distinct styling to differentiate it from standard UI:
- **Terminal Output**: Uses custom scrollbars (`::-webkit-scrollbar`), hidden-when-empty states (`:empty`), and neon-green text (`#0f0`) on an opaque black background (`rgba(0, 0, 0, 0.85)`).
- **Line Interaction**: `.terminal-line` adds hover states and an animation class (`.terminal-copied`) when users click a command history line to copy it, providing immediate tactile feedback.

For more information on how the UI controls interact with the game state, see [[UI Architecture Overview]].
