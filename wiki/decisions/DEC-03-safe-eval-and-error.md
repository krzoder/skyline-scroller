---
name: DEC-03 — Safe expression eval and toast-based error reporting
description: Replace `new Function(...)` math eval in the `speed` command with a tiny recursive-descent parser, and replace the global `alert()` error handler with a debounced HUD toast.
type: decision
id: DEC-03
status: proposed
date: 2026-05-20
deciders: fszalaj
supersedes: []
superseded_by: []
sources:
  - src/engine/Terminal.ts
  - src/main.ts
---

# DEC-03 — Safe expression eval and toast-based error reporting

## Context

Two distinct issues, bundled because they share a release: both are tiny surface-area fixes touching the same boot path (terminal commands + the global error handler in `main.ts`). Codex audit (2026-05-20) flagged both as production hazards.

## Problem 1 — `new Function(...)` in the `speed` command

`src/engine/Terminal.ts:207-211`:

```ts
val = Function(`
    "use strict";
    const { ${Object.getOwnPropertyNames(Math).join(', ')} } = Math;
    return (${inputStr});
`)();
```

This is arbitrary JavaScript execution on whatever the user (or anything that types into the terminal) feeds in. The terminal is currently only reachable via local keyboard, so the practical blast radius today is "the user types something silly and locks their own tab" — but it is a real **arbitrary code execution surface** the moment any other surface forwards strings to it.

Concrete attack vectors:

- **Infinite loop / tab lock**: `speed (()=>{while(1);})()` hangs the main thread. The `Math.max/min(-10000, 10000, ...)` clamp on the next line never runs because the eval never returns.
- **DOM exfiltration / mutation**: `speed (document.body.innerHTML='pwned',1)` — fully legal under the current eval because no sandbox is enforced beyond `"use strict"`.
- **Future XSS via query string**: if anyone ever wires `?cmd=…` URL params into terminal input (a perfectly reasonable feature: shareable speed presets), it is **game-over** — attacker controls the page via a crafted link. There is nothing in the current code preventing this addition, and the path from "useful feature" to "RCE in the player's tab" is one PR.
- **Identifier leakage**: every property of `Math` is destructured into scope, plus everything reachable from the global `Function` constructor (i.e. effectively all of JS). The "scope" is not a sandbox.

The UX requirement is small: users want to type `1/2`, `2*π`, `(1+1)/3` for the speed command. That's literals, four arithmetic ops, parens, unary minus, two constants. No identifiers, no function calls. The current implementation buys ~10× more power than it needs and pays full RCE price for it.

## Problem 2 — `alert()` in the global error handler

`src/main.ts:3-5`:

```ts
window.addEventListener('error', (event) => {
    alert(`Runtime Error: ${event.message} at ${event.filename}:${event.lineno}`);
});
```

Modal `alert()` on every uncaught error means:

- **UX regression in prod**: any random transient error (e.g. a third-party iframe, a deferred image load, a `ResizeObserver loop limit exceeded` non-error) shows the user a system-modal dialog. Modal alerts also block the event loop and freeze rendering until dismissed.
- **Alert storms**: if the error fires every frame (e.g. inside a `requestAnimationFrame` callback), the user gets an unkillable stack of alerts. The only escape is killing the tab.
- **No debouncing, no rate-limiting, no log retention** — the moment the user clicks "OK" the message is gone, so it is useless for debugging too.

## Constraints

- **Preserve the math-expression UX** for `speed`: `1/2`, `2*π`, `e`, `(1+1)/3`, `-0.5`, etc. must keep working.
- **No new runtime dependencies** (`mathjs`, `expr-eval`, etc. are off the table — too big for a single command).
- **No build-time codegen** (no Peggy, no Nearley). Inline parser, hand-written.
- **Error toast must not block the event loop** (no `alert`, no `confirm`).
- Stay within ~100 LOC for the parser, ~30 LOC for the toast.

## Decision 1 — Recursive-descent expression parser

Add `src/engine/Expression.ts` with a tiny recursive-descent parser. Grammar (EBNF):

```
expr   := term (('+' | '-') term)*
term   := factor (('*' | '/') factor)*
factor := '-' factor | primary
primary:= number | 'π' | 'e' | '(' expr ')'
number := /\d+(\.\d+)?/
```

That's it. No identifiers other than `π` and `e`. No function calls (parens are grouping only, never application). No bitwise. No exponent operator (`**`) — can be added later if asked; not needed for current UX.

### Full parser source (`src/engine/Expression.ts`)

