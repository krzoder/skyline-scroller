# Building Configuration

The procedural structure of a building is determined inside `CityGenerator.ts` and drawn by `Building.ts`. It acts as a primary feature of foreground layers during [[City Generation]].

## Biome Constraints
When a building chunk is rolled, the generator uses the current state from [[Biome Mechanics]] to dictate its aesthetic properties:
- **Material**: 
  - `desert`: Stone or Plaster
  - `forest`: Wood or Stone
  - `city`: Brick or Stone
- **Roof Type**:
  - `desert`: Flat or Dome
  - `tundra` / `forest`: Gabled (to shed snow/rain)
  - `city`: Flat or Crenelated (parapets)
- **Colors**: Generates HSL values. Desert produces oranges/yellows, Tundra produces cyan/blues, and Forests lean towards greens.

## Rendering and Caching
Because rendering intricate buildings per frame is expensive, the `Building` class draws itself onto an offscreen HTML canvas during instantiation (`generateTexture()`).
- **Body Construction**: Utilizes `TextureGenerator` to paint brick or wood patterns. Stone materials overlay random noise dots.
- **Windows**: Windows are mapped across a grid with gaps. There is an 80% chance for a window to appear in any grid slot. The color randomly simulates either warm interior light (`#FDF5E6`) or daytime sky reflection (`#87CEEB`).
- **Roofs**: Drawn procedurally atop the body using primitive paths (e.g., arcs for domes, interleaved rects for crenelated merlons).
