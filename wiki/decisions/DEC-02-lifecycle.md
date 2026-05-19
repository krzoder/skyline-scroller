---
id: DEC-02
title: Game lifecycle — idempotent dispose, no leaked rAF / resize listeners
type: decision
status: accepted
date: 2026-05-20
supersedes: []
superseded-by: []
tags: [lifecycle, memory-leak, game-loop, resize, raf, preview]
related:
  - "[[entities/Game]]"
  - "[[systems/game-loop]]"
---

# DEC-02 — Game lifecycle: idempotent `dispose()` and preview teardown

## Problem

`Game` (see [[entities/Game]]) leaks two resources. In the constructor (`src/engine/Game.ts:50`) the main instance binds an anonymous `() => this.resize()` handler to `window.resize` and never removes it. The render loop in `loop()` (`Game.ts:163`) calls `requestAnimationFrame` unconditionally on every frame and **does not capture the handle**, so even if `isRunning=false` halts subsequent body execution, the loop has already scheduled one more rAF callback the engine still owns. More damagingly, `dispose()` (`Game.ts:58–60`) only flips `isRunning=false`; it cancels nothing and removes nothing. The concrete leak surfaced by Agent-12: `main.ts:679` lazy-constructs `previewGame = new Game(previewCanvas, true)` on open, and `btnGenClose` (handlers at `main.ts:687` and `main.ts:1382`) only hides the window with `classList.remove('visible')`. The preview `Game` keeps spinning offscreen forever; opening the custom-gen window N times produces N concurrent background rAF loops compounding CPU and GC pressure. See [[systems/game-loop]] for the full loop topology.

## Constraints

- **Idempotent `dispose()`** — calling it twice (or after constructor failure) must be a no-op, never throw.
- **No leaked resources** — no dangling rAF callbacks, no orphaned `resize` listeners after `dispose()`.
- **Backwards-compatible main `game`** — the singleton constructed at startup keeps its current behaviour; nothing currently calls `game.dispose()` and that stays true. The fix must not change observable behaviour for the active main game.
- **Preview parity** — `previewGame` (constructed with `isPreview=true`) does not bind a window resize listener today (`Game.ts:48`), so `dispose()` must tolerate `resizeHandler === null`.
- **No new public API surface** — `dispose()` signature is unchanged; we only add private fields.

## Decision

### 1. Rewrite `Game.dispose()` to release everything it acquired

Introduce two new private fields:

- `private rafId: number | null = null` — handle returned by `requestAnimationFrame`, captured every frame.
- `private resizeHandler: (() => void) | null = null` — named arrow stored so `removeEventListener` matches.

`dispose()` then:

1. `if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }`
2. `if (this.resizeHandler) { window.removeEventListener('resize', this.resizeHandler); this.resizeHandler = null; }`
3. `this.isRunning = false`
4. Subsequent calls find `rafId === null`, `resizeHandler === null`, `isRunning === false` and short-circuit — fully idempotent.

`start()` continues to early-return on `isRunning`, and the new `rafId = requestAnimationFrame(...)` assignment is added to both `start()` and `loop()`.

### 2. Teardown `previewGame` on close

In `src/main.ts`, the `btnGenClose` close-path (the second handler at `main.ts:1382` is the survivor — the first at `main.ts:687` should be folded into it or both updated) must call `previewGame?.dispose()` and null-out the reference. `openCustomGen` already lazy-recreates when `previewGame` is null, so reopen is free.

## Diff sketch — `src/engine/Game.ts`

