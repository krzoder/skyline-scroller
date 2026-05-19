# Procedural Generation of Flora

Defined within `Tree.ts`, flora forms the primary organic decoration for natural landscapes. The engine uses the `CityEntity` abstraction (see [[Entity Caching System]]) to safely cache complex pathing logic.

## Supported Types
The generator maps out distinct sub-routines based on a specified `TreeType`:
*   `sequoia`: Imposing height (w: 70px) with 8 horizontally layered, narrowing elliptical leaf clusters over a thick brown trunk.
*   `pine`: Symmetrical coniferous profile (w: 60px). It loops through 4 tiers of jagged, overlapping triangles generated using `moveTo` and `lineTo` paths.
*   `oak`: Broad canopy (w: 90px). It draws a thick, short trunk, followed by a crown made of 5 overlapping circular "puffs" distributed radially around the crown's center using percentage-based X/Y offsets. Requires an extra 30px of padding to prevent clipping the wide canopy on the cache canvas.
*   `bush`: Low-profile grouping (w: 40px) of 3 distinct, intersecting semi-circles mapped directly to the floor of the canvas.
*   `hedge`: A strictly geometric `roundRect` block (w: 60px) possessing a dark-green stroke outline to simulate manicured boundaries.
*   `cactus`: Desert vegetation (w: 40px) consisting of a main stem and two symmetrically asymmetric "arms" constructed out of narrow rectangles.

## Variations (Flowers)
The system injects an extra layer of visual variety via a `flowerChance` parameter in the constructor.
Currently, this is only active on the `cactus` type.
*   If triggered, the cactus grows a pink (`#E91E63`) circular flower (`radius: 4px`).
*   The position is chosen stochastically (`left` or `right` arm) and mathematically snaps precisely to the upper, inner corner of the chosen arm.