```ts
// Safe arithmetic expression evaluator for terminal commands.
// Grammar:
//   expr   := term (('+' | '-') term)*
//   term   := factor (('*' | '/') factor)*
//   factor := '-' factor | primary
//   primary:= number | 'π' | 'e' | '(' expr ')'
// Identifiers other than 'π' and 'e' are rejected. No function calls.

type Token =
    | { kind: 'num'; value: number }
    | { kind: 'op'; value: '+' | '-' | '*' | '/' | '(' | ')' }
    | { kind: 'const'; value: 'π' | 'e' };

function tokenize(src: string): Token[] {
    const out: Token[] = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (c === ' ' || c === '\t') { i++; continue; }
        if (c === 'π') { out.push({ kind: 'const', value: 'π' }); i++; continue; }
        if (c === 'e') { out.push({ kind: 'const', value: 'e' }); i++; continue; }
        if ('+-*/()'.includes(c)) {
            out.push({ kind: 'op', value: c as '+' | '-' | '*' | '/' | '(' | ')' });
            i++; continue;
        }
        if (c >= '0' && c <= '9' || c === '.') {
            let j = i;
            while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++;
            const n = Number(src.slice(i, j));
            if (Number.isNaN(n)) throw new Error(`bad number near '${src.slice(i, j)}'`);
            out.push({ kind: 'num', value: n });
            i = j; continue;
        }
        throw new Error(`unexpected character '${c}' at position ${i}`);
    }
    return out;
}

class Parser {
    private pos = 0;
    constructor(private tokens: Token[]) {}

    private peek(): Token | undefined { return this.tokens[this.pos]; }
    private eat(): Token { return this.tokens[this.pos++]; }

    parse(): number {
        const v = this.expr();
        if (this.pos !== this.tokens.length) {
            throw new Error(`unexpected token at position ${this.pos}`);
        }
        return v;
    }

    private expr(): number {
        let left = this.term();
        while (true) {
            const t = this.peek();
            if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
                this.eat();
                const right = this.term();
                left = t.value === '+' ? left + right : left - right;
            } else break;
        }
        return left;
    }

    private term(): number {
        let left = this.factor();
        while (true) {
            const t = this.peek();
            if (t?.kind === 'op' && (t.value === '*' || t.value === '/')) {
                this.eat();
                const right = this.factor();
                left = t.value === '*' ? left * right : left / right;
            } else break;
        }
        return left;
    }

    private factor(): number {
        const t = this.peek();
        if (t?.kind === 'op' && t.value === '-') {
            this.eat();
            return -this.factor();
        }
        return this.primary();
    }

    private primary(): number {
        const t = this.eat();
        if (!t) throw new Error('unexpected end of input');
        if (t.kind === 'num') return t.value;
        if (t.kind === 'const') return t.value === 'π' ? Math.PI : Math.E;
        if (t.kind === 'op' && t.value === '(') {
            const v = this.expr();
            const close = this.eat();
            if (!close || close.kind !== 'op' || close.value !== ')') {
                throw new Error('expected ")"');
            }
            return v;
        }
        throw new Error(`unexpected token '${JSON.stringify(t)}'`);
    }
}

export function parse(src: string): number {
    const result = new Parser(tokenize(src)).parse();
    if (typeof result !== 'number' || Number.isNaN(result) || !Number.isFinite(result)) {
        throw new Error('expression did not evaluate to a finite number');
    }
    return result;
}
```

### Call-site change in `Terminal.ts`

```diff
+import { parse as parseExpr } from './Expression';
 ...
 execute: (args, ctx) => {
     if (args.length === 0) {
         ctx.output(`Current speed: ${ctx.game.timeScale}`);
         return;
     }
-    let inputStr = args.join(' ');
-
-    // User convenience symbol substitutions
-    inputStr = inputStr.replace(/π/g, 'Math.PI');
-
-    let val: number;
-    try {
-        // Safe-ish evaluation of math equations provided by the user, injecting Math scope
-        val = Function(`
-            "use strict";
-            const { ${Object.getOwnPropertyNames(Math).join(', ')} } = Math;
-            return (${inputStr});
-        `)();
-        if (typeof val !== 'number' || isNaN(val)) throw new Error('Not a valid number');
-    } catch (e: any) {
-        ctx.output(`Invalid speed equation: ${inputStr}`, true);
-        return;
-    }
+    const inputStr = args.join(' ');
+    let val: number;
+    try {
+        val = parseExpr(inputStr);
+    } catch (e: any) {
+        ctx.output(`Invalid speed equation: ${inputStr} (${e.message})`, true);
+        return;
+    }

     const clamped = Math.max(-10000, Math.min(10000, val));
     ctx.game.setTimeScale(clamped);
     ctx.output(`Speed set to ${clamped}`);
 },
```

## Alternative considered — regex-whitelist + `Function` eval

```ts
if (!/^[0-9π e.+\-*/()]+$/.test(inputStr)) throw new Error('bad chars');
val = Function(`return (${inputStr})`)();
```

**Rejected** because:

1. Still `Function`-eval. Any future grammar bug or whitelist hole reopens RCE.
2. The character `e` is in the whitelist as a constant — but it is also a valid JS identifier and exponent marker (`1e10`). Distinguishing "the constant `e`" from "`1e10` exponent" from "`e` as start of a longer identifier" inside a regex is brittle, and any miss reintroduces eval of arbitrary names from the global Math scope (`atan2`, `random`, …) or worse from the surrounding scope at call time.
3. Defence-in-depth principle: don't `eval` what you can `parse`. The parser is 80 LOC. Cheap.

