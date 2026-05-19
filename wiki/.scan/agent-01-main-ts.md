# Agent 01 — src/main.ts (UI shell + orchestration entry point)

## Files scanned

- `/Users/fszalaj/Documents/git/skyline-scroller/src/main.ts` (1894 LOC, read end-to-end)
- Brief: `/Users/fszalaj/Documents/git/skyline-scroller/wiki/.scan/_brief.md`

No other files opened — this report stays inside main.ts. Engine, Terminal, TreeConfig, BiomeSystem, Tree are referenced by name from imports but not read.

## Public surface (exports/classes/functions/types)

`main.ts` has **no exports**. It is a top-level script run by Vite on page load. Side-effects only.

What it imports:

- `./style.css` (CSS bundling side-effect)
- `Game` from `./engine/Game`
- `DEFAULT_TREE_CONFIG` from `./procgen/TreeConfig`
- type `TreeType` from `./engine/Tree`
- type `BiomeType` from `./procgen/BiomeSystem`
- `Tree` (class) from `./engine/Tree` (for icon rendering)
- `Terminal`, type `AutocompleteSuggestion` from `./engine/Terminal`

What it constructs:

- `game = new Game(canvas)` — single global game instance, primary world
- `previewGame: Game | null = new Game(previewCanvas, true)` — lazily-constructed preview instance (second `Game`, `isPreview=true`)
- `terminal = new Terminal(game, outFn, clearFn, syncUIFromTerminal)` — single terminal bound to the primary game

Notable top-level functions defined (all closures, no exports):

- `copyToClipboard(element, textFn)` — attaches click-to-copy with green flash feedback
- `applySeed()` — push seedInput value into game
- `updateResetButton(btn, isDefault)` — toggles `.default` / `.modified` CSS class on smart-reset buttons
- `updateTimeFormatUI()` — reflect `game.timeFormat` into the 3-button selector
- `getAdvSpeedFromSlider(sliderVal, center)` / `getSliderFromAdvSpeed(speed, center)` — non-linear mapping for the advanced speed slider (custom "0–1 slice" rule)
- `updateAdvSpeedUI(forceCenter?)` — re-render advanced speed slider + input from `game.timeScale`
- `executeAdvSpeedSet(val, recenter)` — single write path for adv speed
- `applyAdvInputText(valStr)` — evaluates arithmetic expression with `Math.*` in scope via `Function(...)` (small eval surface)
- `cancelAdvResetConfirm()` / `cancelResetConfirm()` — two parallel "confirm-then-act" guards (one for advanced reset, one for gen reset)
- `setGlobalVolume(val, fromMuteToggle)` — unified write path for volume + mute that also rewrites the speaker SVG
- `toggleWindow(el)` — toggles `.visible` class, returns new state
- `toggleFullscreen()` — vendor-prefixed fullscreen request/exit
- `openCustomGen()` — opens custom-gen window, lazy-builds `previewGame`, calls `renderTreeSettings()`
- `refreshPreview()` — re-syncs preview game's seed, treeConfig, forced biome
- `getTreeIconScale(type)` — per-TreeType scale for the 100×100 icon canvas
- `isTreeModified(type)` — deep-ish (per-field, sorted biomes, fuzzy flowerChance) compare against `DEFAULT_TREE_CONFIG`
- `updateTreeResetButton(type, btn?)` — paints the per-tree reset button yellow/red
- `renderTreeSettings()` — large idempotent renderer for the tree settings dropdown (incremental: appends only on first call, updates values on rerun)
- `getSpeedFromSlider(val)` / `getSliderFromSpeed(val)` — logarithmic mapping for the basic speed slider (10^val ↔ log10)
- `updateSpeed(speed)` — write-path for basic speed slider; also pushes into advanced slider via `updateAdvSpeedUI(true)`
- `renderTerminalHints()` / `updateTerminalHints()` — autocomplete strip rendering
- `syncUIFromTerminal()` — pulls game state back into every UI control after a terminal command mutates `game`
- `toggleTerminal()` — show/hide terminal bar + output + hints + focus dance

