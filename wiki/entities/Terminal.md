---
name: Terminal
description: In-game developer console — command registry, dispatcher, and autocomplete engine.
type: entity
source: src/engine/Terminal.ts
loc: 596
---

# Terminal

## Role

The `Terminal` class is the headless brain of the in-game developer console / cheat terminal. It owns a command registry, a context-aware autocomplete engine, and a one-bit confirmation state machine for destructive `reset`. It does **not** render — all output flows through caller-supplied `onOutput` / `onClear` callbacks, keeping the class pure logic (with one exception: the `fullscreen` command touches `document` directly). Commands mutate the host [[entities/Game]] through a typed `CommandContext` injection, never by reaching outside the call.

## Public surface

Exported types:

- `CommandContext` — `{ game, output(msg, isError?), clear(), onCommandExecuted? }`. Injected into every `execute`.
- `AutocompleteSuggestion` — `{ value, description }`. `value` is the inserted token; `description` is the human-readable hint label (supports multi-word hints).
- `Command` — `{ name, aliases[], description, usage, execute(args, ctx), autocomplete?(args) }`.
- `Terminal` (class).

`Terminal` class:

- `new Terminal(game, onOutput, onClear, onCommandExecuted?)`
- `registerCommand(cmd)` — registers under name + each alias, all lower-cased.
- `execute(input)` — main dispatch / reset-confirm state machine.
- `getSuggestions(input): AutocompleteSuggestion[]` — context-aware autocomplete.
- `cancelPendingReset()` — host hook to abort an armed `reset`.
- `pendingResetTarget: string | null` — the only conversational state (currently always `'all'`).

## Internal state

There is effectively **one bit** of mutable state: `pendingResetTarget`. Everything else delegates to `Game`. The `commands` map double-indexes by canonical name *and* alias; iterations must filter `name === cmd.name.toLowerCase()` to skip aliases. This invariant is undocumented in the code and repeated by hand in two places (lines 109 and 158).

## Command grammar — complete reference

Twelve registered records, ~20 invocable tokens once aliases are counted.

| Canonical | Aliases | Usage | Read/Write | Effect |
|---|---|---|---|---|
| `help` | `?`, `h` | `help [command]` | read | Lists unique commands or shows one. |
| `seed` | `s` | `seed [value\|random]` | r/w | No args → `Game.getSeed()`. `random` → 5-digit random. Any string → `Game.setSeed(val)`. |
| `speed` | `spd` | `speed <value>` | r/w | No args → prints `timeScale`. With expr → `π → Math.PI`, then `Function(...)` eval with all `Math` names in scope. Clamps `[-10000, 10000]`. |
| `pause` | `play`, `resume` | `pause [true\|false]` | w | No args toggles. `true` → `setTimeScale(0)`. `false` → `setTimeScale(1.0)`. |
| `volume` | `vol` | `volume <value>` | r/w | No args → `Math.round(getVolume()*100)`. Number clamped `[0,100]`, /100, `setVolume`. |
| `mute` | — | `mute [true\|false]` | w | Toggle or explicit. |
| `format` | `fmt` | `format <24h\|12h\|score>` | r/w | Direct `game.timeFormat = ...` field assignment (no setter). |
| `fullscreen` | `fs` | `fullscreen [true\|false]` | DOM | Calls `document.documentElement.requestFullscreen()` / `exitFullscreen()`. Async. |
| `clear` | `cls`, `c` | `clear` | w (DOM) | Calls `ctx.clear()`. |
| `reset` | — | `reset [speed\|volume\|format\|seed\|generate]` | w | No arg → arms `pendingResetTarget = 'all'` awaiting y/yes. With subtarget → immediate reset. `generate` dynamic-imports `TreeConfig`. |
| `biome` | — | `biome <forest\|desert\|tundra\|plains\|city>` | **read-only** | Implementation rejects any argument (line 461). Usage and autocomplete lie — only prints `generator.getCurrentBiome()`. |
| `generate` | `gen` | `generate <type> [key:value]...` | r/w | Validates type against `['pine','oak','sequoia','bush','cactus','hedge']`. Mutates `treeConfig[type]`, deep-clones to `generator.config`, calls `setSeed(getSeed())` for force-regen. |

