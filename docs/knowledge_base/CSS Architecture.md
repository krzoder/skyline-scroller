# CSS Architecture
The visual layer of the game (`src/style.css`) eschews heavy CSS frameworks, relying instead on raw CSS targeting structured DOM IDs.

## Overarching CSS Tokens & Theme
The application natively enforces a dark-themed, monospace-heavy visual identity:
- **Color Scheme**: Enforced via `color-scheme: light dark;`, `background-color: #242424;`, and floating windows using heavy transparency `rgba(20, 20, 20, 0.95)`.
- **Primary Typography**: Inter/system-ui for standard text; `monospace` heavily utilized for the terminal and seed readouts.
- **Action Colors**: Consistent semantic colors are applied via UI utility classes in `main.ts` and `style.css`:
  - **Default/Neutral**: `#333` backgrounds with `#555` borders.
  - **Active/Apply**: `#2E7D32` (Green, via `.btn-selected` or direct styles).
  - **Modified/Destructive**: `#d32f2f` (Red).
  - **Warning/Pending**: `#FBC02D` (Yellow-Orange, used on `.btn-smart-reset.default`).

## Layout Principles
- **Absolute Overlaying**: The `<canvas>` is locked to full screen (`width: 100%; height: 100%; object-fit: cover;`). The UI layers float above it using `position: absolute` or `position: fixed`.
- **Flexbox**: Modals (like `.ui-window`, `#settings-window`) and control groups (`.row`) heavily rely on CSS Flexbox for alignment, justification, and dynamic spacing.
- **Pointer Events**: Since the UI overlays the canvas, interactive UI elements explicitly set `pointer-events: auto`, while wrapper layers (e.g. `#ui-layer`) use `pointer-events: none` to allow dragging/clicks to fall through to the canvas underneath.

## Custom UI Controls
The CSS defines intricate custom controls to override default browser form styles:
- **Dual Sliders**: Uses layered absolute tracks (`.dual-slider-track-bg`, `.dual-slider-track-fill`) combined with invisible `input[type=range]` elements (`.dual-slider-input`) whose custom thumbs `-webkit-slider-thumb` act as the interactive handles.
- **Smart Reset Buttons**: Elements like `.btn-smart-reset` transition between states (e.g., `.default` to `.modified`) using color and icon changes to visually indicate when a system differs from its baseline configuration.
- **Terminal Customization**: Custom scrollbars (`::-webkit-scrollbar`), hidden-when-empty states (`:empty`), and interactive hovering for copied lines (`.terminal-copied`).

See also: [[UI Architecture Overview]]
