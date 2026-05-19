---
name: main
description: Vite entry script — UI shell, DOM wiring, terminal host, and orchestration of the live and preview Game instances.
type: entity
source: src/main.ts
loc: 1894
---

# main

## Role

`src/main.ts` is the Vite entry script. It has **no exports** — it runs top-to-bottom on page load and performs every side-effect needed to bring up the application: builds the entire UI shell via a single ~220-line `innerHTML` template, constructs the live [[entities/Game]] (and lazily a preview `Game`), wires every slider/button/window, instantiates the [[entities/Terminal]], handles global keyboard and gesture inputs, and maintains the inverse-binding (`syncUIFromTerminal`) that pulls game state back into the UI after terminal mutations. It is the host of [[systems/ui-shell]].

## Public surface

No exports. The file is a single linear script with no IIFE, no `DOMContentLoaded`, no top-level async — it relies on Vite's module defer for `document.querySelector('#app')` availability.

Notable top-level closures (host helpers, none exported):

- `copyToClipboard`, `applySeed`, `updateResetButton`, `updateTimeFormatUI`
- `getAdvSpeedFromSlider` / `getSliderFromAdvSpeed`, `updateAdvSpeedUI`, `executeAdvSpeedSet`, `applyAdvInputText` (mini Math-scoped eval)
- `cancelAdvResetConfirm` / `cancelResetConfirm` (two parallel confirm-then-act guards)
- `setGlobalVolume`, `toggleWindow`, `toggleFullscreen`
- `openCustomGen`, `refreshPreview`, `getTreeIconScale`, `isTreeModified`, `updateTreeResetButton`
- `renderTreeSettings` (~420 LOC idempotent renderer)
- `getSpeedFromSlider` / `getSliderFromSpeed`, `updateSpeed`
- `renderTerminalHints` / `updateTerminalHints`, `syncUIFromTerminal`, `toggleTerminal`

Constructs: one primary `game = new Game(canvas)`, one lazy `previewGame = new Game(previewCanvas, true)`, one `terminal = new Terminal(game, outFn, clearFn, syncUIFromTerminal)`.

## Internal state

Module-scoped mutable state lives entirely in the file's closure:

| Name | Purpose |
|---|---|
| `globalSpeedUpdateCallback` | Bridge from advanced-speed write path back to the basic slider. |
| `currentAdvSpeedCenter` | Center of the dynamic ±10 window for the advanced speed slider. |
| `isAdvResetConfirming`, `isResetConfirming` | Two parallel two-click confirm flags. |
| `isTreeSettingsOpen` | Tree settings dropdown collapsed/expanded. |
| `iconIntervals[]` | Timer handles for tree-icon animation loops (cleared on gen-window close). |
| `previewGame` | Lazy offscreen preview game. |
| `currentVolume`, `lastVolume`, `isMuted` | Volume tri-state. |
| `terminalHintsList`, `terminalActiveHintIndex` | Autocomplete buffer + selection. |
| `commandHistory`, `historyIndex`, `currentInputBuffer` | Terminal up/down history with in-progress snapshot. |
| `isDragging`, `currentSpeedLog`, `MAX_LOG`, `MIN_LOG` | Pointer-lock speed gesture state. |
| `(window as any).volFadeTimer` | Volume-bar fade timer (stashed on `window` to survive closure re-entry — namespace pollution). |

The DOM itself is the other half of state: `.visible` classes, slider `value` attrs, button `innerHTML`, inline `style.background` on smart-reset buttons.

## Control flow — section-by-line-range map