## Internal state

Module-scoped mutable state (all in closure of main.ts):

| Name | Type | Purpose |
|---|---|---|
| `globalSpeedUpdateCallback` | `((spd: number) => void) \| null` | Bridge from advanced-speed write path back to the basic slider |
| `currentAdvSpeedCenter` | `number = 1.0` | Center of the dynamic ±10 window for advanced speed slider |
| `isAdvResetConfirming` | `boolean` | First-click vs confirm state for global advanced reset |
| `isResetConfirming` | `boolean` | First-click vs confirm state for custom-gen reset |
| `isTreeSettingsOpen` | `boolean` | Tree settings dropdown collapsed/expanded |
| `iconIntervals: number[]` | array | Timer handles for the tree-icon animation loops (cleared on gen-window close) |
| `previewGame: Game \| null` | object | Offscreen preview game instance |
| `currentVolume` / `lastVolume` / `isMuted` | numbers + bool | Volume tri-state (current, restore-on-unmute, muted flag) |
| `terminalHintsList` / `terminalActiveHintIndex` | array, number | Autocomplete buffer + selection |
| `commandHistory: string[]` / `historyIndex` / `currentInputBuffer` | history navigation | Terminal up/down history with snapshot of the in-progress line |
| `isDragging` / `currentSpeedLog` / `MAX_LOG=1` / `MIN_LOG=-1` | gesture | Pointer-lock speed gesture state |
| `(window as any).volFadeTimer` | global handle | Volume-bar fade-out timer (stored on window to survive closure re-entry) |

The DOM itself is the other half of state — `.visible` classes on windows, slider `value` attrs, button `innerHTML`/`innerText`, and inline `style.background` on smart-reset buttons.

## Control flow

Approximate section layout:

| Lines | Section |
|---|---|
| 1–5 | Global `error` event handler (alerts on runtime errors — visible to user) |
| 7 | `Game` import |
| 9–229 | Massive `#app.innerHTML = ...` template literal — the entire UI shell is defined here as a single HTML string |
| 231–238 | Game construction, initial random seed, `game.start()` |
| 240–288 | Seed-display + legacy controls (set/random seed, click-to-copy seed/time) |
| 290–340 | Settings/Advanced DOM refs, `updateResetButton`, `updateTimeFormatUI` |
| 342–374 | Advanced window toggle + time format buttons + reset |
| 376–500 | Advanced speed slider/input system (non-linear mapping, recentering window, expression eval) |
| 502–530 | Two-click advanced global reset confirm |
| 532–573 | Volume state model + `setGlobalVolume` + speaker icon swap |
| 575–584 | Outside-click cancels confirm; close-advanced |
| 585–610 | Misc DOM refs + `toggleWindow` |
| 614–626 | Settings button toggle + click-outside dismissal |
| 628–653 | Fullscreen toggle (vendor-prefixed) |
| 655–711 | Custom-gen open/close + Apply (commit preview config into main game) |
| 712–738 | Late imports (`DEFAULT_TREE_CONFIG`, `TreeType`, `BiomeType`, `Tree`) and tree-settings scaffolding |
| 740–826 | Preview controls: random-preview-seed, biome select, refresh, pause/play, gen speed slider |
| 830–885 | Tree icon scaling + `isTreeModified` + per-tree reset button paint |
| 887–1310 | `renderTreeSettings()` — gigantic idempotent renderer (header, list, per-tree wrapper, checkbox, biomes, dual slider, height inputs, flower% for cactus) |
| 1318–1366 | Custom-gen reset confirm + outside-click cancel |
| 1369–1393 | Apply (duplicate of 698–711) + close + custom-seed Enter handler |
| 1397–1452 | Basic logarithmic speed slider (single slider 0.1×–10×) + double-click reset |
| 1455–1471 | Sound button (mute toggle), hover-popup volume slider |
| 1473–1596 | Terminal: imports, hints rendering, `syncUIFromTerminal`, Terminal constructor with callbacks |
| 1598–1656 | Terminal keydown: Tab cycle, Space accept, Enter submit, ArrowUp/Down history |
| 1658–1675 | `toggleTerminal` + init volume |
| 1677–1771 | Global keyboard shortcuts (`f`, `g`, `r`, `s`, `a`, `m`, `t`/Enter, `Escape`) with priority-order Escape close stack |
| 1773–1835 | Pointer-lock speed gesture (mousedown-hold → drag horizontally → exit) |
| 1837–1842 | Canvas double-click resets speed to 1× |
| 1844–1893 | Global wheel-scroll volume control + lazy-injected volume-visual bar |
| 1895 | Polish flavor comment ("Żadna komórka mózgowa nie ucierpiała…") |

