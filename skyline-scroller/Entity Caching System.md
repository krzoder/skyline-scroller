# Entity Caching System

To sustain stable framerates during continuous horizontal scrolling, the engine implements an offscreen caching mechanism. Instead of pushing hundreds of complex `CanvasRenderingContext2D` paths every frame, entities render their procedural shapes exactly once onto a dedicated `HTMLCanvasElement`, which is then blitted efficiently onto the main screen buffer.

## `CityEntity` Framework
Most organic objects, such as [[Procedural Generation of Flora|Trees]] and [[Landscape Generation|Landscapes]], inherit from the abstract `CityEntity` class.
*   **Initialization**: The constructor calculates the requisite bounding box (`width` and `height`) and calls `initCache(padding)`. Padding is crucial to ensure that bounding shapes (e.g., overhanging oak tree leaves) aren't clipped by the canvas boundaries.
*   **Delegated Drawing**: The `initCache` method sets up the offscreen canvas and delegates the actual aesthetic logic back to the subclass via a protected `drawToCache(ctx: CanvasRenderingContext2D)` method.

## Cache Composition in `Building.ts`
Unlike generic entities, [[Procedural Generation of Buildings|Buildings]] do not inherit `CityEntity` directly but implement the `Renderable` interface.
They manage their own `cacheCanvas` through `generateTexture()`.
*   **Roof Adjustments**: Buildings dynamically calculate a `totalHeight` that sums the core structural height plus an estimated maximum `roofHeight` (30px). 
*   **Draw Execution**: Upon generation, `ctx.drawImage` maps custom textures (via a global `TextureGenerator`) into the cache, then paints window vectors over it.

## The Draw Loop
During the main game loop, the engine calculates the object's position relative to the camera (`offsetX`).
```typescript
draw(ctx: CanvasRenderingContext2D, offsetX: number) {
    const screenX = this.x - offsetX;
    ctx.drawImage(this.cacheCanvas, screenX, this.y - this.cacheCanvas.height);
}
```
This paradigm ensures that complex procedural pathing—which may involve loops, randomness, or texture synthesis—costs CPU time only at initialization (or instantiation), not per-frame.
