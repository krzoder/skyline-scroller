---
type: plan
title: Weather + per-object textures + animations
status: proposed
date: 2026-05-27
deciders: fszalaj
related:
  - "[[DEC-11-architecture-pass-2]]"
  - "[[plans/architecture-pass-2]]"
  - "[[concepts/test-scenarios]]"
  - "[[concepts/determinism]]"
  - "[[entities/SkySystem]]"
  - "[[entities/Building]]"
  - "[[entities/Tree]]"
  - "[[concepts/anti-ai-slop-checklist]]"
  - "[[concepts/visual-references]]"
issues:
  - "#48 Terminal hint XSS (security)"
  - "#49 Game loop silent failure (reliability)"
  - "#50 Preview Game leak on Apply (reliability)"
  - "#51 Initial biome determinism"
  - "#52 REGIONS palette duplication"
  - "#53 Biome tree variety"
  - "#54 localStorage persistence"
  - "#55 Stub buttons (Density/Terrain/Weather)"
  - "#56 CI npm audit"
  - "#57 SkySystem keyframe RGB cache"
  - "#58 Test infrastructure"
  - "#59 Static noise overlay - replace with weather"
  - "#60 Weather system (RAIN/SNOW/FOG/CLEAR)"
  - "#61 Per-object texture variation"
---

# Plan: weather system + per-object textures + animations + enterprise hardening

## Why

User directive 2026-05-27 (sequenced):
1. "The texture overlying the scroller is not changing and its unnecessary" - static noise overlay must go.
2. "Generate per object textures" - per-building texture diversification.
3. "Different textures per weather" - weather drives appearance changes (sand overlay in sandstorm, etc.).
4. "Implement weather with swarm and codex" - new feature, codex-reviewed.
5. "Enterprise grade not just a scroller" - production-quality posture.
6. "Use animations to bind the threes [sic=trees] and break windows in bad weather, sand overlying the building and cactusses in sandstorm."
7. "Tables of relatives - which weather in which biome - editable in settings."
8. "Use codex, work in loop and test, all issues resolved including newly created."