The file is a single linear script — no IIFE, no top-level async, no DOMContentLoaded. It relies on Vite's defer / module loading order to make `document.querySelector('#app')` available immediately.

## Dependencies (imports / imported-by)

**Imports** (in order of appearance in the file):

1. `./style.css` — line 1
2. `./engine/Game` (`Game`) — line 7
3. `./procgen/TreeConfig` (`DEFAULT_TREE_CONFIG`) — line 712 (lazy, mid-file)
4. `./engine/Tree` (type `TreeType`) — line 713
5. `./procgen/BiomeSystem` (type `BiomeType`) — line 714
6. `./engine/Tree` (class `Tree`) — line 735 (second import of same module, this time the runtime class)
7. `./engine/Terminal` (`Terminal`, type `AutocompleteSuggestion`) — line 1474

Notably, **imports are not all at the top** — `DEFAULT_TREE_CONFIG`, `Tree`, `Terminal` are imported mid-file at the section that uses them. ES modules hoist imports anyway, so this is purely stylistic, but it signals the file grew organically.

**Imported-by**: none. `main.ts` is the Vite entry. Nothing should import from here. See `[[entities/Game]]` and `[[entities/Terminal]]` for what depends on what main.ts touches.

DOM IDs touched (informally a "DOM API surface"): `#app`, `#ui-layer`, `#seed-display`, `#ui-seed-label/val`, `#ui-divider`, `#ui-time-label/val`, `#controls`, `#seed-input`, `#set-seed-btn`, `#random-seed-btn`, `#bottom-right-controls`, `#btn-terminal`, `#sound-container`, `#volume-popup`, `#volume-slider`, `#btn-sound`, `#icon-sound`, `#settings-window`, `#btn-fullscreen`, `#btn-custom-gen`, `#btn-advanced`, `#speed-slider`, `#advanced-window`, `#time-fmt-selector`, `#btn-reset-time-fmt`, `#adv-speed-slider`, `#adv-speed-input`, `#btn-reset-adv-speed`, `#btn-adv-reset`, `#btn-adv-close`, `#btn-settings`, `#custom-gen-window`, `#gen-controls`, `#custom-seed-input`, `#custom-biome-select`, `#btn-random-preview-seed`, `#tree-settings-dropdown-container`, `#gen-preview-container`, `#gen-preview-canvas`, `#preview-control-bar`, `#gen-speed-slider`, `#btn-gen-pause`, `#icon-gen-pause`, `#btn-gen-refresh`, `#btn-gen-reset`, `#btn-gen-apply`, `#btn-gen-close`, `#terminal-output-container`, `#terminal-bar`, `#terminal-hints-container`, `#terminal-input`, `#gesture-slider-container`, `#gesture-speed-val`, `#gesture-slider-bar`, `#game-canvas`, plus dynamic per-tree IDs `#tree-wrapper-${type}`, `#cb-${type}`, `#reset-${type}`, `#biomes-${type}`, `#h-min-${type}`, `#h-max-${type}`, `#slider-min-${type}`, `#slider-max-${type}`, `#track-${type}`, `#icon-${type}`, `#extra-${type}`, `#flower-${type}`, `#flower-val-${type}`, `#tree-settings-header`, `#tree-settings-toggle`, `#tree-settings-reset-all`, `#tree-settings-list`, plus lazy-injected `#volume-visual-container`, `#volume-visual-bar`.

