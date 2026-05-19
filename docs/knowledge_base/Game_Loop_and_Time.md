# Game Loop and Time Management

The engine employs a standard fixed-timestep-capped variable loop pattern, driven by browser APIs.

## The Loop Setup
The core loop is initiated in `Game.start()`, which sets `isRunning = true` and fires a `requestAnimationFrame` loop. The engine is entirely decoupled from fixed intervals, preferring `performance.now()` timestamps passed by the browser to calculate Delta Time (`dt`).

## Delta Time and Capping
In `Game.loop(time)`, the engine calculates the real `deltaTime` in seconds. To prevent physics explosions or large procedural leaps when the browser tab loses focus, `dt` is strictly capped:
```typescript
const safeDt = Math.min(deltaTime, 0.1);
```
This guarantees the simulation never steps more than 100ms per frame.

## Time Scaling
The engine supports dynamic time dilation through the `timeScale` property.
- The base `update` step is passed `safeDt * this.timeScale`.
- `timeScale` can be adjusted via [[UI_and_Configuration|UI Settings]] (ranging from reverse time, to stopped, to extremely fast-forward). 
- `cameraX`, which acts as the unified spatial time variable for generation, advances by `cameraSpeed * (safeDt * timeScale)`.

## Execution Order
Each frame is split into `update(dt)` and `render()`:
1. **Update Phase**: 
   - Advances `cameraX` based on camera speed.
   - Calls `SkySystem.update(dt, logicalW)`.
   - Calls `CityGenerator.generate(...)` to spawn new procedural content on the horizon.
   - Calls `Layer.prune(...)` to garbage collect entities that have scrolled off-screen.
   - Syncs DOM Debug UI with current time and seed (if not in preview mode).
2. **Render Phase**: 
   - Handles global canvas transformations (scaling, translations).
   - Draws subsystems back to front (Sky -> Layers -> Earth -> Post-processing).