## Control flow

`execute(input)` state machine:

1. Empty → return.
2. Echo `> input`.
3. If `pendingResetTarget` set: `y|yes` → `executeResetConfirm`; otherwise print "Reset aborted. Executing normally…" and **fall through** to dispatch the typed input as a fresh command. The non-yes branch is deliberately leaky.
4. Tokenise on `\s+`, look up `commands.get(cmdName)`.
5. Hit → `try { cmd.execute(args, ctx) } catch { output(err, true) }`, then `onCommandExecuted?.()`.
6. Miss → "Unknown command: 'name'. Type 'help' for …".

`getSuggestions(input)` algorithm:

- Empty / whitespace-only → `[]`.
- One token, no trailing space → autocomplete the command name (filter aliases, sort).
- Otherwise → look up the command, call its `autocomplete(completedArgs)`, filter by `partialArg` prefix. `generate.autocomplete` is the only context-aware one — it branches on `args.length === 0` to offer tree types vs key:value pairs.

## Confirmed defects

Per Codex review:

- **`Function()` eval in `speed` (lines 207–211)**: CONFIRMED arbitrary-code-execution surface. Mitigated by `"use strict"` and Math-only destructure, but a malicious paste can still trigger CPU lockups (`while(1)`) inside the eval. See [[decisions/DEC-03-safe-eval-and-error]].
- Asymmetric reset confirmation — only `reset` (no arg) goes through confirm; `reset generate` blows away all tree configs without a prompt.
- `biome` usage string + autocomplete advertise a write API that does not exist.
- Unknown bare token returns early; unknown `key:value` continues — asymmetric error recovery in `generate`.
- `onCommandExecuted` fires twice on the `'all'` reset path (sync execute + async resolution of dynamic import).

## Dependencies

Imports:

- `type { Game }` from `./Game`.
- `type { TreeType }` from `./Tree`.
- `type { BiomeType }` from `../procgen/BiomeSystem`.
- Dynamic `import('../procgen/TreeConfig')` at runtime (lines 434, 582) — keeps `DEFAULT_TREE_CONFIG` out of the initial bundle.

Imported by: [[entities/main]] (constructs the single `Terminal` instance, supplies callbacks).

Touches DOM directly only via the Fullscreen API (lines 369–380).

## Invariants

- All command-map keys are lower-cased; lookups always lower-case before `get`.
- `commands.get(name).name.toLowerCase() === name` ⟺ canonical (not alias) entry.
- `pendingResetTarget ∈ { null, 'all' }` in practice (typed `string | null`).
- `speed` clamps `[-10000, 10000]`; `volume` clamps `[0, 100]`; heights and `flowerChance` are unclamped.
- `JSON.parse(JSON.stringify(...))` everywhere config is copied — assumes pure-JSON shape.
- `execute()` always echoes input *before* anything else, including before pending-reset interception. Even `y` shows as `> y`.

## See also

- [[entities/main]] — host shell; constructs the Terminal and renders its output / hints.
- [[decisions/DEC-03-safe-eval-and-error]] — `Function()` constructor for `speed`; alert-on-error replacement.
- [[decisions/DEC-04-main-decomposition]] — Terminal is one of the systems main.ts should decompose around.
- [[systems/terminal]] — input/output/hints/history/sync subsystem in main.ts.
- [[systems/ui-shell]] — the broader UI shell that hosts the terminal bar.
- [[concepts/dualisms]] — Terminal exhibits read/write, toggle/explicit, confirm/immediate, value/description, static/context-aware, canonical/alias dualisms.