`Game` API consumed by main.ts (so the rest of the engine is implicitly stable around these):

- `new Game(canvas, isPreview?)`, `.start()`, `.resize()`
- `.setSeed(s)`, `.getSeed()`
- `.timeScale` (read/write), `.setTimeScale(n)`
- `.timeFormat` (read/write — `'24h' | '12h' | 'score'`)
- `.setVolume(0..1)`, `.getVolume()`, `.setMuted(b)`, `.getMuted()`
- `.treeConfig` (read/write, copied via `JSON.parse(JSON.stringify(...))`)
- `.generator` (object with `.config` and `.forceBiome(biome)`)
- `.getCameraX()`, `.setCameraX(x)` (preview camera preservation)

## Complexity & hotspots

**Top complexity hotspots, ranked**:

1. **`renderTreeSettings()` (lines 887–1310, ~420 LOC)** — The single biggest function. Builds + updates a complex dropdown UI per tree type, each row has: animated icon canvas (100×100 with `setInterval` loop), checkbox, biome chip multi-select, dual-thumb height slider with custom CSS track, numeric min/max inputs, and a conditional flower% slider for cactus. It's "idempotent" — first call creates elements, subsequent calls update values — but the idempotency is by-hand: lots of "if element exists, skip create" branches, and event handlers are bound via `.onclick = ...` (which replaces, vs `addEventListener` which would stack). Dual-slider visual math (lines 1206–1210) does manual thumb-width compensation via `calc(${p1}% + 8px - ${p1 * 0.16}px)` — empirical, fragile.

2. **Advanced speed mapping `getAdvSpeedFromSlider` / `getSliderFromAdvSpeed` (lines 386–430)** — Custom non-linear mapping with three regions: `[minS, 0]` mapped to slider `[0, 100]`, `[0, 1]` mapped to `[100, 500]`, `[1, maxS]` mapped to `[500, 1000]`. The "0–1 slice" gets dedicated resolution. Plus a dynamic recentering window (`currentAdvSpeedCenter`). Hard to follow without a diagram. See `[[concepts/speed-mapping]]`.

3. **`syncUIFromTerminal()` (lines 1533–1562)** — The "pull all of game state back into UI" function. Hits five subsystems (basic speed slider, advanced speed UI, volume, mute, tree-config preview, time format, optional renderTreeSettings+refreshPreview). It's the inverse-write-path for every UI knob and is currently a flat numbered list of "extract X into Y". The comments are deliberately over-formal ("Extract Native Volume State, converting floats to generic integer arrays") which reads almost satirical.

4. **Global Escape priority stack (lines 1731–1770)** — A priority-ordered close stack: Terminal > custom-gen > advanced > settings > pointer-lock > (fall through to native fullscreen exit). Each branch returns early. Functionally correct, but order is implicit in source-order and there's no shared abstraction; adding a new modal means editing this branch.

5. **The 220-line `innerHTML` template (lines 9–229)** — All UI shell is built as one string. Inline styles are pervasive (vs `style.css`), which doubles the styling surface. Refactor candidate: split into `template.html` partial or per-component functions.

**What I would refactor with budget**:

- Extract a generic `Window` abstraction (visible class, toggle, esc-to-close priority registry) — currently three near-identical windows each with bespoke open/close logic and double-bound apply listeners.
- The custom-gen Apply handler is registered **twice** (line 698 and line 1369) — both fire on click. Same body. Almost certainly a leftover bug.
- Volume tri-state (`currentVolume`, `lastVolume`, `isMuted`) — collapse into a small finite-state object with `mute()`, `unmute()`, `set(v)`. The current branching in `setGlobalVolume` is correct but reads as folklore.
- The advanced speed slider's `Function(\`"use strict"; ...\`)()` for arithmetic input (line 470) is a deliberate mini-eval. Probably fine since it's local-only, but documented as risk below.
- Inline SVG strings duplicated between play/pause and mute/unmute should be hoisted to constants.
- `renderTreeSettings` should accept a `type`-scoped sub-renderer and iterate; right now everything is in one nested `forEach`.

