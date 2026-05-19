---
id: DEC-04
title: Decompose src/main.ts into src/ui/ modules
status: proposed
date: 2026-05-20
deciders: fszalaj
type: decision
supersedes: []
superseded-by: []
tags: [refactor, ui-shell, main-ts]
related:
  - "[[entities/main]]"
  - "[[systems/ui-shell]]"
  - "[[concepts/escape-priority-stack]]"
  - "[[concepts/idempotent-render]]"
  - "[[concepts/dualism]]"
sources:
  - "wiki/.scan/agent-01-main-ts.md"
  - "wiki/.scan/agent-13-complexity-deps.md"
  - "Codex review: D12 (double-bound `btnGenApply`)"
---

# DEC-04 — Decompose `src/main.ts` into `src/ui/` modules

## Context / Problem

`src/main.ts` has grown into a **1894 LOC**, **CC-proxy 215**, single side-effect script with **0 exports**, **44 `addEventListener`** calls and **62 `getElementById`** calls. It is the entry point Vite loads, and it currently owns:

- the 220-line `innerHTML` shell template (lines 9–229),
- bootstrap and primary `Game` instantiation (231–238),
- three bespoke window controllers (settings / advanced / custom-gen) with copy-pasted open/close/Escape logic,
- a 420-line idempotent `renderTreeSettings()` (lines 887–1310) that builds + updates per-tree controls in one nested `forEach`,
- two different speed mappings (log + piecewise-with-0–1-slice) plus a `Function(...)`-based arithmetic eval,
- terminal mount + autocomplete + history + `syncUIFromTerminal`,
- a pointer-lock drag-to-speed gesture and a wheel-anywhere volume controller,
- a global keyboard shortcut handler with an implicit Escape priority stack (lines 1731–1770).

It also houses **D12 — double-bound Apply handler**. Codex confirmed: `main.ts:698` and `main.ts:1369` both bind a click listener to `btnGenApply` with identical bodies. Result: `cancelResetConfirm()` runs twice, `game.setSeed()` runs twice on every Apply click. Currently masked because both calls are idempotent in their effect, but it is a latent bug and a clear signal of an ungovernable file.

The Polish signoff at line 1895 ("Żadna komórka mózgowa nie ucierpiała…") is the author acknowledging the file's state.

## Constraints

- **Zero runtime regression.** Every visible behaviour observable from the hot-path smoke list (below) must be byte-identical post-refactor, except the double-firing Apply, which is the explicit defect being fixed.
- **Same DOM IDs.** Every `#id` listed in `[[entities/main]]` survives intact. Splitting the script across files must not require touching `style.css`, `index.html`, or any DOM consumer outside `src/ui/`.
- **Same import graph at the leaves.** `engine/Game`, `engine/Terminal`, `procgen/TreeConfig`, `engine/Tree`, `procgen/BiomeSystem` continue to be the only engine/procgen modules touched by the UI layer. No engine code moves.
- **Same UX.** Escape priority order, keyboard shortcuts, slider mappings, confirm-then-act states, volume tri-state, focused-control guard — all preserved.
- **Incremental.** Each step must keep `tsc --noEmit` green and `vitest run` green. No big-bang.

## Decision

Split `src/main.ts` into **9 modules under `src/ui/`**. Each module owns a coherent slice of the current file, exports a single `init...()` (or a small surface), and consumes DOM by ID. `main.ts` becomes a 20-line bootstrap.

Two new abstractions are introduced:

1. **`ui/window-manager.ts`** — generic `Window` class + module-level Escape priority registry. Replaces three bespoke window controllers.
2. **`ui/tree-settings-renderer.ts`** — `renderTreeSettings()` decomposed into per-row components.

Everything else is mechanical extraction.

### Module table

