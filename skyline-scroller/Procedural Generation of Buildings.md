# Procedural Generation of Buildings

Buildings in Skyline Scroller are heavily randomized, dynamically baked structures. Defined in `Building.ts`, they form the geometric contrast to the organic shapes of the [[Procedural Generation of Flora|Flora]] and [[Landscape Generation|Biomes]].

## Architecture Attributes
Each building instance requires the following core properties:
*   `width` and `height`: Core dimensions of the rectangular body.
*   `material`: Defines the texture application (`wood`, `brick`, `stone`, `plaster`).
*   `roofType`: Defines the silhouette (`flat`, `gabled`, `dome`, `crenelated`).
*   `baseColor` and `roofColor`: Hex strings defining architectural tones.

## Texture and Material Phase
The building uses the [[Entity Caching System]] to bake its final visual state. 
*   **Wood & Brick**: Hands generation off to a `TextureGenerator` (e.g., `createWoodPattern`, `createBrickPattern`), which returns a separate canvas stamped onto the building body.
*   **Stone & Plaster**: Rendered directly via standard fill contexts. Stone applies a noise layer by sprinkling 50 tiny (`2x2`) semi-transparent black rectangles across the body to simulate grain and texture.

## Window Matrix
Once the body is drawn, the script attempts to plot a matrix of windows.
*   The system uses fixed dimensions: `winW = 6`, `winH = 10`, `gapX = 10`, `gapY = 20`.
*   Windows are painted starting slightly above the building's base to leave room for a hypothetical entrance floor.
*   **Light Variation**: Base window color is a warm `#FDF5E6`, but there is a $50\%$ chance the building reflects the sky with a cyan `#87CEEB`.
*   **Missing Lights**: Every individual window has a $20\%$ chance to remain un-drawn, simulating a realistic distribution of lit/unlit apartments.

## Roof Types
The roof is constructed last and sits dynamically on top of the calculated `bodyTopY`.
*   **Flat**: A simple overhanging cornice of 5px height.
*   **Gabled**: Plots a 3-point triangle path connecting to the center peak.
*   **Dome**: An inverted half-circle arc path spanning the building's width.
*   **Crenelated**: Draws a 10px parapet, then loops through the width to draw merlons (the raised blocks of a castle battlement) every 10px using modulo arithmetic.
