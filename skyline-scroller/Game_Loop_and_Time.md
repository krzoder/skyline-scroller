# Game Loop and Time Management

The core architecture of `skyline-scroller` revolves around a central Game Loop managed within `src/engine/Game.ts`.

## The Loop Setup
The loop is bootstrapped by calling `Game.start()`, which records the start time using `performance.now()` and initiates the recursive `requestAnimationFrame` loop.
```typescript
    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        console.log("Game started at", this.lastTime);
        requestAnimationFrame((t) => this.loop(t));
    }
```

## Delta Time and Time Capping
Inside `Game.loop(time)`, the elapsed time since the previous frame (`deltaTime`) is calculated in seconds. A crucial detail is that the engine safeguards against physics or procedural generation anomalies caused by massive time spikes (e.g., when the user switches tabs and the browser pauses `requestAnimationFrame`).
It does this by capping the maximum delta time to `0.1` seconds per frame:
```typescript
const safeDt = Math.min(deltaTime, 0.1);
```

## Update Phase
The `update(dt)` method handles simulation logic:
1. Advancing spatial state (`cameraX`) relative to the camera speed and time.
2. Updating the background `SkySystem`.
3. Generating procedural entities through the `CityGenerator`.
4. Pruning off-screen objects by looping over all layers and triggering their `prune` mechanisms (see [[Layering_System|Layering System]]).
5. Synchronizing non-reactive UI elements (debug seed and time readouts) if not running in preview mode. (See [[State_Management|Application State Management]]).

## Render Phase
The `render()` method paints the game state to the `CanvasRenderingContext2D`:
1. **Setup:** Calculates logical bounds based on a `scaleFactor` and saves context.
2. **Backdrop:** Renders the sky or a solid background color.
3. **Layer Rendering:** The canvas Y-axis is translated to establish a ground baseline, then each layer is drawn back-to-front.
4. **Post-Processing:** Applies a global ambient light overlay using multiply blending to match the time of day, followed by a noise pattern for dithering.

## Time Scaling
The user can manipulate time speed via `this.timeScale`. During the loop, the final time step passed to the `update` logic is `safeDt * this.timeScale`.