| Module | LOC | Source lines (current `main.ts`) | Exports | Imports |
|---|---:|---|---|---|
| `ui/bootstrap.ts` | ~40 | 1–5, 231–238, plus the final wiring | `bootstrap(): void` | `Game`, all sibling `ui/*` `init*` functions, error handler |
| `ui/seed-controls.ts` | ~80 | 240–288 (seed display, set/random buttons, copy-to-clipboard) | `initSeedControls(game): void`, `copyToClipboard(el, fn)` | `Game` (type) |
| `ui/window-manager.ts` | ~120 | NEW abstraction; replaces 614–626, 575–584, 655–711 close logic, 1382–1385 | `class Window`, `registerEscapeHandler(priority, fn)`, `getOpenWindows()` | (none) |
| `ui/settings-window.ts` | ~150 | 585–626 + parts of 1397–1471 (basic speed slider + sound button + popup volume) | `initSettingsWindow(game): void` | `Window`, `Game` (type) |
| `ui/advanced-window.ts` | ~200 | 290–530, 575–584 (time format buttons, advanced speed slider/input/eval, two-click reset) | `initAdvancedWindow(game): void` | `Window`, `Game` (type) |
| `ui/custom-gen.ts` | ~600 | 655–738, 740–826, 830–885, 1318–1393 (open/close, preview canvas, biome select, refresh, pause/play, gen-speed, reset confirm, **single Apply handler**, seed-input Enter) | `initCustomGen(game): { renderTreeSettings(): void; refreshPreview(): void }` | `Window`, `Game`, `Tree`, `DEFAULT_TREE_CONFIG`, `BiomeType` (type), `TreeType` (type), `tree-settings-renderer` |
| `ui/terminal-bind.ts` | ~200 | 1473–1675 (Terminal construction, hint rendering, syncUIFromTerminal, keydown handling, toggleTerminal) | `initTerminal(game, deps): { toggleTerminal(): void; syncUIFromTerminal(): void }` | `Terminal`, `AutocompleteSuggestion` (type), `Game` (type), `Window` registry |
| `ui/gestures.ts` | ~100 | 628–653 (fullscreen toggle), 1773–1842 (pointer-lock drag, dblclick reset), 1844–1893 (wheel-volume + lazy bar) | `initGestures(game, deps): void` | `Game` (type) |
| `ui/tree-settings-renderer.ts` | ~250 | 830–885 + 887–1310 decomposed into per-row components | `renderTreeSettings(ctx): void` + private `renderTreeRow`, `renderBiomeChips`, `renderDualSlider`, `renderHeightInputs`, `renderFlowerSlider`, `renderTreeIcon` | `Tree`, `TreeType` (type), `BiomeType` (type), `DEFAULT_TREE_CONFIG` |

Total ~1740 LOC across 9 files vs 1894 in one. The reduction is from de-duplication (single Apply, single window controller scaffold, single escape registry).

The current 220-line `innerHTML` template (lines 9–229) is **not** part of this refactor — it stays in `main.ts` (or is moved to `index.html` as a follow-up). Moving it changes semantics around Vite's bundling and is orthogonal.

### Window abstraction (API)

```ts
// src/ui/window-manager.ts
export type EscapePriority = number; // lower = higher priority; terminal=0, customGen=10, advanced=20, settings=30, pointerLock=40

export class Window {
    constructor(public el: HTMLElement, opts?: { escapePriority?: EscapePriority; onClose?: () => void });
    open(): void;     // adds .visible, registers escape, fires no-op if already open
    close(): void;    // removes .visible, unregisters escape, runs onClose
    toggle(): void;   // open if closed, close if open
    isOpen(): boolean;
}

// Module-level priority stack. main.ts keydown handler iterates ascending priority.
export function registerEscapeHandler(priority: EscapePriority, fn: () => boolean): () => void; // returns unregister
export function handleEscape(): boolean; // called from global keydown
```

`Window.open()` calls `registerEscapeHandler(opts.escapePriority, () => { this.close(); return true; })` and `Window.close()` unregisters. The global keydown in `gestures.ts` (or `bootstrap.ts`) calls `handleEscape()`, which walks the registry in ascending priority and calls the first handler whose return is `true`.

Documented priority order (preserving current behaviour, lines 1731–1770):

| Priority | Owner | Notes |
|---:|---|---|
| 0 | Terminal | `style.display` not `.visible` class |
| 10 | custom-gen window | calls `btnGenClose.click()` today; becomes `customGenWindow.close()` |
| 20 | advanced window | |
| 30 | settings window | |
| 40 | pointer-lock | `document.exitPointerLock()` |
| (uncaught) | native fullscreen | no `preventDefault`; browser handles |

### New `main.ts`

```ts
import './style.css';
import { bootstrap } from './ui/bootstrap';

window.addEventListener('error', (e) => {
    // Keep current behaviour: surface uncaught runtime errors to the user.
    // TODO(DEC-?): replace alert with non-modal toast.
    alert(`Runtime error: ${e.message}\n${e.error?.stack ?? ''}`);
});

bootstrap();
```

That's it. Everything else lives under `src/ui/`.

`bootstrap.ts` itself is:

