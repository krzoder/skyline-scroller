# Agent 03 — src/engine/Terminal.ts

In-game developer console / cheat terminal. Single file, 596 LOC, no sibling files in scope. Owns a command registry, an autocomplete engine, and a tiny confirmation state machine for destructive `reset`. UI rendering is **out of scope** — Terminal only emits strings via callbacks supplied by the caller.

Wikilinks used freely: [[entities/Game]], [[entities/CityGenerator]], [[entities/BiomeSystem]], [[entities/TreeConfig]], [[entities/Tree]], [[concepts/Terminal-DSL]], [[concepts/Autocomplete-Engine]], [[concepts/Command-Pattern]], [[decisions/Function-constructor-for-speed-math]].

## Files scanned

- `/Users/fszalaj/Documents/git/skyline-scroller/src/engine/Terminal.ts` (596 LOC, read in full)
- Auxiliary cross-checks (one-line greps, not full reads):
  - `/Users/fszalaj/Documents/git/skyline-scroller/wiki/.scan/_brief.md` (canonical headings)
  - `/Users/fszalaj/Documents/git/skyline-scroller/src/procgen/TreeConfig.ts` (to verify `flowerChance` semantics — the file comment explicitly says *"Only used for Cactus currently, but good to have generic"*)

## Public surface (exports/classes/functions/types)

### Exported types

| Symbol | Kind | Shape | Purpose |
|---|---|---|---|
| `CommandContext` | interface | `{ game: Game, output: (msg, isError?) => void, clear: () => void, onCommandExecuted?: () => void }` | Injected into every `execute` so commands stay decoupled from the host. |
| `AutocompleteSuggestion` | interface | `{ value: string, description: string }` | Pair of completion token + human-readable hint label. |
| `Command` | interface | `{ name, aliases[], description, usage, execute(args, ctx), autocomplete?(args) }` | The command record itself. `autocomplete` is **optional** — commands without it fall back to no suggestions. |
| `Terminal` | class | see below | Registry + dispatcher + suggester. |

### `Terminal` class

**Fields**
- `private commands: Map<string, Command>` — keyed by *both* canonical name and every alias (alias→same Command reference). All keys lower-cased.
- `private game: Game` — host reference.
- `public onOutput: (msg, isError?) => void` — print callback (caller appends to DOM).
- `public onClear: () => void` — clear-screen callback.
- `public onCommandExecuted?: () => void` — post-execution hook; the host uses this to scroll/refocus.
- `public pendingResetTarget: string | null` — the **only** piece of conversational state; currently only ever set to `'all'` and exposes `cancelPendingReset()` for the host to abort.

**Constructor**
```ts
new Terminal(game, onOutput, onClear, onCommandExecuted?)
```
Stores callbacks, then immediately calls `registerBuiltIns()`.