## Dualisms & duality patterns observed

This file is **the** dualism showcase of the repo. Counted explicitly:

1. **Default vs Modified** (the canonical pattern) — every smart-reset button (`btn-smart-reset.default` vs `.modified`). Functions: `updateResetButton`, `updateTreeResetButton`, `updateGlobalResetButton`. Yellow when default, red when modified. Repeated for: time format, advanced speed, per-tree config, global tree config. See `[[concepts/default-vs-modified]]`.

2. **Slider vs Input** — every numeric knob has both a `<input type="range">` and a textual companion: `adv-speed-slider` ↔ `adv-speed-input`, `h-min-${type}` ↔ `slider-min-${type}`, `h-max-${type}` ↔ `slider-max-${type}`, gen speed ↔ (no companion, but `gestureSpeedVal` mirrors it). Two-way binding handled by `document.activeElement` guard so the focused control isn't overwritten mid-edit.

3. **Mute vs Unmute** — visible in `setGlobalVolume(0, true)` (toggle-mute branch) vs `setGlobalVolume(val, false)` (set-volume branch). State held in `isMuted` + `lastVolume` (the "remember last" half of the dualism). Icon swap is also dual: speaker-with-waves vs speaker-with-X.

4. **Fullscreen vs Windowed** — `toggleFullscreen()` branches on `document.fullscreenElement`. Vendor prefixes form a sub-dualism (`webkit`/`moz`/`ms`/standard).

5. **Advanced vs Simple** — two parallel settings windows: `settings-window` (simple: just speed slider + 3 icon buttons) and `advanced-window` (time format, advanced speed with eval, global reset). Mutual exclusivity is enforced by `settingsWindow.classList.remove('visible')` when opening advanced.

6. **Primary game vs Preview game** — `game` (the live world) vs `previewGame` (offscreen, `new Game(canvas, true)`). Same class, different lifecycle. Preview can run independently (its own `timeScale`, pause, refresh). Apply flow copies `previewGame.generator.config` → `game.treeConfig`. See `[[concepts/preview-game-mirror]]`.

7. **Play vs Pause** — gen preview pause toggle (`previewGame.timeScale === 0` vs `> 0`). Icon swaps between double-rect and triangle SVG.

8. **First click vs Confirm** — two parallel "are you sure?" buttons, both implementing the same pattern but with separate state vars: `isAdvResetConfirming` (advanced reset) and `isResetConfirming` (gen reset). Click once → button turns darker red and says "Are you sure?" / "Confirm Reset?". Auto-cancels after 3s (advanced) or on outside-click. Two-click commits.

9. **Open vs Closed (windows)** — `.visible` class. `toggleWindow(el)` helper. Each window also has an open-handler (e.g. `openCustomGen` builds preview lazily) and a close-handler (e.g. `btnGenClose` clears `iconIntervals`). Asymmetric: open does more work than close.

10. **Visible vs Hidden (terminal bar)** — Terminal uses `style.display = 'flex'` vs `'none'` instead of `.visible` class (inconsistency with windows). Has its own toggle.

11. **Selected vs Deselected (button groups)** — `btn-selected` class on time-format buttons and biome chips. Inverted color scheme (background swap).

12. **Manual edit vs Programmatic update** — the `document.activeElement !== X` guard pattern, used to avoid overwriting a slider/input the user is currently dragging/typing. Applied at: `updateAdvSpeedUI`, `updateSpeed` (basic), `updateVisuals` (dual slider), `fInp` (flower%). Implicit dualism: focused vs unfocused control.

13. **Standard range vs Out-of-range** (advanced speed) — when speed is in `[0.1, 10]`, basic slider mirrors it; when outside, basic slider snaps to `"0"` and goes dead. See `globalSpeedUpdateCallback` lines 1425–1437.

14. **In-range vs Out-of-range (height slider)** — `minHeight`/`maxHeight` can be any value (numeric input), but the slider range is `[def*0.8, def*1.2]`. Inputs show actual value, sliders show clamped value. The dual-slider's `updateVisuals` clamps `Math.max(rangeMin, Math.min(rangeMax, v1))` for the slider thumb.