```ts
import { Game } from '../engine/Game';
import { initSeedControls } from './seed-controls';
import { initSettingsWindow } from './settings-window';
import { initAdvancedWindow } from './advanced-window';
import { initCustomGen } from './custom-gen';
import { initTerminal } from './terminal-bind';
import { initGestures } from './gestures';

export function bootstrap(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const game = new Game(canvas);
    game.setSeed(String(Math.floor(Math.random() * 1_000_000)));
    game.start();

    initSeedControls(game);
    const { renderTreeSettings, refreshPreview } = initCustomGen(game);
    initSettingsWindow(game);
    initAdvancedWindow(game);
    initGestures(game, { /* shortcuts wired here */ });
    initTerminal(game, { renderTreeSettings, refreshPreview });
}
```

### Killing D12 (the duplicate Apply)

The Apply handler currently appears at both `main.ts:698` and `main.ts:1369` with identical bodies. In `ui/custom-gen.ts` the handler is bound **exactly once** during `initCustomGen()`. The second copy is deleted as part of step 3 of the migration. Net behaviour change: `cancelResetConfirm()` and `game.setSeed()` each run once per click instead of twice.

## Migration order

Each step is its own commit, must pass `tsc --noEmit` + `vitest run`, and must leave the running game visually unchanged (except step 3, which removes the duplicate Apply firing).

**Step 1 — Orthogonal extractions** (no dependencies between them, no behaviour change):
1. Extract `ui/window-manager.ts` with the new `Window` class + escape registry. Do not yet wire any existing window to it; the file is added, imported nowhere. Tests/build green.
2. Extract `ui/tree-settings-renderer.ts`. Cut `renderTreeSettings()` from `main.ts` (lines 887–1310), plus its helpers (`getTreeIconScale`, `isTreeModified`, `updateTreeResetButton`, lines 830–885). Re-export as `renderTreeSettings(ctx)`. `main.ts` imports it and calls it identically. Decompose internally into `renderTreeRow`, `renderBiomeChips`, `renderDualSlider`, `renderHeightInputs`, `renderFlowerSlider`, `renderTreeIcon` (6 small functions, each ~30–60 LOC).

**Step 2 — Independent UI islands**:
3. Extract `ui/seed-controls.ts` (lines 240–288).
4. Extract `ui/gestures.ts` (fullscreen 628–653; pointer-lock drag 1773–1842; wheel-volume 1844–1893).
5. Extract `ui/terminal-bind.ts` (lines 1473–1675). Keeps using `style.display` toggle for compatibility; registers Escape at priority 0 via `window-manager`.

**Step 3 — Window-coupled modules** (depend on `window-manager`):
6. Extract `ui/settings-window.ts`. Replace settings-window open/close + click-outside dismissal (lines 614–626) with a `Window` instance at priority 30. Move basic speed slider (1397–1471) here.
7. Extract `ui/advanced-window.ts`. Replace advanced-window open/close + reset confirm (lines 290–530, 575–584) with a `Window` at priority 20.
8. Extract `ui/custom-gen.ts`. Replace open/close (655–711) and outside-click cancel (1318–1366) with a `Window` at priority 10. **Bind the Apply handler exactly once** (kill the duplicate at 1369). Move the custom-seed Enter handler (1387–1393).

**Step 4 — Final slim**:
9. Extract `ui/bootstrap.ts`. Reduce `main.ts` to the ~20-line stub shown above. Move the 220-line `innerHTML` template either to a `ui/template.ts` constant or to `index.html` directly (recommended: defer to a follow-up DEC).

Each step is reviewable independently. Steps 1–2 are pure cuts (no behaviour change). Step 3 is the one with semantic change (Apply double-fire fix). Step 4 is final consolidation.

## Acceptance criteria

