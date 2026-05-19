# Agent 04 — `src/engine/SkySystem.ts`

## Files scanned

- `/Users/fszalaj/Documents/git/skyline-scroller/src/engine/SkySystem.ts` (402 LOC)
- Cross-reference only (not in scope, briefly read for seed/RNG contract): `/Users/fszalaj/Documents/git/skyline-scroller/src/utils/Random.ts`
- `/Users/fszalaj/Documents/git/skyline-scroller/wiki/.scan/_brief.md` (headings spec)

## Public surface (exports/classes/functions/types)

One export: `class SkySystem`.

Public methods:

| Signature | Purpose |
|---|---|
| `constructor(_canvas: HTMLCanvasElement)` | Seeds RNG from `Date.now()`, randomises start `time` in `[0, 24)`, populates ~20 clouds. `_canvas` is **unused** (parameter underscored — see Surprises). |
| `getTime(): number` | Returns current in-world hour `0..24`. |
| `update(dt: number, logicalW: number): void` | Advances time, scrolls clouds, respawns those that drift off the right edge. |
| `getAmbientColor(): string` | Returns interpolated `overlay` RGB string for the current `time`. Used by other systems to tint scene (e.g. building/foliage colour multiply — see [[entities/Game]] and [[concepts/AmbientLighting]]). |
| `draw(ctx, w, h): void` | Renders sky gradient, sun-or-moon, then all clouds. Order is back-to-front. |

No exported types/interfaces — the cloud and keyframe records are anonymous inline shapes on private fields.

## Internal state

Fields:

- `time: number` — in-world hour, domain `[0, 24)`. Public via `getTime()`. Wraps modulo via `if (this.time >= 24) this.time = 0`.
- `speed: number = 0.1` — hardcoded "5x Slower" comment indicates a prior tuning. With `dt` in seconds, ~10 s real time per in-world hour, so a full day takes ~240 s (4 min). With `dt` in ms it would be ~240 ms — context likely seconds; confirm against caller in [[entities/Game]].
- `keyframes` — 17 entries (`t` ∈ {0, 2.5, 4, 5, 5.5, 6, 6.3, 6.5, 12, 16.5, 17.35, 17.8, 18.2, 18.5, 20.5, 22, 24}). Each has `top`, `bot` (both `#RRGGBB`) and `overlay` (in `rgb(r,g,b)` form). The asymmetric mix of formats forces `lerpColor` to handle both. Start (t=0) and end (t=24) are identical — explicit wrap guard.
- `clouds[]` — array of typed cloud descriptors with `x, y, speed, type, scale, opacity, bounds, parts[]`. Each part is `{x,y,r,opacity?,w?,h?}`. Sub-shape varies by cloud `type`.
- `rng: Random` — Mulberry32-based seeded RNG from [[entities/Random]].

## Control flow

### Time advancement
```
update(dt, logicalW):
    time += speed * dt          // 0.1 hours per dt-unit
    if (time >= 24) time = 0    // no fractional remainder carry — small precision sink
    for each cloud (reverse):
        cloud.x += cloud.speed * dt
        if (cloud.x + cloud.bounds.minX * cloud.scale > logicalW):
            splice + createCloud(false)  // respawn at left edge
```

### Render order (`draw`)
1. Compute `{top, bot}` via `getSkyColors(time)` → build vertical linear gradient and fill full viewport.
2. `drawCelestialBody(ctx, w)` — single body (sun OR moon) at parametric position.
3. Iterate clouds, save/translate/scale, draw `parts` per `type`.

### `getSkyColors(t)` — keyframe lookup
Linear scan to find the bracketing pair `(f1, f2)` such that `f1.t <= t < f2.t`, then linear interpolation on each of `top`, `bot`, `overlay`. **No easing** — pure linear lerp in RGB space (no gamma, no HSL). Bracket fallback: defaults to `keyframes[0]`/`keyframes[1]` if loop fails to match (e.g. `t == 24` exactly would never satisfy strict `<`, so the wrap key at index 16 is structurally needed).