15. **Inside-input vs Outside-input keyboard** — global keydown handler (lines 1678+) checks `document.activeElement?.tagName === 'INPUT'` and changes behavior: when inside an input only Escape (and Enter) are intercepted; outside, the full shortcut alphabet (`f g r s a m t`) fires.

16. **Auto biome vs Forced biome** — `custom-biome-select` has `value === 'auto'` (let seed decide) vs explicit values (`forest`, `desert`, `tundra`, `plains`, `city`). When non-auto, `previewGame.generator.forceBiome(...)` is called.

17. **Enabled vs Disabled (per tree)** — `cb-${type}` checkbox on each tree type, written to `config[type].enabled`.

18. **Auto biome list vs Selected biome list** — each tree's `biomes` array is multi-select. Empty vs non-empty implicitly toggles "available everywhere" vs "restricted". Visual dualism: green/white chip vs grey chip.

19. **Hover-popup vs Persistent** — volume slider lives inside `#volume-popup` (`display:block` on `mouseenter`, `none` on `mouseleave`). Compare with `#settings-window` which is click-to-toggle.

20. **Lazy vs Eager DOM** — most DOM is in the initial `innerHTML` string. But two elements (`#volume-visual-container`, `#volume-visual-bar`) are lazily injected on first wheel-scroll. Tree settings header is appended on first `renderTreeSettings()`. Inconsistency.

21. **Game-time vs Real-time** — time format `'score'` (in-game/sim time) vs `'24h'`/`'12h'` (real wall-clock-style). Reflects a system-level dualism between simulation time and human time. See `[[concepts/time-format]]`.

22. **Read path vs Write path** — almost every setting has explicit "write to game" (event handler) and "read from game and reflect in UI" (`update*UI()`) functions. `syncUIFromTerminal` is the read-path bulk-invoke triggered after terminal mutations.

23. **Linear vs Logarithmic (speed mapping)** — basic slider uses log (`10^v`, `[-1,1] → [0.1,10]`). Advanced slider uses custom piecewise-linear with a "0–1 slice" carve-out. Two completely different curves for the same underlying variable.

24. **Snap vs Smooth (basic slider)** — basic slider auto-snaps to `0` (= 1× speed) when `|val| < 0.05`. Double-click also snaps to 1×. Otherwise smooth.

25. **Pointer-lock vs Normal cursor (gesture)** — holding mouse on `#game-canvas` for 200ms acquires pointer-lock and enters a relative-motion speed gesture. Releasing exits pointer-lock. Two completely different input modes from a single mousedown.

26. **Wheel-on-window vs Wheel-on-window-with-scrollable** — global wheel changes volume *unless* hovering a `.ui-window` or `#terminal-output-container` (which keep native scroll).

27. **Confirm-button color (red) vs Cancel-button (grey/blue)** — destructive vs neutral actions colored distinctly throughout (`#c62828` red for reset, `#2E7D32` green for apply, `#1565C0` blue for randomize, `#444` neutral grey for close).

28. **Stop-propagation vs Bubbling** — confirm buttons use `e.stopPropagation()` to prevent outer click-handler from cancelling their own confirm state. Implicit dualism in the event flow.

That's 28 distinct dualisms in a single ~1900-line file. Strong candidate for a `[[concepts/dualism]]` index page.

## Invariants

