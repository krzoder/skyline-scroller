# Graphics Pipeline Overview

The Graphics Pipeline in Skyline Scroller relies on a combination of dynamic procedural drawing and aggressive offscreen caching. To maintain high performance during scrolling, static or semi-static assets are pre-rendered into internal canvases, allowing the main loop to blit (via `drawImage`) rather than execute complex paths.

## 1. Dynamic Environment Rendering
At the base of the pipeline is the [[Sky Gradients|Sky System]]. It does not use caching for the sky backdrop because the gradient and celestial elements smoothly animate every frame based on a `time` variable ($0$ to $24$). The rendering uses a logical width (`logicalW`) allowing resolution-independent scaling of the day-night cycle, [[Celestial Bodies|sun/moon movement]], and cloud culling.

## 2. The Entity Caching Pipeline
Complex vector graphics are computationally expensive to draw on every frame, especially when layered in a parallax scrolling landscape.

The engine solves this through the [[Entity Caching System]]:
*   **Procedural Generation**: Assets like trees, buildings, and landscape hills generate their geometry programmatically using Canvas 2D primitives.
*   **Off-screen Canvases**: Once the geometry is resolved, it is drawn once onto an in-memory `HTMLCanvasElement`.
*   **Main Loop Blitting**: During the game's `draw()` loop, these cached canvases are stamped onto the screen using a calculated `offsetX`.

## 3. Rendering Layers
The pipeline processes rendering from back to front:
1.  **Sky Backdrop**: Real-time gradient fills and celestial bodies.
2.  **Clouds**: Alpha-blended procedural clusters.
3.  **Landscapes**: Layered [[Landscape Generation|Biomes]] defining silhouette slopes and distant city lines.
4.  **Static Props**: Including [[Procedural Generation of Buildings|Buildings]] and [[Procedural Generation of Flora|Flora]] positioned across the landscape.

All entities share an offset paradigm where `screenX = this.x - offsetX`. They correctly decouple world coordinates from screen-space coordinates, enabling infinite or very wide level limits.
