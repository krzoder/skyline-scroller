---
name: Control Flow
description: Startup sequence, frame tick, event taxonomy, and the five state machines hiding in the codebase.
type: concept
---

# Control Flow

## Definition

The control-flow concept captures **how a frame happens** in skyline-scroller — from module load through DOM injection, through the RAF tick, into update/render, and back out to event handlers. It also enumerates the **five state machines** that emerged organically: only the Terminal FSM is explicit; the rest are implicit but real.

## Where it lives

| Domain | Anchor |
|---|---|
| Startup | `src/main.ts` (1894 LOC) top-level + `Game` constructor (`src/engine/Game.ts`) |
| Frame loop | `Game.loop / update / render` (`src/engine/Game.ts:146-258`) |
| Terminal grammar | `Terminal.execute / pendingResetTarget` (`src/engine/Terminal.ts:60-71`) |
| Sky FSM | `SkySystem.update / drawCelestialBody` (`src/engine/SkySystem.ts:161-401`) |
| Cloud lifecycle | `SkySystem.update / createCloud` (`SkySystem.ts:47, 141-182`) |
| Modal windows | `main.ts toggleWindow / Escape priority chain` (`main.ts:604-609, 1731-1770`) |
| Two-step confirm | `main.ts btnAdvReset / btnGenReset / Terminal.reset` |

## Why it matters

- The frame tick is the only "real" clock in the engine. Every system polls (no events fire on "frame elapsed", "biome changed", "cloud despawned"). Understanding the polling cadence is required to debug timing leaks (e.g. [[concepts/time]] D4).
- The DOM-state ↔ game-state mirror is bridged exactly once per command via `syncUIFromTerminal`. Without this back-pull, terminal commands would silently desync the UI.
- The Escape priority chain (Terminal → CustomGen → Advanced → Settings → PointerLock → Fullscreen) is the only documented modal-close ordering.

## Startup sequence

```mermaid
sequenceDiagram
    participant Module as main.ts (top-level)
    participant DOM
    participant Game
    participant RAF as requestAnimationFrame
    participant Sky as SkySystem
    participant Gen as CityGenerator

    Module->>DOM: import './style.css' (Vite injects)
    Module->>Module: register window 'error' handler
    Module->>DOM: querySelector('#app').innerHTML = template
    Module->>Game: new Game(canvas)
    Game->>Game: ctx = canvas.getContext('2d')
    Game->>Game: treeConfig = clone(DEFAULT_TREE_CONFIG)
    Game->>Game: initNoise() — 256x256 dither pattern
    Game->>Game: reset() (FIRST — with seed 'default')
    Game->>Gen: new CityGenerator(seed, 4, treeConfig)
    Game->>Sky: new SkySystem(canvas) (only if !isPreview)
    Module->>Game: setSeed(randomSeed)
    Game->>Game: reset() AGAIN (rebuilds layers+gen+sky)
    Module->>Game: start()
    Game->>RAF: requestAnimationFrame(loop)
    Note over Module: continues synchronously: ~60 listeners wired
    RAF->>Game: loop(t) — first frame
```

Two wrinkles: `reset()` runs **twice** on boot (once in ctor with seed "default", once after `setSeed`). The DOM is fully synchronous innerHTML injection — no `DOMContentLoaded` race because Vite serves the module synchronously.

## Frame tick

```mermaid
flowchart TD
    A[RAF fires loop t] --> B{isRunning?}
    B -->|no| Z[exit]
    B -->|yes| C[dt = t - lastTime / 1000]
    C --> D[safeDt = min dt, 0.1]
    D --> E[update safeDt * timeScale]
    E --> F[render]
    F --> G[RAF loop again]

    E --> E1[cameraX += cameraSpeed * dt]
    E --> E2[sky.update dt, logicalW]
    E2 --> E2a[time += 0.1 * dt; wrap at 24]
    E2 --> E2b[move each cloud; despawn off-right; spawn replacement]
    E --> E3[generator.generate layers, cameraX, logicalW]
    E --> E4[layers.forEach prune]
    E --> E5[DOM writes: ui-seed-val, ui-time-val]

    F --> F1[ctx.save; ctx.scale 1.6]
    F1 --> F2[sky.draw — gradient, sun/moon, clouds]
    F2 --> F3[translate 0, groundY; layers.draw each]
    F3 --> F4[earth fillRect]
    F4 --> F5[ambient overlay multiply]
    F5 --> F6[noise dither pattern]
    F6 --> F7[ctx.restore]
```

Hot costs per frame: 4× layer draw (largely opaque since pixels are cached, see [[concepts/entity-caching]]), 1× sky gradient + ~20 clouds + sun/moon, 1× full-screen multiply overlay, 1× full-screen noise dither.

## State machines

Five FSMs, listed by explicitness.

### SM1 — Terminal grammar (most explicit)

`Terminal.execute()` plus the `pendingResetTarget` field form a real micro-FSM.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Dispatching: execute(input)
    Dispatching --> Idle: cmd found and runs
    Dispatching --> Idle: unknown cmd (error)
    Dispatching --> AwaitingResetConfirm: cmd=reset (no args)
    AwaitingResetConfirm --> Idle: next input = y/yes (reset all)
    AwaitingResetConfirm --> Dispatching: next input = anything else (cancel + run)
    Idle --> Idle: cancelPendingReset() — terminal closed