- A single `Game` instance owns the main canvas; the preview is a second `Game` constructed with `isPreview=true`. Both should remain alive concurrently while the gen window is open.
- `currentVolume`/`lastVolume`/`isMuted` must remain consistent: when `isMuted` is true, `currentVolume` is 0; `lastVolume` is the value to restore on unmute.
- `previewGame.generator.config` is the **source of truth** for the gen-window UI. `previewGame.treeConfig` is kept in sync via `JSON.parse(JSON.stringify(...))` clones. On Apply, the config is cloned again into `game.treeConfig`.
- The smart-reset button paint must reflect whether ANY of the relevant settings differ from defaults. `isTreeModified` handles float fuzziness for `flowerChance` (±0.001) and sorts `biomes` before stringifying.
- Terminal mutations to game state must trigger `syncUIFromTerminal` so all sliders/buttons reflect the new state. This is the one inverse-binding contract in the file.
- Keyboard shortcuts must be inert while an `<input>` is focused, except for Escape and Enter (the early-return at line 1693).
- Pointer-lock must be released when speed gesture ends (line 1832) or on Escape (line 1762).
- The dual-slider visual math assumes thumb width ≈16px and uses `calc(p% + 8px - p*0.16px)` — this assumption is fragile under CSS theme changes.

## Surprises / risks / TODOs

**Surprises**:

- **Global runtime error handler shows `alert()` (lines 3–5)**. This was almost certainly a debug aid that shipped. It will spam users on any uncaught exception. Definite TODO.
- **The custom-gen Apply listener is bound twice** (lines 698 and 1369). Both bodies are identical. Both fire on click. Bug or harmless redundancy depending on side-effects (`cancelResetConfirm` is called twice, `game.setSeed` is called twice). At minimum confusing.
- **`Function(\`"use strict"; const { ${Object.getOwnPropertyNames(Math).join(', ')} } = Math; return (${valStr}); \`)()`** at line 470–474. This is a deliberate arithmetic-expression evaluator for the advanced speed input — type "2*pi" or "Math.sqrt(10)" and it works. It's a tiny `eval`. Local-input-only, so the attack surface is "user pastes weird thing into their own browser", but worth a `[[concepts/safe-eval]]` note. Catches via empty `catch (e) {}` — silently swallows everything.
- **Import order is non-canonical** — `Game` at top, then `DEFAULT_TREE_CONFIG`/`TreeType`/`BiomeType` at line 712, then `Tree` at 735, then `Terminal` at 1474. ES module hoisting means it works, but it's stylistically unusual and suggests organic growth.
- **Comment at line 1895 is in Polish** and says (translated): "No brain cell was harmed in the production of this thing. The whole code is the work of a basilisk's quill. The green stuff is not commits, it's a representative amount of gibrzdyles utilized in the creative process." Author's self-mocking signoff.
- **Lazy DOM injection inside an event handler** (volume visual bar at lines 1866–1883). First wheel event after page load builds the bar; subsequent events update it. Order of operations is OK but the "lazy inject inside event handler" pattern is unusual when the HTML template is already 220 lines.
- **Time-format `'score'` is also the "in-game time" display** — labelled "Ingame Time" in the UI. Suggests `[[concepts/score-as-time]]`: score IS the elapsed sim time.
- **`btnGenPause.onclick = ...`** (line 801) and similar use `.onclick = ` not `addEventListener`. Subsequent re-binds would silently replace handlers. In `renderTreeSettings` this is intentional (idempotency). For the global gen controls it's incidental but works because they're bound exactly once.
- **`(game as any).setTimeScale?.(speed)`** at line 1418 — defensive optional-chain on a method we use unconditionally elsewhere (`game.setTimeScale(clamped)` at line 463 has no `?.`). Inconsistent type confidence.
- **`globalSpeedUpdateCallback` snaps the basic slider to "0" when speed is out of `[0.1, 10]`** (lines 1432–1436). "0" on the log slider means 1× speed, which is misleading — out-of-range should arguably show an indicator, not look like 1×. UX risk.
- **Three nearly-identical "open custom gen" code paths**: the `btnCustomGen` click handler, the `g` keyboard shortcut, and the `'Escape'` close branch. Each duplicates close-related cleanup.
- **`iconIntervals` is only cleared on `btnGenClose`** (line 690). If the window closes via Escape (which calls `btnGenClose.click()` at line 1743 — OK that re-triggers the same handler so it's fine) or via outside-click (which I don't see for gen window) — only one path exists and it works, but it's coupled.
- **The seed history is a simple `string[]` with `unshift`/`splice` dedupe** (lines 1624–1626). No bound on size. Long sessions slowly grow `commandHistory` unbounded. Minor leak.
- **Comment "Track Visuals (Accounting for 16px thumb width)"** (lines 1188–1211) is mostly a debug monologue left in the code, with the author talking to themselves.