### Celestial body math
```
x  = -pad + (time / 24) * (w + 2*pad)         // pad = 150 px
cy = 125 + sin((time - 6) * π / 12) * -75      // arc: peak high at noon, low at midnight
```
- The body always traverses **left → right** linearly with `time`. So the sun and moon share the **same x trajectory** (they're literally drawn at the same position at the moment of swap). The moon does **not** orbit independently — see Dualisms.
- The vertical arc has period `2π / (π/12) = 24` hours, phase shifted so peak at `t=12` (noon), trough at `t=0`/`t=24` (midnight). At `t=6` and `t=18` the body is at `cy = 125` (horizon line in viewport coordinates — top-anchored).
- The arc is the **same curve** for both sun and moon — the moon "rises" in the East at 18:00 and "sets" in the West at 06:00 along an inverted (subterranean) arc only because the daytime portion is symmetric; actually the formula gives `sin((t-6)·π/12)` which is **positive for `t∈(6,18)` and negative for `t∈(0,6)∪(18,24)`**. Multiplied by `-75`, the body goes **up** during the day (cy decreases) and **down** at night (cy increases past 125). So the moon literally arcs *downward off-screen* — and yet it's drawn. This is a soft inconsistency; see Surprises.

### Sun/moon flip transition
A symmetric four-stage state machine centred on `t = 6` (sunrise) and `t = 18` (sunset):

| Side | Window | Behaviour |
|---|---|---|
| Dusk (`t∈(12,24)`) | `[18 - 0.5, 18 - 0.15)` | Bloom fades 1→0, core shrinks 40→30 |
|  | `[17.85, 18.15)` (flipWin*2 = 0.3) | `scaleX = cos(p·π)` produces a horizontal squash-and-mirror; midway (`p ≥ 0.5`) `drawSun = false` |
|  | `≥ 18.15` | Moon only |
| Dawn (`t∈(0,12)`) | `< 5.85` | Moon only |
|  | `[5.85, 6.15)` | Mirror flip; `p ≥ 0.5` switches to sun |
|  | `[6.15, 6.5)` | Bloom grows 0→1, core grows 30→40 |
|  | `≥ 6.5` | Sun only |

The "flip" is implemented as `ctx.scale(Math.abs(scaleX), 1)` — but `Math.abs` makes it a *squash*, not a true mirror. So visually the body shrinks to zero width at the midpoint and re-expands; the mirror semantic in code is decorative. Could just be linear `1 - |2p-1|`.

## Dependencies

Imports:
- `Random` from `../utils/Random` ([[entities/Random]]).

Imported-by (inferred from project structure — not directly read):
- [[entities/Game]] (orchestrator) almost certainly instantiates `SkySystem`, calls `update` per frame and `draw` first in the render stack.
- Likely `TerrainSystem` / building renderers consume `getAmbientColor()` for [[concepts/AmbientLighting]].
- `main.ts` "Set time format" UI hinted at in the brief — likely formats `getTime()` for HUD display; SkySystem itself does **no** formatting.

## Complexity & hotspots

- **`getSkyColors` linear scan** — O(17) per call, called at minimum twice per frame (`getAmbientColor`, `draw`'s gradient). Negligible but trivially binary-searchable. Could also cache last bracket index.
- **`lerpColor` allocates** — calls `parse()` twice per channel call, builds two arrays, then a template string. Called 3 times per `getSkyColors`, so ≥6 string allocations/frame from sky alone. Hot-path GC noise.
- **Cloud `parts` count** — cumulus has 8–15 puffs, cirrus 5–12 strokes, stratus 3–7 layers. With 20 clouds that's ~120–200 path operations per frame, all `beginPath / arc|ellipse|rect / fill`. Manageable but the biggest draw-cost in this file.
- **`update` cloud splice + immediate `createCloud`** — splicing inside a reverse-iteration loop is safe but `createCloud` does many `rng.nextRange` calls and array pushes; spawning more than one per frame would matter. In practice clouds drift across the screen so the rate is tiny.
- **`bounds` semantics are fuzzy** — comments in `createCloud` literally debate whether `ctx.rect(p.x, p.y, p.w, p.h)` is corner- or centre-anchored ("If rect is x,y,w,h relative to center" — it's not; canvas `rect` is corner-origin). The stratus bounds use `minX = px`, `maxX = px + w` which assumes corner origin and matches the draw call. Cumulus uses centred circles. So bounds are *correct* but the inline reasoning in the comments is confused. See Surprises.

## Dualisms & duality patterns observed

The file is suffused with day/night duality. Exhaustive list:

1. **Day vs Night** — the entire keyframe arc loops through deep-night → dawn → day → dusk → night. Two endpoints (t=0, t=24) are literally identical to enforce the loop dualism.
2. **Sun vs Moon** — single celestial body slot rendered as either, never both. Shared `x, cy, scaleX` transform. The two are dual entities sharing one position — a literal one-slot polymorphism.
3. **Light vs Dark / Gold vs Pale** — sun core `#FFD700` (gold), moon core `#FEFCD7` (pale cream) with a `#E0E0E0` crater patch. Sun has a bloom halo; moon has a crater. Bloom is presence-of-light; crater is texture-of-absence.
4. **Bloom vs Core** — within the sun itself, halo (outer, soft, opacity-driven) vs core (inner, solid). Bloom only ever exists for the sun; the moon has neither bloom nor anti-bloom — only crater detail.
5. **Sunrise (t=6) vs Sunset (t=18)** — perfectly symmetric in code: `if (time > 12 && time < 24)` is the dusk branch, `else` is the dawn branch. Same `flipWin`, same `rayWin`, mirrored growth/decay. The two transitions are time-reversed clones.
6. **Bloom growth vs bloom fade** — `currentBloom = p` (dawn) vs `currentBloom = 1 - p` (dusk). Core growth 30→40 vs core shrink 40→30. Direct reflection.
7. **Top vs Bottom gradient** — every keyframe defines a `top` and a `bot` colour. Sometimes they invert dramatically (e.g. dusky orange at t=17.35: dark blue on top, hot orange on bottom — the literal stratification of sunset).
8. **Sky gradient vs Overlay tint** — `top/bot` paint the canvas; `overlay` is broadcast to *other* systems via `getAmbientColor()`. Two outputs of the same interpolation, two consumers (foreground vs background scene tinting). The overlay is the inversion of intuition: at midday it's white (`rgb(255,255,255)`) — i.e. transparent/neutral multiplier; at deep night it's `rgb(15,15,40)` — heavy multiplier. So overlay is *suppression of colour* during night, *passthrough* during day.
9. **Deterministic position vs Continuous time** — `time` is continuous (float), but `drawSun` is a Boolean derived from discrete window checks. The flip is a continuous squash but the identity swap is binary.
10. **Foreground sky vs Background sky** — `top` and `bot` literally are the dual halves; the gradient is the only interpolation between them.
11. **Seeded vs Unseeded determinism** — RNG is seeded with `Date.now()`. Therefore every page load is different and **nothing is reproducible**. Within a session the RNG is deterministic; across sessions it's not. This contrasts with other engine systems that may use string seeds for replayability.
12. **Random init vs Deterministic update** — cloud *content* (parts, sizes, opacities) is sampled from RNG once at spawn; cloud *kinematics* (x advancing by `speed * dt`) is fully deterministic each frame. Two-phase randomness.
13. **Cumulus / Cirrus / Stratus** — three cloud archetypes with three render strategies (arc / ellipse / rect). Triality nested inside the day/night dualism, but each has dual bounds: `minX/maxX` only (no Y bounds — the despawn check is X-axis only).
14. **`Math.abs(scaleX)` mirror that isn't** — the code computes `scaleX = cos(angle)` which goes 1 → -1 → 1 (would mirror at midpoint) but then `Math.abs` collapses that into a 1 → 0 → 1 squash. So intent (mirror) vs implementation (squash) is itself a dualism — likely an early "flip with mirror" idea that was softened.
15. **Despawn right, respawn left** — clouds vanish at the right edge and reappear at the left. The world "wraps" but the clouds don't — they're recycled. Compare with `time` which wraps in place.
16. **`#000000` darkest-night plateau** — t=2.5 and t=4.0 are both pure black on `top`. There's a flat region in the keyframe palette: this is the "void" anti-keyframe between two interpolations.
17. **Pad: `-150` to `w+150`** — the celestial body lives slightly *outside* the canvas at the extremes, so the sun is visibly "still rising" at t=6 and "still setting" at t=18 without snapping. Off-screen vs on-screen is itself a continuum here, not a hard boundary.
18. **`time` measured in hours vs `speed` measured in hours-per-`dt`-unit** — there's an implicit unit dualism. The comment "5x Slower" suggests prior speed was 0.5; the current 0.1 means `dt` must be in seconds for the cycle to feel like minutes. Real-time vs world-time is the most fundamental dualism in the file.

(15+ dualisms; the file lives up to its reputation.)

## Invariants

- `0 <= time < 24` after every `update` call (assuming `dt > 0`).
- Keyframe list is sorted strictly ascending by `t`, with `t[0] == 0` and `t[last] == 24`, and `colors[0] == colors[last]` so wrap is continuous.
- Exactly one celestial body is drawn per frame (sun XOR moon).
- Cloud count is constant: every despawn is paired with an immediate `createCloud(false)`. (Initial count = 20 from `initClouds`.)
- `cloud.x` is monotonically increasing per cloud lifetime; reset only on despawn.
- RNG advances forward only; never re-seeded after construction.
- `lerpColor` always returns a `rgb(r,g,b)` string (never `#hex`) regardless of input format.

## Surprises / risks / TODOs

1. **`_canvas` constructor param is unused.** The leading underscore hints "intentional", but nothing uses it. Could be removed or used to read live `canvas.width` instead of the magic `1920` in `initClouds`.
2. **`approxWidth = 1920`** for initial cloud distribution. On non-1920 viewports the initial cloud field is mis-spread. The first `update` does not re-distribute.
3. **Date.now() seed** breaks reproducibility/screenshot determinism. If [[concepts/Determinism]] matters elsewhere (terrain, seed-based generate command in 9a7c5df commit) — clouds and the start hour are out of sync with the rest.
4. **Moon arc goes subterranean.** `sin((t-6)·π/12)` is negative at night, multiplied by `-75` pushes `cy > 125`, so the moon literally floats *below* the horizon line of the celestial layer. Whether it's visible depends on viewport height (cy can grow to 200). Likely a "happy accident" rather than realistic celestial mechanics.
5. **Time wrap loses sub-tick precision.** `if (this.time >= 24) this.time = 0` discards the overflow remainder. At `speed * dt` magnitudes this is invisible but conceptually wrong — should be `this.time -= 24` or `% 24`.
6. **`lerpColor` is RGB-linear, not perceptual.** Sky transitions through muddy mid-tones during dusk; this is why the keyframes have to be so dense around 17.35–18.5 (5 keyframes in 1.15 hours) — to manually re-shape what HSL/OKLab would do for free. See [[concepts/ColorInterpolation]].
7. **`Math.abs(scaleX)`** destroys the intended mirror flip; the cosine math is doing more work than needed.
8. **`drawSun` initialized `(this.time > 6 && this.time < 18)`** then conditionally overwritten by branch logic. If `time == 6.0` exactly, sun won't draw because of strict `>`. Same at 18. Tiny edge-case flicker.
9. **Stratus rect anchoring confusion in comments** (lines 126–131): the author clearly wasn't sure if rect is corner or centred. The runtime works because draw and bounds use the same convention; the comment block lies about its own intent.
10. **Cumulus drawn opaque-white regardless of part opacity.** Only the cloud-level `c.opacity` matters; per-part `opacity` is set for cirrus/stratus but unused for cumulus. Mild inconsistency.
11. **Cirrus parts ignore stored `opacity`.** `ctx.fillStyle = 'rgba(255,255,255,0.4)'` is hardcoded inside the draw loop; the `opacity ∈ [0.2,0.5]` randomly assigned in `createCloud` is dead data.
12. **No moon phase / no stars.** Despite the brief mentioning "stars (if any)" — there are none. The night sky is purely gradient + a single static moon disc with one crater dot. This is a possible TODO/expansion.
13. **No atmospheric haze beyond gradient.** The "overlay" is exported but not painted by SkySystem itself; it relies on consumers (`getAmbientColor()`).
14. **Performance: full re-parse of hex on every frame.** `lerpColor` parses keyframe strings every call; keyframes could be pre-parsed to `[r,g,b]` tuples at construction. Easy win.
15. **`flipWin = 0.15` hours** means the entire sun↔moon swap happens in 18 in-world minutes (≈1.5 real seconds at current speed). The swap is fast even at the "5x slower" tuning.

## Suggested wiki pages

- [[entities/SkySystem]] — class overview, public API, keyframes table, lifecycle diagram.
- [[concepts/TimeOfDay]] — the time model (0..24, advance rate, wrap, sub-units), references all systems that read it.
- [[concepts/AmbientLighting]] — how `getAmbientColor()` feeds the rest of the scene; the `overlay` channel of keyframes.
- [[concepts/ColorInterpolation]] — RGB-linear lerp, why HSL/OKLab might be better, hex vs rgb dual format.
- [[concepts/CelestialBody]] — the single-slot sun/moon polymorphism, arc math, flip transition.
- [[concepts/SunMoonFlip]] — the four-stage transition state machine (ray fade / flip / ray grow), the `scaleX` squash, mirrored dawn/dusk.
- [[concepts/Clouds]] — three archetypes, parts model, kinematics, bounds-based despawn-recycle.
- [[concepts/Dualisms]] — meta-page collecting all duality patterns across the codebase, anchored on SkySystem's day/night spine.
- [[decisions/SeedFromDateNow]] — why SkySystem opts out of reproducibility, when it matters.
- [[questions/Why-does-moon-arc-below-horizon]] — diagnostic; either intentional ("it's not really the moon's path") or bug.
- [[questions/Where-is-time-format-UI]] — cross-reference into `main.ts` for HUD formatting.
