# Layering System

Parallax scrolling and object management are handled by the layering architecture, split between `src/engine/Layer.ts` and the `Renderable` interface found in `src/engine/Renderable.ts`.

## Renderable Interface
`Renderable` defines the contract for any object drawn on the screen:
```typescript
export interface Renderable {
    x: number;
    y: number;
    width: number;
    height: number;
    draw(ctx: CanvasRenderingContext2D, offsetX: number): void;
    isVisible(viewX: number, viewWidth: number): boolean;
}
```
This forces all entities (trees, buildings, etc.) to expose their bounding box dimensions and a rendering function that respects an `offsetX` (the camera offset for the parallax perspective).

## The Layer Class (`Layer.ts`)
The `Layer` class manages arrays of `Renderable` objects. When initialized in `Game.ts` via `Game.reset()`, layers are assigned `speedModifier`, `zIndex`, `yOffset`, and `scale`. 
- **Parallax Logic:** The visual perspective is achieved via the `speedModifier`. The "virtual" camera position for a specific layer is computed as:
  ```typescript
  const layerViewX = cameraX * this.speedModifier;
  ```
  Background layers have lower speed modifiers (e.g. `0.2`), making them scroll slower than foreground layers (`1.0`).

## Rendering and Culling
During the [[Game_Loop_and_Time|Game Loop]], the `Layer` class executes two critical functions:
1. **Pruning (`prune(cameraX)`)**: Iterates through its `objects` array and permanently removes any objects that have fallen far behind the camera (`layerViewX - buffer`). This guarantees the infinite scroller doesn't run out of memory.
2. **Drawing (`draw(...)`)**: Prior to rendering its entities, the layer transforms the `CanvasRenderingContext2D` using its internal `yOffset` and `scale`. For performance optimization, the layer checks object bounds and only calls `draw()` on objects currently intersecting the viewport, factoring in both parallax offset and scale.
