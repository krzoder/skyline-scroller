# Sky Gradients

The `SkySystem` class governs the atmospheric aesthetics of the engine, primarily dictating ambient light and background color via a meticulously crafted 24-hour cycle.

## Time Progression
The time state flows from $0.0$ to $24.0$. `time` increases dynamically based on the engine's `dt` (delta time) multiplied by a `speed` multiplier (typically `0.1` for 5x slower transitions).
*   The system initializes at a random time using the engine's deterministic `Random` utility.
*   When `time` exceeds 24, it seamlessly wraps back to 0.

## Gradient Keyframes
Instead of simple linear daytime/nighttime colors, the engine relies on an array of 17 distinct keyframes. Each keyframe defines:
*   `t`: The precise hour (e.g., `17.35` for Dusky Orange).
*   `top`: The zenith hex color.
*   `bot`: The horizon hex color.
*   `overlay`: An ambient RGB filter applied over the rest of the game world (retrieved via `getAmbientColor()`).

### Notable Phases
*   **Nighttime ($20.5 \rightarrow 5.0$)**: Deep blues and absolute blacks (`#020024`). Overlay casts a dark tint: `rgb(20, 20, 35)`.
*   **Sunrise ($5.5 \rightarrow 6.5$)**: Transitions rapidly through Bluey Gloom to a Sunrise Peak (`#70a1ff` / `#ff9f43`) to a bright day cyan.
*   **Sunset ($17.35 \rightarrow 18.5$)**: Highly saturated phase moving from Dusky Orange to Velvet Purple (`#6a0572`), bridging into a Bright Night hue.

## Interpolation (Lerping)
During the `draw()` phase, the system iterates over the keyframes to find the immediate previous and next frames bounding the current `time`.
A normalized `progress` is calculated:
$$ progress = \frac{time - f1.t}{f2.t - f1.t} $$
The system manually parses Hex/RGB values and calculates interpolated integers to ensure precise, floating-point-free CSS string construction:
```typescript
const r = Math.round(r1 + (r2 - r1) * t);
```
This is injected into a linear gradient stretching from `y=0` to `y=canvas.height`.

See also: [[Celestial Bodies]] for sun/moon integration.