```ts
export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lastTime: number = 0;
    private isRunning: boolean = false;
+   private rafId: number | null = null;
+   private resizeHandler: (() => void) | null = null;
    // ... existing fields ...

    constructor(canvas: HTMLCanvasElement, isPreview: boolean = false) {
        // ... existing init ...
        if (!this.isPreview) {
-           window.addEventListener('resize', () => this.resize());
+           this.resizeHandler = () => this.resize();
+           window.addEventListener('resize', this.resizeHandler);
            this.resize();
        } else {
            this.resize();
        }
    }

    public dispose() {
+       if (this.rafId !== null) {
+           cancelAnimationFrame(this.rafId);
+           this.rafId = null;
+       }
+       if (this.resizeHandler) {
+           window.removeEventListener('resize', this.resizeHandler);
+           this.resizeHandler = null;
+       }
        this.isRunning = false;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
-       requestAnimationFrame((t) => this.loop(t));
+       this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    private loop(time: number) {
        if (!this.isRunning) return;
        try { /* ... update + render ... */ } catch (e) {
            console.error("Game Loop Error:", e);
            this.isRunning = false;
+           return;
        }
-       requestAnimationFrame((t) => this.loop(t));
+       this.rafId = requestAnimationFrame((t) => this.loop(t));
    }
}
```

## Diff sketch — `src/main.ts`

Apply to the close handler at `main.ts:1382` (and either remove the duplicate at `main.ts:687` or apply the same change there):

```ts
btnGenClose.addEventListener('click', () => {
    cancelResetConfirm();
    customGenWindow.classList.remove('visible');
+   previewGame?.dispose();
+   previewGame = null;
    iconIntervals.forEach(i => clearInterval(i));
});
```

`openCustomGen` (`main.ts:659`) already guards `if (!previewGame) { previewGame = new Game(...) }`, so the next open transparently rebuilds.

## Acceptance criteria

- Open custom-gen window, close it, open again. `previewGame.isRunning` evaluated in DevTools after close is `false`; after second open it's `true` and there is **exactly one** rAF loop attributed to `Game.loop` in a Performance trace.
- DevTools → Performance → record 5s with window closed twice in a row: zero `Game.loop` samples after the second close.
- `getEventListeners(window).resize` in DevTools console returns the same count before any custom-gen open and after a close cycle (no growth).
- Calling `previewGame?.dispose(); previewGame?.dispose();` does not throw.
- Main `game` instance untouched — frame rate and resize behaviour identical to pre-change baseline.

## Risks

- **Forgetting to assign `rafId` at a scheduling site** — both `start()` and the tail of `loop()` schedule rAF; both must store the handle. A missed assignment leaves a non-cancellable frame in flight (one-shot leak, then quiesces). Mitigation: grep for `requestAnimationFrame(` in `Game.ts` post-patch; CI test that asserts `rafId !== null` while `isRunning`.
- **Double-cancel safety** — `cancelAnimationFrame` on an invalid/stale id is a no-op per spec, but we still null-guard to keep `dispose()` cheap and obviously idempotent.
- **Anonymous-handler trap regression** — if someone re-introduces `window.addEventListener('resize', () => this.resize())` later, `removeEventListener` silently fails (different function identity). The `resizeHandler` field is the canonical place; enforce via review.
- **Duplicate `btnGenClose` listeners** (`main.ts:687` and `main.ts:1382`) — both fire on close. Either both need the dispose call, or the earlier one should be consolidated. Leaving only one updated is a latent footgun if execution order changes.
- **Race on rapid open/close** — `dispose()` cancels the pending frame, but a frame may already be executing when close fires. The `if (!this.isRunning) return` guard at the top of `loop()` handles this — `isRunning=false` is set after cancel, so even an in-flight callback exits cleanly without rescheduling.

## References

- `src/engine/Game.ts:48-56` — resize binding in constructor
- `src/engine/Game.ts:58-60` — current `dispose()` body
- `src/engine/Game.ts:138-164` — `start()` and `loop()`
- `src/main.ts:656` — `previewGame` declaration
- `src/main.ts:676-681` — lazy construction in `openCustomGen`
- `src/main.ts:687-691` — first `btnGenClose` handler (close + clear intervals)
- `src/main.ts:1382-1385` — second `btnGenClose` handler (close + cancelResetConfirm)
- Related: [[entities/Game]], [[systems/game-loop]]
