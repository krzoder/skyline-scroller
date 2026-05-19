---
name: SkySystem
description: Day/night driver — keyframed sky gradient, sun/moon, drifting clouds, and ambient overlay tint.
type: entity
source: src/engine/SkySystem.ts
loc: 402
---

# SkySystem

## Role

`SkySystem` owns the in-world clock (`time ∈ [0,24)`), the 17-keyframe sky palette, the single-slot sun/moon celestial body with a four-stage flip transition at sunrise/sunset, and ~20 recycled cloud instances (cumulus / cirrus / stratus). It draws the back-most layer of the frame and exports `getAmbientColor()` so [[entities/Game]] can multiply-tint the rest of the scene. See [[systems/sky]].

## Public surface

| Signature | Purpose |
|---|---|
| `constructor(_canvas: HTMLCanvasElement)` | Seeds RNG from `Date.now()`, randomises starting `time`, populates 20 clouds. `_canvas` arg is **unused**. |
| `getTime(): number` | Current in-world hour `0..24`. |
| `update(dt, logicalW): void` | Advances `time`, drifts + recycles clouds. |
| `getAmbientColor(): string` | Interpolated `overlay` (`rgb(r,g,b)`) for the current time. Consumed by [[entities/Game]] for multiply tint. |
| `draw(ctx, w, h): void` | Sky gradient → celestial body → clouds (back-to-front). |

No exported types — cloud and keyframe records are anonymous inline shapes.

## Internal state

| Field | Notes |
|---|---|
| `time: number` | World-hour, wraps via `if (time >= 24) time = 0` (loses sub-tick remainder) |
| `speed: number = 0.1` | Hours per `dt`-unit; assumes `dt` is seconds (~240 s per day) |
| `keyframes` | 17 entries; `t[0]=0`, `t[16]=24`, endpoints identical for wrap |
| `clouds[]` | 20 typed descriptors (`type`, `parts[]`, `bounds`, kinematics) |
| `rng: Random` | Mulberry32 from [[entities/Random]]; seeded once with `Date.now()` |

Each keyframe carries `top` (`#RRGGBB`), `bot` (`#RRGGBB`), `overlay` (`rgb(r,g,b)`). Asymmetric format forces `lerpColor` to parse both.

## Control flow / lifecycle

1. **Construct** — `rng = new Random(Date.now())`, `time = rng.next() * 24`, `initClouds()` spreads 20 clouds across an assumed `1920` px width.
2. **`update(dt, w)`** — `time += speed*dt`; wrap; reverse-iterate clouds, advance `x`, despawn-and-recycle any whose `bounds.minX*scale` has passed `w`.
3. **`draw(ctx, w, h)`** — `getSkyColors(time)` linear scan + lerp → vertical gradient fill; `drawCelestialBody` (sun XOR moon); iterate clouds with `save/translate/scale` + per-type path ops.
4. **No dispose** — no listeners, no rAF; lifetime bound to owning [[entities/Game]].

### Celestial math

```
x  = -150 + (time/24) * (w + 300)               // linear left→right
cy = 125 + sin((time - 6) * π / 12) * -75       // arc; peak at noon, trough at midnight
```

Sun XOR moon, never both. Transition is a four-stage state machine in `flipWin = 0.15` h windows around `t=6` and `t=18`: bloom fade, cosine squash (`Math.abs(scaleX)` — squash, not mirror), identity swap at `p ≥ 0.5`, bloom grow. Dawn and dusk are time-reversed clones.

## Confirmed defects (Codex 2026-05-20)

- **`Date.now()` seed** — Sky RNG, cloud layout and start hour differ per page load even when [[entities/CityGenerator]] uses a deterministic string seed. Sky is out of sync with the rest of the deterministic pipeline. Tracked in [[decisions/DEC-01-unified-rng]].
- **`_canvas` constructor arg unused** — `approxWidth = 1920` is hardcoded in `initClouds`; non-1920 viewports get mis-spread initial cloud fields.
- **Moon arcs subterranean** — `sin((t-6)·π/12) * -75` is positive below the horizon at night; `cy` can exceed 200. Soft visual inconsistency.
- **`Math.abs(scaleX)` collapses mirror to squash** — cosine `1→-1→1` becomes `1→0→1`; intended mirror flip is decorative.
- **Time wrap drops remainder** — `time = 0` instead of `time -= 24` or `% 24`; precision sink, invisible at current `speed`.
- **`lerpColor` RGB-linear** — muddy mid-tones force dense dusk keyframes (5 entries between 17.35–18.5). HSL/OKLab would smooth this; see [[concepts/dualisms]] (color-interpolation entry).
- **Per-part `opacity` is dead data for cumulus/cirrus** — `0.4` hardcoded in cirrus draw; cumulus uses only cloud-level opacity.
- **Edge equality at `t == 6` / `t == 18`** — strict `>` / `<` on the `drawSun` predicate gives single-tick flicker.
- **Full hex re-parse every frame** — `lerpColor` allocates strings and arrays per channel; trivial pre-parse win.

## Dependencies

Imports:
- `../utils/Random` — [[entities/Random]] (Mulberry32)

Imported by:
- [[entities/Game]] — instantiated in `reset()` outside preview; consumes `update`, `draw`, `getAmbientColor`.
- Likely HUD/clock formatter in `main.ts` reads `getTime()` for `#ui-time-val` (SkySystem itself does no formatting).

## Notable invariants

- `0 <= time < 24` after every `update` (assuming `dt > 0`).
- Keyframes strictly ascending, endpoints identical (wrap-continuous).
- Exactly one celestial body per frame (sun XOR moon).
- Cloud count constant — every despawn paired with immediate `createCloud(false)`.
- `cloud.x` monotonically increasing per lifetime; reset only on respawn.
- RNG advances forward only; never re-seeded.
- `lerpColor` always returns `rgb(r,g,b)` (never `#hex`).

## See also

- [[systems/sky]] — rendering and timing pipeline
- [[systems/game-loop]] — caller contract (update→render order)
- [[entities/Game]] — orchestrator + ambient-multiply consumer
- [[entities/Random]] — Mulberry32 RNG
- [[concepts/determinism]] — why Date.now seed breaks reproducibility
- [[concepts/dualisms]] — day/night, sun/moon, dawn/dusk, gradient/overlay, etc.
- [[decisions/DEC-01-unified-rng]] — proposed unified seeding (Date.now → string seed)
- [[decisions/DEC-02-lifecycle]] — sky has no dispose; bound to Game lifetime