| Lines | Section |
|---|---|
| 1–5 | Global `error` event handler — **alerts on runtime errors** (debug aid that shipped). |
| 7 | `Game` import. |
| 9–229 | Massive `#app.innerHTML = ...` template literal — entire UI shell defined as one HTML string. |
| 231–238 | Game construction, initial random seed, `game.start()`. |
| 240–288 | Seed-display + legacy controls (set/random seed, click-to-copy seed/time). |
| 290–340 | Settings/Advanced DOM refs, `updateResetButton`, `updateTimeFormatUI`. |
| 342–374 | Advanced window toggle + time format buttons + reset. |
| 376–500 | Advanced speed slider/input system (non-linear mapping, recentering window, expression eval). |
| 502–530 | Two-click advanced global reset confirm. |
| 532–573 | Volume state model + `setGlobalVolume` + speaker icon swap. |
| 575–584 | Outside-click cancels confirm; close-advanced. |
| 585–610 | Misc DOM refs + `toggleWindow`. |
| 614–626 | Settings button toggle + click-outside dismissal. |
| 628–653 | Fullscreen toggle (vendor-prefixed). |
| 655–711 | Custom-gen open/close + Apply (commit preview config into main game). |
| 712–738 | Late imports (`DEFAULT_TREE_CONFIG`, `TreeType`, `BiomeType`, `Tree`) and tree-settings scaffolding. |
| 740–826 | Preview controls: random-preview-seed, biome select, refresh, pause/play, gen speed slider. |
| 830–885 | Tree icon scaling + `isTreeModified` + per-tree reset button paint. |
| 887–1310 | `renderTreeSettings()` — gigantic idempotent renderer. |
| 1318–1366 | Custom-gen reset confirm + outside-click cancel. |
| 1369–1393 | **Apply (duplicate of 698–711)** + close + custom-seed Enter handler. |
| 1397–1452 | Basic logarithmic speed slider (0.1×–10×) + double-click reset. |
| 1455–1471 | Sound button (mute toggle), hover-popup volume slider. |
| 1473–1596 | Terminal: imports, hints rendering, `syncUIFromTerminal`, Terminal constructor with callbacks. |
| 1598–1656 | Terminal keydown: Tab cycle, Space accept, Enter submit, ArrowUp/Down history. |
| 1658–1675 | `toggleTerminal` + init volume. |
| 1677–1771 | Global keyboard shortcuts (`f g r s a m t`/Enter, Escape) with priority-order Escape close stack. |
| 1773–1835 | Pointer-lock speed gesture (mousedown-hold → drag → exit). |
| 1837–1842 | Canvas double-click resets speed to 1×. |
| 1844–1893 | Global wheel-scroll volume control + lazy-injected volume-visual bar. |
| 1895 | Polish flavor signoff comment. |

## Confirmed defects

Per Codex review:

- **Duplicate Apply listener** (lines 698 and 1369): the custom-gen Apply click handler is bound **twice** with identical bodies. Both fire; `cancelResetConfirm` and `game.setSeed` are called twice per click. See [[decisions/DEC-04-main-decomposition]].
- **`alert()` error handler** (lines 3–5): the global runtime error handler invokes `alert()`, a debug aid that shipped. Spams users on any uncaught exception. See [[decisions/DEC-03-safe-eval-and-error]].
- Mini Math-scoped `Function(...)` eval at line 470 (advanced speed input arithmetic) — local-input-only but documented risk; catches silently swallow all errors.
- `globalSpeedUpdateCallback` snaps the basic slider to `"0"` when speed leaves `[0.1, 10]`, which looks like 1× (UX risk).
- `commandHistory` is unbounded — minor memory leak in long sessions.
- `(window as any).volFadeTimer` pollutes the global namespace.
- `isTreeModified`'s `flowerChance` fuzzy compare (±0.001) is cactus-specific; new flower-bearing tree types would silently fall through equality.

## Dependencies

Imports (non-canonical order — `Game` at top, others mid-file at the section that uses them):

1. `./style.css` (line 1)
2. `./engine/Game` (line 7)
3. `./procgen/TreeConfig` — `DEFAULT_TREE_CONFIG` (line 712)
4. `./engine/Tree` — type `TreeType` (line 713)
5. `./procgen/BiomeSystem` — type `BiomeType` (line 714)
6. `./engine/Tree` — class `Tree` (line 735)
7. `./engine/Terminal` — `Terminal`, type `AutocompleteSuggestion` (line 1474)

Imported by: nothing — `main.ts` is the Vite entry.

`Game` API consumed: `new Game(canvas, isPreview?)`, `.start()`, `.resize()`, `setSeed/getSeed`, `timeScale` (r/w), `setTimeScale`, `timeFormat` (r/w), `setVolume/getVolume`, `setMuted/getMuted`, `treeConfig`, `generator.config`, `generator.forceBiome`, `getCameraX/setCameraX`.

## Invariants

- One live `Game` per page; preview is a second `Game` with `isPreview=true` and concurrent lifetime while the gen window is open.
- Volume tri-state consistency: `isMuted` ⇒ `currentVolume === 0`; `lastVolume` is the restore-on-unmute value.
- `previewGame.generator.config` is the source of truth for the gen-window UI; on Apply it is deep-cloned into `game.treeConfig`.
- Terminal mutations must trigger `syncUIFromTerminal` — the one inverse-binding contract.
- Keyboard shortcuts are inert while an `<input>` is focused, except Escape and Enter.
- Pointer-lock must be released when the speed gesture ends or on Escape.
- The dual-slider's `calc(p% + 8px - p*0.16px)` assumes thumb width ≈16px — fragile under theme changes.

## See also

- [[entities/Terminal]] — constructed by main, callbacks bound here.
- [[decisions/DEC-03-safe-eval-and-error]] — `Function()` eval surface and `alert()` error handler replacement.
- [[decisions/DEC-04-main-decomposition]] — plan to decompose this 1894-LOC file into system modules.
- [[systems/ui-shell]] — main.ts *is* this system.
- [[systems/terminal]] — terminal host wiring lives here (lines 1473–1656).
- [[concepts/dualisms]] — main.ts contains 28 documented dualisms (default/modified, slider/input, play/pause, live/preview, log/piecewise speed, etc.).
