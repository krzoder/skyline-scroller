# Landscape Generation

The `Landscape.ts` file acts as the topographical canvas. It is responsible for drawing large undulating vector surfaces across the screen, functioning as the stage for [[Procedural Generation of Buildings|Buildings]] and [[Procedural Generation of Flora|Flora]].

## Silhouette Shaping
Landscapes are categorized by `BiomeType`. The shape of the hill is determined procedurally using a 2D point array:
*   **Forest & Plains**: Smooth, symmetrical hill peaking strictly in the middle (`width * 0.5`).
*   **Desert**: An asymmetrical dune structure peaking slightly to the left (`width * 0.4`).
*   **Tundra**: A jagged, three-peak mountain structure simulating rocky terrain.
*   **City**: Rather than a slope, the city biome plots a series of 5 stepped blocks spanning the width, simulating a distant silhouette of high-rise structures against the [[Sky Gradients]].

## Anti-Floating Artifact Logic
Because landscapes can be translated upward via parallax layers (`yOffset`), small hills might inadvertently expose the blank background beneath their base curve.
The `Landscape.ts` draw call circumvents this by calculating a vertical expansion. When stamping the [[Entity Caching System|cache]] to the screen, the system manually forces a `ctx.fillRect()` extending from the baseline of the hill down to `2000px`, acting as an infinite soil foundation.

## Automatic Slope Decoration
If a landscape is non-urban, the `decorate()` function attempts to automatically sprout distant procedural props along the generated slopes.
*   It calculates an approximate linear interpolation on the slope (e.g., using a `peakRatio` to find the exact negative Y offset along the hypotenuse).
*   For the `forest` biome, it draws minimalist geometric pine trees (two stacked, dark green triangles) rather than using the full `Tree.ts` generator, as these distant decorations need to remain highly performant and visually subtle.
