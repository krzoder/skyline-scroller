# UI and Configuration

The engine supports deep customizability exposed through vanilla DOM elements dynamically injected and managed by `main.ts`.

## Main Configuration Objects
The engine relies on structural JSON-style configuration objects to drive procedural generation, heavily represented by `TreeConfig` (imported from `DEFAULT_TREE_CONFIG`).
When modifying settings via the "Custom Generation" window:
1. The `previewGame` instance (see [[Engine_Architecture|Multi-Instance Support]]) loads a default `treeConfig`.
2. UI controls manipulate `previewGame.generator.config` directly.
3. Upon hitting "Apply", the config is deep-cloned to the main game:
   ```typescript
   game.treeConfig = JSON.parse(JSON.stringify(previewGame.generator.config));
   ```

## Advanced Settings UI
The engine implements complex mathematical custom controls for robust user experience:
- **Logarithmic Speed Slider**: Maps linear slider values to a wide range of simulation speeds (-10x to +20x, or specialized bounds) utilizing mathematically driven `getAdvSpeedFromSlider` and `getSliderFromAdvSpeed` helpers.
- **Smart Reset Mechanism**: Elements tracking state deviation from defaults, actively highlighting the reset buttons (e.g. `updateResetButton` toggles classes if `game.timeScale === 1.0` or `timeFormat === '24h'`).

## Canvas Modifiers & Scaling
To support responsive design and sharp rendering, `Game` uses a fixed internal logical resolution scaled by a `scaleFactor` (1.6). 
- `logicalW` and `logicalH` are computed dynamically from the browser's `clientWidth`/`clientHeight` inside the [[Game_Loop_and_Time|Render Loop]]. 
- Window `resize` events re-trigger canvas dimension calculations without needing to re-initialize internal object coordinates, as procedural generation boundary checks scale natively with `logicalW`.