Synthesised: ship a deterministic weather system that interacts with the procgen layer (per-biome weather distribution, per-weather animations + overlays on buildings/trees), expose it in Custom Gen UI, persist user pref, and clean up the latent issues (#48-#61) along the way.

## Web research (anti-slop foundation)

[[concepts/anti-ai-slop-checklist]] codifies the 10 visual principles from 5 parallel web-research agents (2026-05-27). Highlights:

- **Bounded palette per zone** (Alto's, Townscaper). No procedural hue picking from RGB space.
- **Procedural picks placement; humans pick vocabulary**. Hand-author tile/palette set; seed only assembles.
- **Atmospheric perspective = desaturation + hue shift toward sky**, not a fog overlay.
- **Silhouette discipline**: every layer legible as a pure black shape.
- **Single light vector per scene** - consistent shadow direction.
- **Hash-noise > Perlin** for building grain (10-line int hash beats 2-4 kB lib).
- **Vector streaks for rain, single-pixel particles for snow, scrolling fBm tile for fog** (Celeste / Stardew / Godot recipes).
- **Determinism contract preserved**: every random draw via `Random.fork(label)`.

## Weather model

### State

```
WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'sandstorm'
```

(5 states - sandstorm added per user "sand overlying" directive.)

### Biome x weather weights table

User wants this editable. Backed by `BiomeDefinition.weatherWeights`:

| Biome   | clear | rain | snow | fog  | sandstorm |
|---------|------:|-----:|-----:|-----:|----------:|
| forest  |  0.60 | 0.25 | 0.05 | 0.10 |      0.00 |
| desert  |  0.65 | 0.02 | 0.00 | 0.03 |      0.30 |
| tundra  |  0.40 | 0.05 | 0.45 | 0.10 |      0.00 |
| plains  |  0.70 | 0.15 | 0.05 | 0.10 |      0.00 |
| city    |  0.55 | 0.25 | 0.05 | 0.15 |      0.00 |

Weights are author-curated (not procedurally generated) per the anti-slop checklist. Editable in Custom Gen + Terminal `/weather-weights`.

### State machine

`WeatherSystem` holds:
- `current: WeatherType` - what's rendering now.
- `target: WeatherType` - what we are transitioning toward.
- `blend: number` - 0..1 progress of transition.
- `transitionDurationSec: number` - default 20s.

Per frame:
- `blend += dt / transitionDurationSec` (clamped 1).
- When `blend >= 1`: roll a new `target` from `REGIONS[currentBiome].weatherWeights` using `Random.fork('weather').nextFloat()`. Reset blend to 0.
- Intensity (particle spawn rate, overlay alpha) = `lerp(current.intensity, target.intensity, blend)`.

### Rendering

Per [[concepts/visual-references]]:

- **Rain**: vector streaks (`ctx.strokeStyle`, `lineTo`) length proportional to velocity. ~300-500 streaks at full intensity. Pool-allocated `Float32Array(N*4)` for `[x, y, vx, vy]`. Splash circles drawn at ground (pre-rendered to OffscreenCanvas).
- **Snow**: single-pixel `fillRect` particles in two layers (foreground 200, background 150). Tiny sin-wave horizontal drift for curve.
- **Fog**: pre-baked 256x256 fBm noise tile (3 octaves) blit twice per frame with two scrolling offsets at `globalAlpha` 0.15-0.3. ~5x cheaper than per-pixel noise.
- **Sandstorm**: combination of vector streaks (horizontal, warm-tinted) + fog tile (warm-yellow) + sand overlay applied to building/cactus textures during weathering bake (see Stage T-B).
- **Clear**: nothing rendered. Sky + clouds (existing SkySystem) unmodified.

### Animations under bad weather

- **Tree sway** (rain, fog, sandstorm): trees apply per-frame `ctx.transform` with `Math.sin(time * frequency + entityX * 0.01) * amplitude` rotation around base. Amplitude scales with weather intensity (max ~3deg at full storm). Wind direction (left/right bias) is a weather-system property.
- **Window break** (sandstorm, rare): on weather state entering sandstorm, ~5% of buildings flag random windows as "broken" - rendered as a darker irregular shape with hash-noise crack lines. Persists for the duration of sandstorm. Deterministic via `Random.fork(\`break:\${buildingX}\`)`.
- **Sand overlay** (sandstorm, desert): existing weathering mask (see Stage T-B) tied to weather state. When sandstorm active, sand alpha ramps from 0 to ~0.4 over transition; building + cactus textures get an extra warm-yellow noise pass over their cache canvases on entry/exit transitions.

## Revisions applied (Codex review 2026-05-27)

Per `codex:codex-rescue` REVISE vote on the initial plan:

1. **#48 added to frontmatter** (was missing; covered by S-A stage).
2. **Stage count fixed** - 24 stages.
3. **W-C clarified** - it ships as a deliberate "visual blank interim" state (clear weather renders nothing); this is acceptable because clear is the new default and the noise overlay was the user-flagged annoyance.
4. **Mountains / landscape editing added** - new stage `U-M` for editing landscape style and silhouette parameters per biome.
5. **Tree-sway determinism carve-out** - sway phase uses `performance.now()` and is *intentionally non-deterministic*. The seed-replay determinism contract covers placement and texture, not animation phase.
6. **Window-break time axis resolved** - uses `Random.fork(\`break:\${buildingX}:\${weatherEpoch}\`)` where `weatherEpoch` is an integer counter incremented per weather-state transition (not wall-clock). Deterministic across reloads at the same seed.
7. **Reduced-motion gate extended** - E-A also gates tree-sway amplitude to 0 when `prefers-reduced-motion: reduce`.
8. **Per-stage bundle gates added** - each visual stage has a kB budget; CI step verifies via a script that compares the latest gzip dist size against the previous commit.
9. **Mobile frame-budget gate** - before merging W-D (first visual weather stage), measure with Chrome DevTools CPU 4x throttle; require >=55 fps median on a 1280x720 viewport with 5 visible chunks.
10. **`U-W` stage added** - weather-weights editor per biome in Custom Gen + Terminal `/weather-weights`.

## User directives (2026-05-27 late additions)

- **Mountains editable** - landscape silhouettes (current `landscapeStyle` per biome, e.g. tundra=peaked, desert=dunes) must be tweakable from settings. Stage U-M adds a per-biome silhouette parameter editor (style + peakiness + density).
- **UI menu redesign** - the settings layout is "not fitting the scroller UI". Stage S-U redesigns the panel system from scratch: visual coherence with the parallax aesthetic, anti-AI-slop, accessible. Dispatched a 6-agent UI swarm in parallel; plan revisions to be merged once swarm reports.

## Stage plan

Each stage = one PR, individually revertable, Codex-reviewed, admin-merged when CI + Codex green (homelab runner still flaky).

| # | Stage | Touches | Closes |
|---|---|---|---|
| W-A | WeatherSystem core (state machine + Random fork) | `src/engine/WeatherSystem.ts` (new), `src/engine/Game.ts` wires it in after SkySystem | partial #60 |
| W-B | REGIONS weather weights + biome integration | `src/regions/_index.ts`, `src/procgen/BiomeSystem.ts` | partial #60 |
| W-C | Drop static noise overlay; insert WeatherSystem render in place | `src/engine/Game.ts` (delete `initNoise` + `noisePattern` blit), wire `weather.draw()` | #59 |
| W-D | Rain renderer (vector streaks + pooled particles + splash) | `src/engine/weather/RainEffect.ts` (new) | partial #60 |
| W-E | Snow renderer (two-layer single-pixel) | `src/engine/weather/SnowEffect.ts` (new) | partial #60 |
| W-F | Fog renderer (fBm pre-baked tile scrolling) | `src/engine/weather/FogEffect.ts` (new), `src/utils/noise.ts` (new - 10-line value-noise) | partial #60 |
| W-G | Sandstorm renderer + sand overlay weathering pass | `src/engine/weather/SandstormEffect.ts`, `src/procgen/entities/Building.ts` + `Tree.ts` (weather-bake hook) | partial #60 |
| T-A | Per-object hash-noise + HSL jitter (texture variation) | `src/utils/hashNoise.ts` (new), `src/procgen/entities/TextureGenerator.ts`, `Building.ts` bake | #61 |
| T-B | Biome weathering masks (moss / bleach / frost / smog / sand) | `src/regions/_index.ts` (weatheringMask field), `Building.ts` + `Tree.ts` apply | partial #61 |
| A-A | Tree sway animation (per-frame transform driven by WeatherSystem.windAmplitude) | `src/procgen/entities/Tree.ts` `draw()` override | (new) |
| A-B | Window-break overlay during sandstorm | `src/procgen/entities/Building.ts` (broken-windows flag set on weather transition) | (new) |
| U-A | Custom Gen UI: replace 3 stub buttons - wire Density, Terrain (FEATURE_HEIGHT scale), Weather selector | `src/main.ts` HTML template, `src/ui/custom-gen.ts`, new `src/ui/weather-controls.ts` | #55 |
| U-B | Terminal `/weather` command (force / random / show table) | `src/engine/Terminal.ts` | partial #60 |
| U-C | localStorage persistence for volume / timeFormat / lastSeed / treeConfig / weather pref | `src/main.ts` boot, callbacks in audio/advanced/seed/custom-gen | #54 |
| U-M | Mountains / landscape silhouette editor per biome (style + peakiness + density) | `src/regions/_index.ts` (extend BiomeDefinition.landscapeStyle), `src/procgen/entities/Landscape.ts` (read fields), new `src/ui/landscape-editor.ts` | (new) |
| U-W | Weather-weights editor per biome (Custom Gen UI + `/weather-weights` Terminal command) | `src/ui/weather-controls.ts`, `src/engine/Terminal.ts` | (new) |
| S-U | Settings menu redesign from scratch (UI coherent with parallax aesthetic, anti-slop, a11y) | `src/main.ts` HTML template + `src/style.css`, `src/ui/settings-window.ts` + advanced-window + custom-gen restructure | (new) |
| O-B | More building types (spire, dome-cathedral, ruin, glass-tower, factory, watchtower) + tune existing | `src/procgen/entities/Building.ts` (new render branches), `src/procgen/entities/TextureGenerator.ts` (variation + wear), `src/regions/_index.ts` (per-biome building palette + type weights) | (new) |
| U-Bldg | Custom Gen sub-panel for buildings (per-type enable, height range, biome list - mirrors tree config) | `src/ui/building-config-editor.ts` (new), `src/main.ts` HTML template, `src/procgen/BuildingConfig.ts` (new), `src/engine/Game.ts` buildingConfig field | (new) |
| R-A | Reliability batch: Game loop visible failure + Preview Game leak on Apply + Initial biome determinism + REGIONS palette dedup | `src/engine/Game.ts`, `src/ui/custom-gen.ts`, `src/procgen/BiomeSystem.ts`, `src/procgen/CityGenerator.ts` | #49, #50, #51, #52 |
| O-A | Biome variety: add 2nd-3rd tree per desert/tundra/city + REGIONS palette tweaks | `src/regions/_index.ts` | #53 |
| P-A | SkySystem RGB-tuple keyframe cache + cloud globalAlpha (perf) | `src/engine/SkySystem.ts` | #57 |
| C-A | CI: remove `--no-audit` from npm ci OR add explicit `npm audit --audit-level=high` step | `.github/actions/setup/action.yml`, `.github/workflows/*.yml` | #56 |
| S-A | Security: Terminal hint XSS hardening (textContent for dynamic parts) | `src/ui/terminal-bind.ts` | #48 |
| T-X | Test scaffolding + 23-test high-ROI cluster | `vitest.config.ts`, `tests/helpers/mockCanvas.ts`, ~20 new tests | #58 |
| E-A | Enterprise gap fill 1: prefers-reduced-motion gate on scroll speed; reduced-motion skips weather particles | `src/engine/Game.ts` listens to `matchMedia('(prefers-reduced-motion: reduce)')` | (new) |
| E-B | Enterprise gap fill 2: CSP + SRI on built bundle | `index.html` adds `Content-Security-Policy` meta; Vite plugin for SRI | (new) |
| E-C | Enterprise gap fill 3: web-vitals attribution + console-sink (Sentry deferred until user authorises) | `src/main.ts` boot | (new) |

Order rationale:
- **R-A first** - resolves quick reliability wins that are otherwise easy to forget.
- **T-X early** - test scaffolding lets later stages assert deterministic weather/animation output.
- **W-A through W-G** - weather system buildup, each stage shippable independently (weather optional via WeatherType:'clear' default).
- **T-A / T-B + A-A / A-B** - texture variation + animations layer over weather.
- **U-A / U-B / U-C** - UI exposure last so backend stabilises first.
- **P-A** + **C-A** + **S-A** - one-shot cleanups parallelisable with anything.
- **E-A through E-C** - enterprise hardening, deferred to end (visible changes are settings).

## Implementation method (per user 2026-05-27)

For each stage:
1. **Dispatch swarm** when scope >2 files OR design choice required. Skip for trivial mechanic.
2. **Codex review** the diff before commit. Block-fix-recommit.
3. **Build + tests green** before push.
4. **Push branch -> PR**. If homelab runner up: wait for fidom preview + approval. If down: admin merge after user authorises.
5. **Issue close** via `Closes #N` in commit/PR.
6. **Update hot.md** after each merge. Log.md gets a per-day entry.
7. **Loop**: next stage. Continue until all 24 stages done.

## Determinism plan

The weather system introduces new RNG calls. To preserve seed reproducibility:

- Define a fresh sub-stream `Random.fork('weather')` consumed only by WeatherSystem.
- Inside WeatherSystem, further fork per effect: `weatherRng.fork('rain-particles')`, `.fork('weather-transitions')`, etc.
- Per-building per-weather state (broken windows in sandstorm) derived from a deterministic hash `(buildingX, weatherStartedAt)` - NOT from a live RNG that would skew procgen.
- Document in [[concepts/determinism]] that the seed format bumps once at W-A merge. Regenerate `Determinism.test.ts` golden hash.

## Visual references applied

Per [[concepts/visual-references]]:
- Rain streaks: MillerTime CodePen pattern + pre-rendered splash gradients.
- Snow: Aran.ink Celeste two-layer single-pixel.
- Fog: Godot 2D shader fBm tile + globalAlpha.
- Texture variation: Caves of Qud two-color + detail-color method (already partially used in Building); add hash-noise grain + HSL jitter per Aegon Games gradient-map.
- Palette discipline: Slynyrd 9-swatch ramps, Lospec.
- Atmospheric perspective: Hollow Knight desat + sky-hue shift on far layers.

## Anti-slop test (per stage)

Before each visual stage PR:
- **Squint test**: desaturated screenshot must still parse foreground/midground/background.
- **Grid test**: zoom 4x; silhouettes hard-edged, no AA fuzz on building edges.
- **Symmetry test**: rain drops same shape; snowflakes same shape; window grids symmetric per building.
- **Determinism test**: same seed twice -> byte-identical render of first 10 frames.
- **Animation test**: tree sway repeats with period (no random walk drift).

## Acceptance for "all issues resolved"

When stages complete, every open issue from this push (#48-#61) plus the new animation issues (A-A, A-B), enterprise issues (E-A..E-C), and any closing concerns (#39 / #40 type bugs that arise) must show `Closed`. Final hot.md update should list 0 open issues.

## Risks

- **Bundle bloat**: budget for weather + textures = ~10-12 kB added. Hard-cap; if exceeded, drop sandstorm to phase 2.
- **Determinism breakage**: every weather PR touches RNG; golden hash bumps once at W-A and again at W-G if particle sub-streams shift. Document in release notes.
- **Mobile performance**: weather particles + fog double the per-frame draw count. Test on mid-range phone before E-A; reduce particle counts via `prefers-reduced-motion` gate.

## See also

- [[DEC-11-architecture-pass-2]] - the parent decision; this plan extends DEC-11 with weather/textures/animations as new stages.
- [[concepts/anti-ai-slop-checklist]] - the visual quality bar.
- [[concepts/visual-references]] - named references + URLs.
- [[concepts/test-scenarios]] - existing test backlog (T-X stage closes most of these).