**Public methods**
- `registerCommand(cmd: Command)` — registers under name + each alias (lower-cased).
- `execute(input: string)` — main dispatch. See [Control flow](#control-flow).
- `getSuggestions(input: string): AutocompleteSuggestion[]` — autocomplete entry point.
- `cancelPendingReset()` — clears `pendingResetTarget`.

**Private**
- `registerBuiltIns()` — registers the 12 built-in commands (counting `gen` as alias of `generate`, and pause/play/resume as one).
- `executeResetConfirm(target)` — runs the actual factory reset; currently only handles `'all'`.

## Internal state

There is effectively **one bit** of mutable state: `pendingResetTarget`. Everything else delegates to `Game`. The pattern is:
- Command runs → mutates `Game` (timeScale, volume, muted, seed, timeFormat, treeConfig, generator.config) → optionally calls `setSeed(getSeed())` to force a deterministic regen.
- Output is pure side-effect through `onOutput`.

The `commands` map double-indexes — iterating expects callers to filter by `name === cmd.name.toLowerCase()` (see line 109 and line 158) to skip alias entries. Forgetting this would yield duplicated suggestions; the helpers do filter, but it's an undocumented invariant of the map shape.

## Control flow

### `execute(input)` state machine

```
input
  ├─ empty? → return
  ├─ echo "> input"
  ├─ pendingResetTarget set?
  │     ├─ "y"|"yes" → executeResetConfirm(target); clear pending; return
  │     └─ other     → "Reset aborted. Executing normally..."; clear pending; FALL THROUGH
  ├─ tokenise on \s+; cmdName = args.shift().toLowerCase()
  ├─ lookup commands.get(cmdName)
  │     ├─ hit  → try { cmd.execute(args, ctx) } catch { output(error, true) }
  │     │        then call onCommandExecuted
  │     └─ miss → "Unknown command: '<name>'. Type 'help' for ..."
```

Important nuance at lines 60-71: a **non-yes** response when a reset is pending does *not* halt — it prints "Executing normally..." and continues to dispatch the typed input as a fresh command. This is the only "modal" piece of the terminal and is deliberately leaky.

### `getSuggestions(input)` algorithm (lines 98-126)

1. Empty (after `trimLeft`) → `[]`.
2. Tokenise with `input.match(/\S+/g)`; capture `endsWithSpace = /\s$/.test(input)`.
3. **One token, no trailing space** → autocompleting the command name itself. Iterate the entries, filter `name === cmd.name.toLowerCase()` (skips aliases), filter `name.startsWith(partial)`. Sort alphabetically. Return.
4. **Otherwise** → first token is the command; look it up. If the command has `autocomplete`:
   - `partialArg = endsWithSpace ? "" : last token`
   - `completedArgs = endsWithSpace ? all-args-after-cmd : all-args-after-cmd-except-last`
   - Call `cmd.autocomplete(completedArgs)`.
   - Filter `s.value.toLowerCase().startsWith(partialArg.toLowerCase())`.
   - Sort alphabetically.
5. No `autocomplete` on the command → `[]`.

This is the **context-aware** part: each command decides for itself what to suggest based on argv-so-far. See `generate`'s autocomplete, which branches on `args.length === 0` to either offer tree types or key:value pairs.

### Terminal lifecycle "state machine"

It is not an explicit FSM in code, but in behaviour:

```
idle ──type── typing ──Tab── suggesting (host renders list) ──Enter── executing
   ↑                                                                       │
   └──── output (callback to host appends line) ───────────────────────────┘

[any state] ──`reset` no-arg── awaiting-confirm ──y|yes── executing(resetAll)
                                                ──other── output("aborted"), then dispatch the typed input
```

Idle/typing/suggesting transitions live entirely in the host UI — Terminal only exposes `getSuggestions` and `execute`. The only state Terminal actually owns is `awaiting-confirm` via `pendingResetTarget`.

## Command grammar — complete reference

Twelve registered command records; counting aliases, ~20 invocable tokens.

| Canonical | Aliases | Usage | Read/Write | Effect |
|---|---|---|---|---|
| `help` | `?`, `h` | `help [command]` | read-only | Lists unique commands or shows one. Output line per cmd: `name(10-pad) - description \| usage`. With unknown arg → error. With >1 arg → error. |
| `seed` | `s` | `seed [value\|random]` | read or write | No args → prints `Game.getSeed()`. `random` → generates `Math.floor(Math.random()*100000).toString()`. Other arg → passes raw string to `Game.setSeed(val)`. |
| `speed` | `spd` | `speed <value>` | read or write | No args → prints `Game.timeScale`. With arg(s) → joins on space, substitutes `π → Math.PI`, then **`Function(...)` eval** with all `Math` names destructured into scope. Clamps result to `[-10000, 10000]` and calls `setTimeScale`. |
| `pause` | `play`, `resume` | `pause [true\|false]` | write | No args → toggle: pause iff `timeScale !== 0`. `true` → setTimeScale(0). `false` → setTimeScale(1.0). |
| `volume` | `vol` | `volume <value>` | read or write | No args → `Math.round(Game.getVolume()*100)`. With number → clamped to `[0,100]`, divided by 100, `setVolume`. |
| `mute` | — | `mute [true\|false]` | write | No args → toggle `!getMuted()`. true/false explicit. Calls `setMuted`. |
| `format` | `fmt` | `format <24h\|12h\|score>` | read or write | No args → prints current. Sets `game.timeFormat` directly (no setter — direct field assignment). |
| `fullscreen` | `fs` | `fullscreen [true\|false]` | side-effect on `document` | Calls `document.documentElement.requestFullscreen()` / `exitFullscreen()`. Doesn't touch Game. Async — output awaits the promise. |
| `clear` | `cls`, `c` | `clear` | write (DOM) | Calls `ctx.clear()`. No args allowed. |
| `reset` | — | `reset [speed\|volume\|format\|seed\|generate]` | write | No arg → arms `pendingResetTarget = 'all'`, awaits y/yes. With subtarget → immediate reset of just that subsystem. `generate`/`gen` is dynamic-imported from `'../procgen/TreeConfig'` to grab `DEFAULT_TREE_CONFIG`. |
| `biome` | — | `biome <forest\|desert\|tundra\|plains\|city>` | **read-only despite the usage string** | Implementation rejects ANY argument (line 461: `if (args.length > 0)` → error). The execute body only prints `generator.getCurrentBiome()`. The usage string and autocomplete advertise a write API that does not exist. |
| `generate` | `gen` | `generate <type> [key:value]...` | read or write | Validates `type` against `['pine','oak','sequoia','bush','cactus','hedge']`. With only the type → prints current config row. With `key:value` tokens → mutates `game.treeConfig[type]`, then deep-clones to `game.generator.config` and calls `setSeed(getSeed())` to force live regen. Bare `true`/`false` tokens set `.enabled`. |

### `generate` key grammar (line 516-528)

- `true` / `false` → `enabled`
- `minHeight:<int>` → `parseInt`
- `maxHeight:<int>` → `parseInt`
- `flowerChance:<float>` → `parseFloat`
- `biomes:a,b,c` → comma-split into `BiomeType[]`
- Anything else → error, but **continues** processing remaining tokens (only `Unknown token` without `:` returns early; an unknown `key:value` just logs and skips).

### Confirmation flow (the only stateful command)

`reset` with no args → `pendingResetTarget = 'all'` → next `execute` call checks `y|yes` and calls `executeResetConfirm('all')`, which:
1. `setTimeScale(1.0)`, `setVolume(0.5)`, `setMuted(false)`, `timeFormat = '24h'`, randomize seed.
2. Dynamic-imports `TreeConfig` and deep-clones `DEFAULT_TREE_CONFIG` into `game.treeConfig` and `game.generator.config`.
3. Outputs "All settings and configurations factory reset!"

`executeResetConfirm` is hard-coded to only branch on `'all'` even though `pendingResetTarget` is typed `string | null` — every other subtarget bypasses the confirmation entirely.

## Dependencies (imports / imported-by)

**Imports**
- `type { Game }` from `./Game` — used for `ctx.game` and the constructor parameter.
- `type { TreeType }` from `./Tree` — used as a cast target in `generate` (line 491).
- `type { BiomeType }` from `../procgen/BiomeSystem` — used as a cast for `biomes:` arg parsing (line 521).
- **Dynamic import**: `import('../procgen/TreeConfig')` at runtime in `reset generate` (line 434) and in `executeResetConfirm` (line 582). Keeps `DEFAULT_TREE_CONFIG` out of the initial bundle.

**Imported by (indirect, expected)**
- Probably `Game` constructs and owns a `Terminal`, or a UI overlay does. The terminal expects [[entities/Game]] to expose: `getSeed/setSeed`, `timeScale`, `setTimeScale`, `getVolume/setVolume`, `getMuted/setMuted`, `timeFormat` (mutable field), `generator` (a [[entities/CityGenerator]]-shaped object with `.config` and `.getCurrentBiome()`), `treeConfig` (matching [[entities/TreeConfig]]).
- DOM API: `document.documentElement.requestFullscreen()`, `document.exitFullscreen()`, `document.fullscreenElement` — Terminal touches the DOM directly *only* for fullscreen.

**Interaction surface with Game's collaborators**
- `Game.generator.getCurrentBiome()` (read) — for `biome` command.
- `Game.generator.config = JSON.parse(JSON.stringify(...))` (write, deep-cloned) — for `generate` and `reset generate`.
- `Game.treeConfig[type]` (read+write) — for `generate`.
- `Game.setSeed(Game.getSeed())` (line 537) — used as a "force regen" trick: setting the same seed triggers internal canvas rebuild deterministically.

## Output rendering

Terminal **does not render**. It calls `onOutput(msg, isError?)` and `onClear()`. The host (a UI overlay outside this file) is responsible for:
- DOM insertion of each line.
- Distinguishing `isError === true` (likely red-styled lines).
- Scrolling / focus management — Terminal triggers `onCommandExecuted?` after each successful dispatch, intended as a "redraw / scroll-to-bottom / refocus input" hook.
- Maintaining and displaying the suggestion list (Terminal returns it; host paints it).

The only DOM API Terminal *itself* uses is the Fullscreen API (lines 369-380). That coupling is unfortunate but contained.

## Dynamic context — the commit-message claims

Commit `9a7c5df` mentions:
> *dynamic context-aware autocomplete, biome cmd read-only, flowerChance cactus-only, display labels for multi-word hints*

Verified in code:

1. **Dynamic context-aware autocomplete** — confirmed in `generate.autocomplete` (lines 539-565): branches on `args.length === 0` (offer the six tree types) vs anything else (offer key:value pairs). This is the only command whose suggestion list changes shape with argv depth. All other commands' autocompletes return suggestions only for `args.length === 0` and an empty array otherwise.
2. **biome cmd read-only** — confirmed. Lines 461-466: `execute` literally errors on any argument and only prints `generator.getCurrentBiome()`. But the `usage` string still claims `<forest|desert|tundra|plains|city>` (line 459) and the autocomplete still offers 6 values (lines 467-474). The usage string lies; the autocomplete is decorative.
3. **flowerChance cactus-only** — **NOT enforced in Terminal**. The autocomplete dictionary statically offers `flowerChance:0.0/0.5/1.0` for any tree type after position 0. The "cactus-only" semantics live in [[entities/TreeConfig]] (`flowerChance: number; // Only used for Cactus currently, but good to have generic`) and presumably in the rendering pipeline. Setting `flowerChance:1.0` on `pine` will silently succeed and store the value; it just won't render flowers. This is a divergence between the user-promised semantics and Terminal's UX.
4. **Display labels for multi-word hints** — confirmed. The `description` field of `AutocompleteSuggestion` is used everywhere as a multi-word hint label distinct from the completed token itself. Examples: `{ value: '0.0', description: 'Pause simulation (0x)' }`, `{ value: 'biomes:forest,plains', description: 'Limit exclusively to standard regions' }`. The split between `value` (token inserted) and `description` (label shown) is exactly the affordance the commit calls out: hints can be a free-text sentence even when the inserted token is a one-character number.

## Complexity & hotspots

- **`speed` command's `Function(...)` eval (lines 207-211)** is the largest risk surface in the file. It explicitly destructures every `Math` property into the eval scope. With `"use strict"` and no DOM access in scope it's contained, but it is still an arbitrary-code-execution channel inside the page's own origin. Documented in [[decisions/Function-constructor-for-speed-math]].
- **`generate.autocomplete` static dictionary (lines 540-564)** — 17 fixed suggestions. Not data-driven from `TreeConfig` or `BiomeType`. Adding a biome means editing both `TreeConfig` and this file; agents and humans will drift.
- **`commands` map dual-keys with aliases pointing at the same Command** — leaks into every iteration of the map. Filter pattern `name === cmd.name.toLowerCase()` is repeated twice (lines 109, 158) and silently buggy if forgotten.
- **`reset` confirmation FSM** — only the `'all'` branch goes through `executeResetConfirm`; the subtargets bypass confirmation entirely. The asymmetry is not obvious from `usage`.

## Dualisms & duality patterns observed

This file is *built* on dualities. Inventory:

| Axis | Pole A | Pole B | Where |
|---|---|---|---|
| **Read vs write** | `seed`/`speed`/`volume`/`mute`/`format` with no args print the value | same with args mutate | the no-arg branch in nearly every execute |
| **Read-only vs declared-write** | `biome` execute = read-only | `biome` usage + autocomplete declare write | lines 459 vs 461 — the *only* command whose advertised API differs from its implementation |
| **Query vs mutate** | `generate <type>` prints current config | `generate <type> key:val` mutates | line 506 vs 510 |
| **Confirm vs immediate** | `reset` no-arg → confirm | `reset <target>` → immediate | line 411 vs 416 |
| **Toggle vs explicit** | `pause`/`mute`/`fullscreen` no-arg toggles | with `true`/`false` arg sets explicitly | each of those three |
| **Canonical name vs alias** | `commands` map key === canonical name | key === alias | every registered command; filter pattern repeats |
| **Static dictionary vs dynamic context** | Most autocompletes return a fixed array when `args.length === 0` | `generate.autocomplete` switches shape with `args.length` | lines 540 vs 549 |
| **Value token vs display label** | `AutocompleteSuggestion.value` (inserted) | `.description` (rendered hint) | the whole `AutocompleteSuggestion` design |
| **Synchronous command vs async** | All commands sync | `fullscreen` (Promise from requestFullscreen) and `reset generate` (dynamic import) | lines 369-380, 434-441, 582-593 |
| **Domain logic vs DOM** | Terminal is pure logic | except fullscreen, which directly touches `document` | lines 358, 369, 375 |
| **Auto-completion vs validation** | Autocomplete offers `flowerChance:*` for every tree type | Tree config semantics: flowerChance only meaningful for cactus | dictionary vs TreeConfig comment |
| **Strict parsing vs lenient** | Unknown bare token → error and `return` (halts) | Unknown `key:value` → error and `continue` (proceeds) | lines 522-528 |
| **`game.setSeed(value)` vs `game.setSeed(game.getSeed())`** | First sets a new world | Second is a no-op-shaped force-regen trick | lines 184 vs 537 |
| **Confirmed-by-state vs immediate-by-target** | `pendingResetTarget` only branches on `'all'` | every other subtarget executes immediately | line 574 |

## Invariants

- All command-map keys are lower-cased; lookups always lower-case before `get`.
- `commands.get(name).name.toLowerCase() === name` ⟺ this entry is the canonical one (not an alias).
- `pendingResetTarget` is either `null` or a string the host must respond to before the next "real" command runs (currently always `'all'`).
- `Math.max(-10000, Math.min(10000, val))` envelope on `speed` is the only hard numeric clamp; `volume` is clamped `[0,100]`; `flowerChance` and heights are unclamped.
- `JSON.parse(JSON.stringify(...))` is used everywhere config is copied between `treeConfig` and `generator.config` — assumes the config is pure JSON-shaped (no functions, no Dates, no Maps).
- `execute()` always echoes the raw input *before* anything else, including before pending-reset interception. Even `y` shows up as `> y` in the log.
- `getSuggestions("")` and `getSuggestions("   ")` both return `[]`.

## Surprises / risks / TODOs

1. **Lying `biome` command**. Usage and autocomplete promise a write API; execute is read-only. Either the writer half should be implemented (`generator.setBiome(...)`) or the `usage` + autocomplete entries should be downgraded to a single `auto` hint.
2. **`Function(...)` eval in `speed`** is the largest risk. Mitigated by `"use strict"` and a Math-only destructure, but a malicious paste could still e.g. `1/0` or evaluate something like `(()=>{while(1);})()` — the 10000 cap on numbers doesn't prevent CPU lockups inside the eval.
3. **`generate flowerChance:*` advertised on every tree type** but only meaningful on `cactus` (per TreeConfig comment). Autocomplete should be filtered by `args[0]`.
4. **Bypass of confirmation for `reset speed|volume|format|seed|generate`** — the design says "destructive needs y/yes" but only `reset` (no arg) actually requires confirmation; `reset generate` blows away every tree config without a prompt.
5. **Non-yes after `pendingResetTarget` proceeds to dispatch** — typing `reset` then `pine` (intending to abort and run something else) prints "Reset aborted" *and* runs `pine` as a command — which doesn't exist and yields "Unknown command". Two output lines for one user action.
6. **Double-counted `commands` iterations** — every iteration of the map yields aliases too. The `name === cmd.name.toLowerCase()` filter is mandatory but easy to forget when adding new helpers.
7. **`fullscreen` couples Terminal to the DOM directly** instead of routing through `Game` or a callback. Breaks the otherwise-clean "Terminal is pure logic" abstraction.
8. **`onCommandExecuted` is fired twice** for the `'all'` reset path: once by the synchronous execute, once by `executeResetConfirm`'s async then-callback. Hosts that re-render on this hook may double-render.
9. **Unknown `key:value` continues, unknown bare token returns early** (lines 522-528) — asymmetric error recovery. Likely accidental.
10. **`game.timeFormat = '...'` direct field assignment** (no setter) — Terminal reaches into Game's internals. Inconsistent with the getter/setter pattern used for seed/volume/timeScale.

## Suggested wiki pages

- [[entities/Terminal]] — class reference, with the command table from this report as the centrepiece.
- [[concepts/Terminal-DSL]] — the `<type> [key:value]...` grammar of `generate`, plus the `π → Math.PI` and `Math.*`-in-scope conventions of `speed`.
- [[concepts/Command-Pattern]] — the `Command` record + `CommandContext` injection pattern; suitable as a generic note linked from other engine commands if more are added.
- [[concepts/Autocomplete-Engine]] — how `getSuggestions` works, the `value`/`description` split, the context-aware branching in `generate`.
- [[decisions/Function-constructor-for-speed-math]] — why `Function(...)` was chosen over a parser, the security mitigations, and the residual risk surface.
- [[decisions/Reset-confirmation-asymmetry]] — only `all` requires y/yes; subtargets don't. Document intent or fix.
- [[entities/CommandContext]] — small but worth a stub because it's the contract every future command will use.
- Cross-references from [[entities/Game]] (terminal mutates it), [[entities/CityGenerator]] (terminal writes `.config` and reads `.getCurrentBiome()`), [[entities/TreeConfig]] (deep-cloned for resets), [[entities/BiomeSystem]] (`BiomeType` used as a cast target), [[entities/Tree]] (`TreeType` cast target).