## Decision 2 — Debounced HUD toast for the global error handler

Replace `alert()` with a small `#error-toast` div injected into the body, styled to slide in/out, debounced to one visible toast per ~250 ms, auto-hides after 4 s. **Always** logs to `console.error` regardless (so devtools retains the full trace).

### `main.ts` diff

```diff
 import './style.css'

-window.addEventListener('error', (event) => {
-    alert(`Runtime Error: ${event.message} at ${event.filename}:${event.lineno}`);
-});
+const errorToast = document.createElement('div');
+errorToast.id = 'error-toast';
+errorToast.setAttribute('role', 'alert');
+errorToast.setAttribute('aria-live', 'assertive');
+document.body.appendChild(errorToast);
+
+let toastTimer: number | undefined;
+let lastToastAt = 0;
+function showErrorToast(message: string) {
+    const now = performance.now();
+    if (now - lastToastAt < 250) return; // debounce error storms
+    lastToastAt = now;
+    errorToast.textContent = message;
+    errorToast.classList.add('visible');
+    if (toastTimer !== undefined) window.clearTimeout(toastTimer);
+    toastTimer = window.setTimeout(() => {
+        errorToast.classList.remove('visible');
+    }, 4000);
+}
+
+window.addEventListener('error', (event) => {
+    console.error('[runtime error]', event.error ?? event.message, event);
+    showErrorToast(`Runtime error: ${event.message}`);
+});
+window.addEventListener('unhandledrejection', (event) => {
+    console.error('[unhandled rejection]', event.reason);
+    showErrorToast(`Unhandled promise rejection: ${String(event.reason)}`);
+});

 import { Game } from './engine/Game'
```

### CSS (append to `src/style.css`)

```css
#error-toast {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%) translateY(120%);
    max-width: min(80vw, 640px);
    padding: 10px 16px;
    border-radius: 8px;
    background: rgba(200, 40, 40, 0.92);
    color: #fff;
    font: 13px/1.4 system-ui, sans-serif;
    pointer-events: none;
    transition: transform 200ms ease;
    z-index: 9999;
}
#error-toast.visible {
    transform: translateX(-50%) translateY(0);
}
```

## Acceptance criteria

- `parse("1/2")` returns `0.5`.
- `parse("2*π")` returns `~6.2832` (`Math.PI * 2`).
- `parse("(1+1)/3")` returns `~0.6667`.
- `parse("-0.5")` returns `-0.5`.
- `parse("e")` returns `Math.E`.
- `parse("(()=>1)()")` throws (unexpected character `>` or unexpected token after `(`).
- `parse("Math.PI")` throws (identifier `M`, `a`, `t`, `h` not allowed; only `π` and `e` are constants, and `e` followed by more letters becomes two adjacent tokens which the parser rejects).
- `parse("while(1)")` throws.
- Speed slider in the existing UI continues to work (it calls `setTimeScale` directly, not via the terminal).
- Triggering a thrown error from the console shows a toast at the bottom of the screen that disappears after 4 s; firing 100 errors in a tight loop shows at most ~4 toasts (debounced) and never blocks input.
- `console.error` is called for every error event, regardless of debounce.

## Risks

- **Parser bugs**: precedence inversion, unary-minus edge cases (`-2*3`, `-(2+3)`, `--2`), division-by-zero (currently returns `Infinity` → rejected by the final `Number.isFinite` check, which is intentional).
- **Mitigation**: `tests/Expression.test.ts` with vitest. Suggested cases:
  - `parse("1") === 1`
  - `parse("1+2*3") === 7`
  - `parse("(1+2)*3") === 9`
  - `parse("-2*3") === -6`
  - `parse("-(2+3)") === -5`
  - `parse("2*π") === Math.PI * 2`
  - `parse("e") === Math.E`
  - `parse("1/0")` throws (non-finite)
  - `parse("(()=>1)()")` throws
  - `parse("Math.PI")` throws
  - `parse("alert(1)")` throws
  - `parse("")` throws
  - `parse("1.5 + .5") === 2`
- **Toast layering**: ensure `z-index: 9999` is above terminal overlay; verify after merge.
- **Toast a11y**: `role="alert"` + `aria-live="assertive"` so screen readers still announce errors. (`alert()` did this implicitly; we must preserve it.)
- **Behavior change in dev**: developers used to seeing modal `alert()` errors will now see a toast and need to check devtools console. Document in CHANGELOG.

## Out of scope

- Hardening other terminal commands (`generate`, `biome`, `seed`) — they already use structured arg parsing, not eval. Audited.
- Source-map-aware error reporting in the toast (would need a sourcemap consumer; not worth the bundle weight for a hobby project).
- Exponent operator (`**`) or function calls (`sin`, `cos`) in the expression parser — add only if user asks.

## See also

- [[entities/Terminal]] — owner of the `speed` command and command registry.
- [[systems/terminal]] — terminal subsystem and its boundary with the engine.
- Source: `src/engine/Terminal.ts:189-229` (speed command), `src/main.ts:1-7` (global error handler).
