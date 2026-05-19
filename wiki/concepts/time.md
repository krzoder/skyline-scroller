---
name: Time Domains
description: Three (really four) coexisting time domains — wall clock, frame delta, world-x clock, sky-time — and where they leak into each other.
type: concept
---

# Time

## Definition

skyline-scroller runs four distinct clocks that **never** pin each other:

| Domain | Unit | Source | Affects |
|---|---|---|---|
| Wall clock | ms (real) | `performance.now()` via RAF | `dt` computation only |
| Frame `dt` | seconds (scaled) | `(t - lastTime)/1000`, capped at 0.1, then `* timeScale` | `update(dt)` → camera motion, sky time, cloud motion |
| World-x clock | pixels of travel | `cameraX += cameraSpeed * dt` | Chunk gen horizon, in-world clock display (`score`), parallax view |
| Sky-time | 0..24 hours (wraps) | `time += speed(0.1) * dt`, `% 24` | Sky gradient lerp, sun/moon arc, ambient multiply tint |

Three is the user-facing count (the "time format" UI in [[entities/Terminal]] picks one of {score, 24h, 12h}); four is the implementation count once you separate wall clock from frame `dt`.

## Where it lives

| Domain | Anchor |
|---|---|
| Wall clock | `requestAnimationFrame` callback `t` parameter in `Game.loop` |
| Frame `dt` | `Game.loop` 146-154 (`(t - this.lastTime)/1000`, `Math.min(dt, 0.1)`) |
| World-x clock | `Game.update:156` (`this.cameraX += this.cameraSpeed * dt`); `cameraSpeed=100` hard-coded |
| Sky-time | `SkySystem.update:161-183` (`this.time += this.speed * dt`, wrap at 24); `speed=0.1` game-hours per real second |
| Display format | `Game.update:189-205` (`timeFormat: 'score' \| '24h' \| '12h'`) |

## Why it matters

- **Decoupling is the point.** `timeScale` lets the user slow or speed *everything that uses `dt`* without affecting RAF cadence. Sky and camera both bend together; framerate stays at whatever the browser gives.
- **Sky-time loops, world-x grows unbounded.** A long session can drift between them — there is no enforced relationship.
- **The `safeDt = min(dt, 0.1)` clamp** ([[concepts/control-flow]]) protects the simulation from tab-inactive jumps. A 10× speed run after backgrounding still only catches up 1 second of sim per frame.

## Counter-examples (leaks between domains)

- **`BiomeSystem.update(1)` is called with a hard-coded `dx=1`** (`CityGenerator.ts:49`) — the variable name suggests "pixels of travel" but the value is "number of `generate()` ticks". `generate()` is called every frame but only *creates* chunks when `lastX < limit`. So biome decay is **frame-coupled**, not pixel-coupled as the variable name suggests. At low framerate, biomes last longer in both real time *and* world-x distance. Bug-shaped but benign at typical framerates. This is D4 in [[concepts/dualisms]].
- **`SkySystem` is seeded with `Date.now()`** (`SkySystem.ts:42`) — sky-time at boot is non-reproducible even with a fixed world seed. See [[concepts/determinism]].
- **`generate(layers, cameraX, viewportWidth)` does not accept `dt`** — any future time-based biome system can't be plumbed without changing the signature.
- **`setSeed` resets sky-time as a side effect** — `Game.reset()` constructs a new `SkySystem`, whose ctor draws a new random `time ∈ [0, 24)`. Applying a seed therefore randomises time-of-day even though the user only changed world geometry. See [[concepts/control-flow]] §3a.
- **Negative `timeScale`** is accepted by `Game.update` (the Advanced slider allows `[-10000, 10000]`). Sky-time, world-x, and clouds all go backwards. But `Layer.prune` only trims the left edge — buildings never *un*-spawn when scrolling backward. Risk: undefined behaviour at large negatives.
- **`Game.update` polls the DOM every frame** to write `#ui-seed-val` / `#ui-time-val`. This couples *display* time to the simulation tick (instead of event-pushing on change). Cheap, but the boundary between engine and DOM is fuzzy here. See [[concepts/side-effect-surface]].
- **Display format `'score'` shows `floor(cameraX)`** — so it's not even a clock, it's a distance counter. The UI conflates the world-x and sky-time domains under one label.

## Invariants

- Sky time always in `[0, 24)`. Wrap at 24 → 0 is explicit (`if`, not modulo).
- `cameraX` is monotone non-decreasing within a session (modulo negative `timeScale`).
- `safeDt ≤ 0.1` seconds for any sim step.
- `cameraSpeed` is constant at 100 px/s with no setter.

## How `timeScale` bends everything (and what it doesn't bend)

`timeScale` is the user-facing time-knob and acts as a single multiplier on `dt` before it's distributed:

- `cameraX += cameraSpeed * (dt * timeScale)` — world-x bends.
- `sky.update(dt * timeScale, …)` → `time += 0.1 * (dt * timeScale)` — sky-time bends.
- Cloud positions advance via the same `dt` — they bend.

What does **not** bend:

- The RAF cadence itself. `requestAnimationFrame` still fires at the browser's preferred rate.
- `setTimeout` / `setInterval` handles (e.g. the 3000 ms reset-confirm timer, the 1000 ms tree-icon redraw). These use real wall time.
- DOM event delivery. A user can still click during a `timeScale=0` pause.

So `timeScale=0` pauses the *simulation* but not the *UI*. The Advanced slider's range of `[-10000, 10000]` extends this far beyond reasonable values — the bug-shaped behaviour at large negatives is documented above.

## Display format and the "score" misnomer

The `timeFormat: 'score' | '24h' | '12h'` selector (`Game.update:189-205`) is the user-facing time UI. Two of the three are sky-time clocks; one is the world-x distance counter:

- `'score'` → `floor(cameraX)` formatted as an integer. Distance, not time.
- `'24h'` → sky-time formatted `HH:MM`.
- `'12h'` → sky-time formatted `HH:MM AM/PM`, with the `h % 12 || 12` zero-replacement guard.

The UI conflates "what kind of progression to display" under one label. This is a tertiary [[concepts/dualisms]] (#129) hiding a binary (gameplay-time vs immersion-time).

## See also

- [[concepts/control-flow]] — the frame tick that owns `dt`
- [[concepts/determinism]] — why sky-time is non-reproducible (intentional)
- [[concepts/chunking]] — why `BiomeSystem.update(1)` matters
- [[entities/Game]] — `lastTime / timeScale / cameraX / cameraSpeed`
- [[entities/SkySystem]] — the sky-time domain
- [[concepts/dualisms]] D4 — the world-x / sky-time tension
- [[concepts/dualisms]] #9, #10, #11, #12 — pause/play, ±timeScale, real/in-world, frame/safe-dt