```

### SM2 — SkySystem time-of-day & celestial body

`SkySystem.time` ∈ [0, 24). Several derived phases interpolate between 17 hard-coded keyframes. The celestial body has a phase machine around 06:00 and 18:00:

```mermaid
stateDiagram-v2
    [*] --> FullNight
    FullNight --> SunriseFlip: t = 6 - flipWin (5.85)
    SunriseFlip --> SunriseGrow: t = 6 + flipWin (6.15)
    SunriseGrow --> FullDay: t = 6 + rayWin (6.5)
    FullDay --> SunsetFade: t = 18 - rayWin (17.5)
    SunsetFade --> SunsetFlip: t = 18 - flipWin (17.85)
    SunsetFlip --> FullNight: t = 18 + flipWin (18.15)
    FullNight --> FullNight: wrap at 24 -> 0
```

States control `drawSun` boolean, `currentCore` radius (30↔40), `currentBloom` (0..1), and `scaleX` (cosine flip — see [[concepts/dualisms]] #6).

### SM3 — Cloud lifecycle (per-cloud)

```mermaid
stateDiagram-v2
    [*] --> Drifting: createCloud()
    Drifting --> Drifting: x += speed*dt each tick
    Drifting --> Despawned: cloudMinPixel > logicalW
    Despawned --> [*]: splice; createCloud() pushes new one
```

Constant ~20 clouds maintained. Despawn = "left edge past right edge of screen" (left-to-right wind).

### SM4 — Modal window visibility

`main.ts` treats `.visible` class as the state. Three windows are mutually exclusive in practice (settings/advanced/customGen). Terminal bar uses `style.display='flex'` instead.

```mermaid
stateDiagram-v2
    state UIWindows {
        [*] --> AllClosed
        AllClosed --> Settings: btn-settings / 's'
        AllClosed --> Advanced: 'a'
        AllClosed --> CustomGen: btn-custom-gen / 'g'
        AllClosed --> Terminal: btn-terminal / 't' / Enter
        Settings --> Advanced: btn-advanced (closes Settings)
        Settings --> AllClosed: outside click / Esc / 's'
        Advanced --> AllClosed: btn-adv-close / Esc / 'a'
        CustomGen --> AllClosed: btn-gen-close / Esc / 'g'
        Terminal --> AllClosed: btn-terminal / Esc / 't'
    }
```

**Escape priority chain** (highest first): Terminal → CustomGen → Advanced → Settings → pointerLock → native fullscreen exit. Sequenced `if … return` ladder in `main.ts:1731-1770`.

### SM5 — Two-step confirm buttons

Two near-identical state machines for "Reset Default" (Custom-Gen + Advanced):

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Confirming: click btn
    Confirming --> Idle: 2nd click (perform reset)
    Confirming --> Idle: any other click in window (cancelXxxConfirm)
    Confirming --> Idle: 3 second timeout (Advanced only)
```

Advanced uses a `setTimeout(cancelAdvResetConfirm, 3000)`. Custom-Gen has no timeout, only click-outside-cancel. Note: the Advanced timer handle is **not stored** — it can leak if the user confirms within 3s (benign).

## Counter-examples

- **Polled, not event-driven.** No event fires on "biome changed", "frame elapsed", "cloud despawned". Everything is checked each tick. Listing this as the inverse of explicit FSMs: most of the engine is *implicit* state evolved by polling.
- **Two `btnGenApply` handlers** are registered (`main.ts:698` and `:1369`). Both run on Apply. Refactor remnant.
- **No `removeEventListener` anywhere.** Listeners live for the page lifetime. `previewGame` keeps running its RAF loop after the custom-gen window closes.

## Invariants

- `game.isRunning` is a one-way latch: flipped on `start()`, off only in error or `dispose()`. Pause = `timeScale = 0`, not `isRunning = false`.
- `safeDt = min(dt, 0.1)` — no sim step longer than 100 ms regardless of `timeScale`. A 10× speed run after backgrounding still only catches up 1 second of sim per frame.
- Sky time always in `[0, 24)`. Wrap at 24 → 0 (explicit `if`, not modulo).
- Cloud count is approximately constant at 20.
- Terminal command names are unique; aliases share the `Command` object. `getSuggestions` filters `name === cmd.name.toLowerCase()` to avoid showing aliases as suggestions (#108 in [[concepts/dualisms]]).
- DOM is fully constructed before any handler runs.
- `setSeed` always triggers full `reset()` — even with the same seed (used by `btn-gen-apply` to reload tree config).

## See also

- [[entities/Game]] — engine façade + RAF loop
- [[entities/Terminal]] — command grammar + autocomplete
- [[entities/SkySystem]] — time-of-day FSM + cloud lifecycle
- [[concepts/time]] — three time domains (D4)
- [[concepts/dualisms]] — DOM-state vs game-state (the big tension)
- [[decisions/DEC-04-main-decomposition]] — proposed main.ts split