- `pnpm tsc --noEmit` (or `npx tsc --noEmit`) passes with no new errors.
- `pnpm vitest run` (or `npx vitest run`) passes — currently only `tests/Random.test.ts` is in scope and it must continue to pass.
- `pnpm build` (or `npx vite build`) succeeds and the bundle output size does not increase by more than 1%.
- `main.ts` is ≤ 25 LOC (excluding the runtime-error handler and the `bootstrap()` call).
- No file in `src/ui/` exceeds 650 LOC. No function exceeds 80 LOC except `renderTreeSettings`'s outer orchestrator (which should itself be ≤ 60 LOC after row-component extraction).
- `grep -c "btnGenApply.addEventListener" src/ui/custom-gen.ts` returns `1`. Project-wide search returns `1`.
- Visual smoke check — 8 hot paths to retest manually after each step:
  1. Page load → game starts at a random seed → time scrolls.
  2. `R` (or random-seed button) → game reseeds and restarts.
  3. Click seed display → seed copied to clipboard with green flash.
  4. Open custom-gen window → preview canvas renders → change biome to `desert` → preview refreshes → Apply → main game adopts the preview config and reseeds.
  5. Tree settings dropdown → toggle a tree off → adjust min/max height via dual slider → flower% on cactus → reset buttons paint red/yellow correctly.
  6. Advanced window → set speed to `2*pi` via the text input → both sliders snap to that value → reset → back to 1×.
  7. Terminal → open with `T` → run `seed 12345` → close terminal → seed display shows `12345` → settings sliders reflect new state (`syncUIFromTerminal` chain).
  8. Escape priority — open terminal + custom-gen + advanced + settings + acquire pointer-lock simultaneously (test in order); each Escape closes exactly one in priority order; final Escape exits fullscreen natively.

## Risks

1. **Event-binding order changes.** Today the order of `addEventListener` calls in `main.ts` happens to match the order of element creation in the 220-line `innerHTML`. After splitting, `bootstrap.ts` calls `init*()` functions in a fixed order, which we must mirror.  
   **Mitigation:** keep `bootstrap.ts`'s call order matching the current source-order top-to-bottom of `main.ts`. Document the chosen order in `bootstrap.ts` as a comment.

2. **Escape priority drift.** The current stack is implicit in source order at lines 1731–1770. Moving to a registry makes it explicit, but a registration-order bug in one `init*()` function could re-order it.  
   **Mitigation:** the priority is a constant passed to `new Window({ escapePriority })`. Constants are defined in `window-manager.ts` and reused — `WINDOW_PRIORITY.TERMINAL = 0`, `WINDOW_PRIORITY.CUSTOM_GEN = 10`, etc. Order is data, not control flow.

3. **`document.activeElement` guard regressions.** Multiple sliders rely on `document.activeElement !== X` to avoid overwriting user input mid-drag (advanced speed, dual slider, flower%). Module boundaries must not break these references.  
   **Mitigation:** each guard stays in the module that owns its slider; modules do not cross-reference DOM refs. The guard is a within-module concern.

4. **`syncUIFromTerminal` becomes a cross-module fan-out.** Today it's a single closure that touches five subsystems. After split, it must call into each `init*()` module.  
   **Mitigation:** each module returns a `syncUI()` function from its `init*()`. `terminal-bind.ts` collects them via the `deps` parameter and composes a single `syncUIFromTerminal()` that calls each in turn. Order matches today's flat numbered list.

5. **The volume tri-state lives on `(window as any).volFadeTimer`.** Already a smell. Moving the wheel-volume code to `gestures.ts` and the popup-volume to `settings-window.ts` means two files share state.  
   **Mitigation:** consolidate the tri-state into a tiny `VolumeController` exported from `settings-window.ts` and imported by `gestures.ts`. The `window`-globals are removed in step 4.

6. **The `Tree` import duplicated in `main.ts` (lines 713 + 735)** — one is type-only, one is the runtime class. Splitting must not drop either.  
   **Mitigation:** `custom-gen.ts` and `tree-settings-renderer.ts` each import what they actually need. The type-only `TreeType` and the runtime `Tree` class are different identifiers and can coexist.

## Out of scope (follow-up DECs)

- The 220-line `innerHTML` template — move to `index.html` or a templating layer. Touching it is its own decision because it changes how the initial paint happens.
- `alert()`-based runtime error UX (line 3) — replace with non-modal toast.
- The `Function(...)`-based arithmetic eval in advanced speed input (line 470) — document as `[[concepts/safe-eval]]`, keep behaviour, evaluate replacement later.
- Volume tri-state collapse to a finite-state object — partly done via `VolumeController` in this refactor, full FSM later.
- Inline SVG strings (play/pause, mute/unmute) → constants module.

## See also

- [[entities/main]] — the file being decomposed
- [[systems/ui-shell]] — the system that `main.ts` *is* today
- [[concepts/escape-priority-stack]] — formalised by `window-manager.ts`
- [[concepts/idempotent-render]] — preserved in `tree-settings-renderer.ts`
- [[concepts/preview-game-mirror]] — preserved in `custom-gen.ts`
- [[concepts/dualism]] — 28 dualisms are not eliminated, just relocated
- `wiki/.scan/agent-01-main-ts.md` — source-of-truth section line ranges
- `wiki/.scan/agent-13-complexity-deps.md` — CC and dependency metrics
