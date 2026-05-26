---
type: concept
title: Visual references for skyline-scroller
status: canonical
date: 2026-05-27
related:
  - "[[concepts/anti-ai-slop-checklist]]"
  - "[[plans/weather-textures-animations]]"
---

# Visual references for skyline-scroller

Named references with one-line takeaways from 5 web-research agents (2026-05-27). Used as the visual quality bar for [[plans/weather-textures-animations]].

## Aesthetic anchors

| Game | Takeaway | URL |
|---|---|---|
| Alto's Adventure | A handful of hues per weather/time-of-day state; simple shapes; cohesion = one mood per scene. | [design-milk](https://design-milk.com/altos-adventure-keeps-simple/) |
| GRIS | Watercolor pooling outside the lines; palette starts monochrome and gates new hues. | [Colossal](https://www.thisiscolossal.com/2018/09/gris-video-game-by-nomada-studio/) |
| Hollow Knight | Mostly monochromatic; sparse color splashes; foreground silhouettes drive depth. | [Medium](https://medium.com/3d-environmental-art/the-art-of-hollow-knight-f4c05dda3882) |
| Limbo / Inside | Pure silhouette; mystery from withheld information. | [Game Rant](https://gamerant.com/limbo-15-year-anniversary-little-nightmares-inside-explained-why/) |
| Monument Valley | Every frame worthy of public display; flat shapes, hand-tuned palettes, no texture noise. | [GDC Vault](https://www.gdcvault.com/play/1022476/The-Art-of-Monument) |
| Sword & Sworcery | Painterly + sparse patterning; minimum pixels per shape; limitation as artistic strength. | [nabauer](https://nabauer.com/superbrothers-sword-and-sworcery-design-analysis/) |
| A Short Hike | Palette sampled directly from photographs of the Canadian Shield in autumn. | [PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/) |
| Mini Metro | Bold contrast-hue per transit line; readability *is* the aesthetic. | [Mechanics of Magic](https://mechanicsofmagic.com/2023/04/22/visual-design-of-games-mini-metro/) |
| Townscaper | Wave-function-collapse + a human-curated palette; algorithm assembles, humans choose colors. | [Site](https://www.townscapergame.com/) |

## Technical recipes

### Rain (canvas 2D)

- **MillerTime CodePen** - vector-line streaks, object-pooled, pre-rendered splash gradients, viewport culling. https://codepen.io/MillerTime/pen/oXmgJe
- **Mehul Nirala** - gravity + wind vector per frame, wrap-around respawn. https://mulx10.medium.com/raining-particles-using-html5-canvas-fe5478d8cb2f

### Snow (canvas 2D)

- **Aran.ink Celeste tilesets** - two parallel snow systems (foreground white/light-blue single-pixel, faster; background darker, slower). Tiny per-particle velocity/gravity variation. https://aran.ink/posts/celeste-tilesets

### Fog (canvas 2D)

- **Godot 2D Fog Overlay** - fullscreen rect with fBm (multi-octave Perlin) noise, scrolling UVs. Recipe: 2-3 octaves of noise, sum, multiply alpha, scroll. https://godotshaders.com/shader/2d-fog-overlay/
- **Jönsson Perlin primer** - 4D Perlin for animated volumetric fog. https://www.angelcode.com/dev/perlin/perlin.html

### Particle systems

- **desarrollolibre ES6 Canvas particle system** - modular particle class with pool reuse, RAF, trail-effect via low-alpha full-canvas fill, integer-coordinate rounding. https://www.desarrollolibre.net/blog/javascript/creating-particles-with-javascript-and-canvas

### Weather state machine

- **peerdh - Algorithmic dynamic weather** - probability-transition table (SUNNY->RAINY 20%, SUNNY->STORM 1%), evaluated on tick. Pairs with smooth blend (lerp current and target weather intensity). https://peerdh.com/blogs/programming-insights/algorithmic-techniques-for-dynamic-weather-systems-in-games
- **diva-portal academic survey** - static vs dynamic weather; player perception of transition speed. https://www.diva-portal.org/smash/get/diva2:1524012/FULLTEXT02

### Determinism

- **Unreal forum** - emitter holds own seeded RNG; same seed = same sequence. Maps 1:1 to `rng.fork('weather')`. https://forums.unrealengine.com/t/deterministic-particle-emitters/129997

### Texture variation

- **Caves of Qud sprite modding** - two-color + detail layer method. Black/white masks + ColorString + DetailColor. https://steamcommunity.com/sharedfiles/filedetails/?id=1455732142
- **Aegon Games gradient mapping** - luminance LUT into 256x1 gradient strip; swap strip to recolor. https://www.aegongames.com/runtime-colour-variation/
- **Hash noise** - 10-line integer hash beats Perlin library for grain. https://arugl.medium.com/hash-noise-in-gpu-shaders-210188ac3a3e
- **StraySpark procedural weathering** - dirt accumulates on upward-facing horizontals; rain streaks fall vertically; overhangs stay clean. https://www.strayspark.studio/blog/procedural-weathering-blender-geometry-nodes
- **Clockworkchilli procedural textures in JS** - fBm overlay for blotches + grain. https://clockworkchilli.com/blog/6_procedural_textures_in_javascript

### Performance budgets

- **SVGGenie Canvas vs WebGL 2026** - Canvas 2D ceiling ~3-5k drawn elements per frame; mobile is half. Integer coords + offscreen pre-render are the biggest wins. https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025

## Enterprise frontend references (for [[plans/weather-textures-animations]] stages E-A, E-B, E-C)

- **Canvas visual regression** - ASE 2022 paper, traditional DOM tests miss 55% of canvas regressions. https://arxiv.org/abs/2208.02335
- **Sentry sampling docs** - `sampleRate: 1.0` errors, `tracesSampleRate: 0.1-0.2`. https://docs.sentry.io/platforms/javascript/configuration/sampling/
- **WAI-ARIA Authoring Practices keyboard** - every interactive element keyboard-reachable. https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- **MDN prefers-reduced-motion** - WCAG 2.3.3 compliance. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- **web.dev INP** - <200ms = good; Long Animation Frames API for jank attribution. https://web.dev/articles/inp
- **OWASP CSP cheatsheet** - nonce/hash strategy, `script-src 'self'`, report-uri. https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- **W3C SRI 2** - `integrity="sha384-..."` on every external script. https://www.w3.org/TR/sri-2/
- **CycloneDX npm SBOM** - generates spec-compliant SBOM at build. https://github.com/CycloneDX/cyclonedx-node-npm/releases

## Use

These references are the foundation for visual decisions. When implementing a stage:
1. Pick the technical recipe (e.g. MillerTime for rain).
2. Apply the aesthetic anchor (e.g. Alto's palette restraint).
3. Run the per-PR test ([[concepts/anti-ai-slop-checklist]]).
4. Cite the reference in the PR description.

## See also

- [[concepts/anti-ai-slop-checklist]] - the 10 visual principles.
- [[plans/weather-textures-animations]] - the implementation plan.
- [[concepts/determinism]] - why seeded RNG is the opposite of slop.