**Risks**:

- Two-bound Apply (above) is the highest-confidence latent bug.
- The `alert()` error handler is a UX risk.
- The mini-eval is a (very small) security risk in unusual deployments (e.g., if seed/input is ever pre-populated from URL params and that URL is sharable).
- `(window as any).volFadeTimer` stashes a timer ID on `window` — namespace pollution.
- The hardcoded `Math.abs(current.flowerChance - def.flowerChance) > 0.001` in `isTreeModified` is `cactus`-specific; adding a new flower-bearing tree type would silently fall through the equality check.

**TODOs (explicit or implied by comments in the code)**:

- "Track" comment block (lines 1188–1204) is an unresolved CSS alignment discussion left in source. Should be cleaned up or replaced with a final implementation comment.
- "/* btnGenPreview removed */" (line 1395) — dead comment, referencing a removed feature.
- "Reset Logic - Maybe reset other params too in future" (line 1353) — explicit TODO.
- "Tree Config Logic … On Open: Sync UI with previewGame config (which starts as default)." (lines 729–731) — design note left as comment.

## Suggested wiki pages

Entities:

- `[[entities/Game]]` — single class, instantiated twice (live + preview), large API surface consumed here
- `[[entities/Terminal]]` — constructor signature surfaced (game, outFn, clearFn, syncFn)
- `[[entities/Tree]]` — used directly for icon rendering inside main.ts
- `[[entities/PreviewGame]]` — virtual entity, the "second instance of Game"

Systems:

- `[[systems/ui-shell]]` — main.ts is itself this system
- `[[systems/settings-windows]]` — three-window subsystem (settings, advanced, custom-gen)
- `[[systems/terminal]]` — input + output + hints + history + sync
- `[[systems/custom-generator]]` — preview canvas pipeline + apply commit
- `[[systems/tree-settings-editor]]` — `renderTreeSettings` and friends
- `[[systems/gesture-speed]]` — pointer-lock-based drag-to-speed
- `[[systems/scroll-volume]]` — wheel-anywhere volume control
- `[[systems/keyboard-shortcuts]]` — global `f g r s a m t` + Escape priority stack
- `[[systems/clipboard-copy]]` — `copyToClipboard` + click-to-copy seed/time/terminal lines

Concepts:

- `[[concepts/dualism]]` — index of every duality observed (28 in this file alone)
- `[[concepts/default-vs-modified]]` — smart-reset button pattern
- `[[concepts/slider-vs-input]]` — paired-control pattern + activeElement guard
- `[[concepts/preview-game-mirror]]` — live vs preview Game instance pattern
- `[[concepts/speed-mapping]]` — log vs piecewise mapping for the same variable
- `[[concepts/confirm-then-act]]` — two-click destructive-action pattern
- `[[concepts/escape-priority-stack]]` — modal/state close-order convention
- `[[concepts/determinism]]` — seed-driven game state, copy-seed + copy-time UX
- `[[concepts/safe-eval]]` — Math-scoped expression evaluator for numeric input
- `[[concepts/time-format]]` — `24h` / `12h` / `score` triad
- `[[concepts/score-as-time]]` — score IS sim-time
- `[[concepts/idempotent-render]]` — `renderTreeSettings`-style "build once, update on rerun" pattern

Decisions / open questions:

- `[[decisions/inline-html-template]]` — why the 220-line `innerHTML` string instead of separate HTML files or components
- `[[decisions/double-bound-apply]]` — is the duplicate `btnGenApply` listener intentional? (Almost certainly not.)
- `[[decisions/alert-on-error]]` — keep, suppress, or replace with non-modal toast?

Operations / runbooks:

- `[[operations/add-new-tree-type]]` — what files touch when adding a tree type (main.ts is one of them; the `allBiomes` list, `getTreeIconScale`, `isTreeModified` cactus carve-out all need touching).
