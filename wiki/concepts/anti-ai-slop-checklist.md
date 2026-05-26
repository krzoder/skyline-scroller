---
type: concept
title: Anti AI-slop visual checklist
status: canonical
date: 2026-05-27
related:
  - "[[concepts/visual-references]]"
  - "[[plans/weather-textures-animations]]"
---

# Anti AI-slop visual checklist

Synthesised from 5 parallel web-research agents (2026-05-27). Apply to every visual stage of [[plans/weather-textures-animations]].

The "Midjourney look" - hyper-saturated, glossy, melted edges, texture everywhere - emerges from soft gradients across object edges, fluid details that don't survive scrutiny, hallucinated text, asymmetry where symmetry is expected, and texture-everywhere syndrome.

## 10 testable principles

1. **Cap the palette per scene/zone.** Pick 6-12 hand-authored hues. No procedural hue picking from raw RGB space. (Alto's Adventure / Townscaper)

2. **Saturation cap ~70%, never 100%, never 0% on mids.** Peak saturation only on the mid-value swatch. (Slynyrd's pixelblog #1)

3. **Hue-shift, don't darken.** Shadow = +20deg hue + lower value, not just lower value on the same hue. (Slynyrd, Adam C Younis)

4. **Atmospheric perspective = desaturation + hue shift toward sky.** Far layers lose saturation and pull toward the dominant sky hue. Don't apply a fog *overlay* for distance. (Hollow Knight, Alto's)

5. **Silhouette discipline.** Every layer legible as a pure black shape. Test by setting `ctx.fillStyle='black'` and re-rendering; if the layer reads, colors can come later. (Limbo, Inside, Sworcery)

6. **No soft gradients across object edges.** Hard edges between value bands; gradients only inside sky/fog fields. (Monument Valley, Mini Metro)

7. **Texture restraint.** One ornament per ~100 px is plenty. "Detail everywhere" is the strongest AI-slop tell. (Sworcery, A Short Hike)

8. **Sample colors from real references.** A Short Hike sampled photos of the Canadian Shield. Pick a real reference per biome (e.g. forest = a specific Pacific Northwest valley photo).

9. **One mood per frame.** Don't mix dawn-warm with neon-cool in the same scene unless dissonance is the point. (Alto's weather states)

10. **Procedural picks placement; humans pick vocabulary.** Tiles, palette, ramps - all hand-curated. The seed only assembles. (Townscaper, Mini Metro, Dwarf Fortress)

## Per-PR test

Before each visual-stage PR merge:

- [ ] **Grid test** - zoom 4x. Silhouettes hard-edged; no AA fuzz on building edges; no stray pixels off the grid.
- [ ] **Squint test** - desaturate screenshot. Foreground/midground/background still parse via value contrast alone.
- [ ] **Symmetry test** - rain drops + snowflakes same shape; window grids symmetric per building.
- [ ] **Determinism test** - same seed twice -> byte-identical first 10 frames.
- [ ] **One-mood test** - the frame reads as ONE atmosphere (calm forest / sun-bleached desert / icy tundra / etc), not a mishmash.
- [ ] **Single light vector** - every shadow direction agrees with the sun/moon position.
- [ ] **No hallucinated text** - never render pseudo-letters; either real glyphs or solid blocks.

## Procedural vs slop

Procedural = same seed -> same result, deterministic, repeatable, testable.
Slop = probabilistic hallucination, no seed, unrepeatable, untestable.

A seeded `Random` stream is **the opposite** of slop. Anything that uses `Math.random()` directly in engine code is non-deterministic AND therefore tested less; that's why [[concepts/determinism]] bans `Math.random` outside sanctioned UI entropy entry points.

## Sources (URLs)

- [Alto's Adventure - design-milk](https://design-milk.com/altos-adventure-keeps-simple/)
- [GRIS - Colossal](https://www.thisiscolossal.com/2018/09/gris-video-game-by-nomada-studio/)
- [Hollow Knight - Sarah Mitchell](https://medium.com/3d-environmental-art/the-art-of-hollow-knight-f4c05dda3882)
- [Limbo / Inside - Game Rant](https://gamerant.com/limbo-15-year-anniversary-little-nightmares-inside-explained-why/)
- [Monument Valley - GDC Vault](https://www.gdcvault.com/play/1022476/The-Art-of-Monument)
- [Sword & Sworcery - nabauer](https://nabauer.com/superbrothers-sword-and-sworcery-design-analysis/)
- [A Short Hike - PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)
- [Mini Metro - Mechanics of Magic](https://mechanicsofmagic.com/2023/04/22/visual-design-of-games-mini-metro/)
- [Townscaper - HN](https://news.ycombinator.com/item?id=23937551)
- [Slynyrd Pixelblog #1 - Palettes](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)
- [Lospec Palette List](https://lospec.com/palette-list)
- [AI slop tells - Pixel Snapper](https://www.spritefusion.com/pixel-snapper)
- [QWE - AI Pixel Art Is Broken](https://www.qwe.edu.pl/tutorial/create-pixel-art-with-ai-tools/)
- [Wikipedia - AI slop](https://en.wikipedia.org/wiki/AI_slop)
- [Pedro Medeiros tutorials](https://saint11.art/blog/pixel-art-tutorials/)
