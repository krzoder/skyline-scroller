# Agent 09 — CSS / HTML / public

## Files scanned

- `/Users/fszalaj/Documents/git/skyline-scroller/index.html` (13 LOC)
- `/Users/fszalaj/Documents/git/skyline-scroller/src/style.css` (542 LOC)
- `/Users/fszalaj/Documents/git/skyline-scroller/public/vite.svg` (favicon, 1.5 KB, untouched Vite default)
- Cross-read into `src/main.ts` (only to map IDs → DOM topology; logic itself belongs to [[agents/agent-01-main-ts]] et al.)

## Public surface (exports/classes/functions/types)

CSS has no exports per se. The "public surface" of the stylesheet is the set of selectors that other code (mostly `main.ts`) hooks to:

### ID hooks (anchor points consumed by JS)

| ID | Styled? | Role |
|---|---|---|
| `#app` | yes | root mount, full viewport, `position: relative` |
| `#game-canvas` | yes | the WebGL/2D scroller canvas, fills viewport |
| `#ui-layer` | yes | top-left HUD wrapper, **`pointer-events: none`** + `transform: scale(1.6)` |
| `#seed-display` | yes | semi-opaque pill, monospace seed/time readout |
| `#bottom-right-controls` | yes | flex row of corner buttons (`z-index: 100`) |
| `#settings-window` | yes | small modal, anchored above buttons |
| `#advanced-window` | yes | **`position: fixed` centred modal** (600×500, `z-index: 300`) |
| `#custom-gen-window` | yes | large 80vw×80vh modal (`z-index: 200`) |
| `#custom-gen-content`, `#gen-controls`, `#gen-preview-container`, `#gen-preview-canvas` | yes | split-pane inside gen window with **forced 16:9 aspect** |
| `#tree-settings-dropdown-container` | yes (just `width:100%`) | nested settings region |
| `#terminal-output-container` | yes | green-on-black scrollback (`z-index: 150`) |
| `#terminal-bar` | yes | bottom command bar, `bottom:20px; left:20px; right:180px` |
| `#terminal-input` | yes | transparent inline input (inherits green colour) |
| `#volume-popup` (+ `::before`) | yes | hover slider with **invisible bridge** trick |
| `#volume-slider` | yes | uses deprecated `writing-mode: bt-lr` + `appearance: slider-vertical` for vertical orientation |
| `#volume-visual-container`, `#volume-visual-bar` | yes | right-edge ambient volume meter (`z-index: 9999`) |
| `#gesture-slider-container` | yes | floating gesture HUD (`z-index: 500`) |

### Class hooks

- `.control-btn` — generic 40×40 round-corner glass button.
- `.ui-window` / `.ui-window.visible` — pop-up base + visibility toggle.
- `.row`, `.btn-small`, `.btn-selected` — form-row utilities.
- `.btn-smart-reset` + `.default` / `.modified` — bi-state reset button (yellow X / red X). See [[concepts/Modified-Indicator]].
- `.tree-setting-wrapper` — only hover behaviour, otherwise styled inline by JS.
- `.terminal-line`, `.terminal-copied` — clickable scrollback line + flash-confirm state.
- `.dual-slider-container`, `.dual-slider-track-bg`, `.dual-slider-track-fill`, `.dual-slider-input`, plus `::-webkit-slider-thumb` and `::-moz-range-thumb` — full hand-built range-pair widget.

## Internal state

CSS internal state is encoded as **toggle classes** (no CSS variables, no `:root` custom properties beyond font/colour-scheme):

- `.visible` — gates `display: none` ↔ `display: block/flex` for every modal/popup.
- `.btn-selected` — green pill highlight for an active option in a `.row`.
- `.btn-smart-reset.default` vs `.btn-smart-reset.modified` — visual two-state machine; `default` is `cursor: default` (cosmetic), `modified` is `cursor: pointer` (actionable).
- `.terminal-copied` — transient flash via `!important` overrides.
- `#volume-visual-container.visible` — fade-in via opacity (only CSS transition-based state, 0.5s ease).

`index.html` has no internal state — it is a near-empty Vite scaffold.

`public/` has no state; one file, the Vite logo, still served as favicon.

## Control flow

There is no CSS control flow as such, but visually:

1. `body/html` clamp to viewport, `overflow: hidden` → app is a fullscreen single-page experience.
2. `#app` (relative) hosts the canvas and absolute-positioned UI siblings.
3. `#ui-layer` is the top-left HUD, intentionally upscaled 1.6× (a hard-coded magic number).
4. Pop-up flow: button click in `#bottom-right-controls` → JS toggles `.visible` on the matching `#…-window`.
5. Volume popup: `#volume-popup` is rendered as a transparent wrapper whose `::before` paints the actual background — the transparent bottom padding is the "bridge" that prevents the hover gap from closing the popup. CSS-only hover persistence trick.
6. Terminal flow: `#terminal-bar` (input) at the bottom, with `#terminal-output-container` floating just above it (`bottom: 60px`). Stack order is identical (both `z-index: 150`).
7. Gesture overlay: shown only while dragging on canvas; positioned by JS via inline `style.left/top`.

## Dependencies (imports / imported-by, even if known indirectly)

- `index.html` imports `/src/main.ts` (sole script tag).
- `index.html` references `/vite.svg` as favicon.
- `style.css` is imported by `src/main.ts` (Vite-conventional, see [[agents/agent-01-main-ts]]).
- Every selector in `style.css` corresponds to an ID/class produced by the `innerHTML` template at `src/main.ts:9–230` plus runtime-created nodes (`#volume-visual-container` is built imperatively at `main.ts:1869`).
- Font stack uses Inter + system fonts; **no self-hosted fonts in `public/`**.

## Complexity & hotspots

1. **Two declarations of `#settings-window` / `#advanced-window`** (lines 115–134 and 136–152). The second block re-asserts shared properties using a grouped selector and clobbers `border-radius: 8px` → `12px` and `padding: 10px` → `20px`. Cascade order saves it, but it's fragile — see Surprises.
2. **`#ui-layer` `transform: scale(1.6)`** (line 58) — a global zoom on the HUD that will distort hit-areas, fonts, and pixel-snapping. Combined with `pointer-events: none` on the wrapper this works, but any nested element relying on real coords (e.g. tooltip positioning) will be off by 1.6×.
3. **Magic numbers everywhere**: `right: 180px` on `#terminal-bar` (assumes width of bottom-right controls), `bottom: 70px` on `#settings-window`, `top: 55%` on `#custom-gen-window`, `height: 72vh` on volume bar (commented "Reduced by 10% (was 80vh)"). These will break together if button row changes.
4. **Z-index ladder** (informal, not centralised):
   - `#ui-layer` 10
   - `#bottom-right-controls` 100
   - `#terminal-bar`, `#terminal-output-container` 150
   - `#custom-gen-window` 200, `#volume-popup` 200
   - `#advanced-window` 300
   - `#gesture-slider-container` 500
   - `#volume-visual-container` **9999** (escape hatch)
   No constants, no scale — collisions silently possible.
5. **Deprecated vertical-range hack** (lines 329–332): `writing-mode: bt-lr` is non-standard and `-webkit-appearance: slider-vertical` is removed in modern Chromium. Likely already broken on current Chrome stable.
6. **`!important` usage**: `.tree-setting-wrapper:hover`, `.terminal-copied`, `.btn-selected`. Indicates inline-style fights elsewhere (JS sets inline backgrounds).
7. **`-webkit-` prefixes only** for scrollbar styling — Firefox + recent CSS `scrollbar-color/width` ignored.
8. **No `prefers-reduced-motion`** branch; all transitions unconditional.
9. **No media queries at all** — the layout is desktop-only despite `viewport` meta.

## Dualisms & duality patterns observed

This file is a goldmine of dualisms:

- **Visible ↔ Hidden** — every modal uses `display: none` flipped by `.visible`. The flip switches between `block` and `flex` (varies per window, see `.ui-window.visible` vs `#custom-gen-window.visible`).
- **Canvas ↔ UI** — `#game-canvas` is the dark backdrop; `#ui-layer` rides above it with `pointer-events: none` so the canvas remains hit-testable. Buttons explicitly opt back in with `pointer-events: auto`.
- **Transparent wrapper ↔ visible background** — `#volume-popup` is transparent, `::before` paints the real surface; the gap is a deliberate "invisible bridge" so hover doesn't break. Form vs. shadow.
- **Default ↔ Modified reset** — `.btn-smart-reset.default` (yellow, no-op cursor) vs `.btn-smart-reset.modified` (red, pointer cursor). Encodes a state machine purely in CSS classes — see [[concepts/Modified-Indicator]].
- **Track ↔ Fill** in `.dual-slider-*` — two stacked range inputs sandwich a track-bg + track-fill, simulating a two-thumb range.
- **Idle ↔ Hovered** — many surfaces flip from `rgba(0,0,0,0.7)` to `rgba(255,255,255,0.1)`. Inversion of contrast, not just brightness change.
- **Native ↔ Hand-styled controls** —
  - Native styled: `<input type=range>` (volume, speed), `<select>` (biome), `<input type=text>` (seed).
  - Hand-styled: dual slider, smart-reset button, terminal, modals, control buttons.
  - Cleanup pass strips spinners from number inputs (lines 381–390).
- **Light vs Dark** — `color-scheme: light dark` declared on `:root`, but in practice the palette is dark-only (`#242424` body, white text). The dual-scheme declaration is aspirational, not implemented.
- **Fullscreen vs Windowed** — `#btn-fullscreen` exists (per main.ts); no CSS branch for it. Layout is identical in both.
- **Focused vs Unfocused** — no `:focus-visible` rings anywhere. Outline removed implicitly on `#terminal-input` (`outline: none`). Accessibility regression.
- **Bottom-anchored vs Centre-anchored windows** — `#settings-window` floats bottom-right relative to buttons; `#advanced-window` and `#custom-gen-window` are viewport-centred. Two different layout idioms for what is, semantically, the same "modal".

## Invariants

- Every modal has a sibling `.visible` toggle; without it, all are hidden.
- `body` and `html` always full-bleed, no scroll (`overflow: hidden`).
- `#ui-layer` always upscaled 1.6×.
- `pointer-events: none` on `#ui-layer` is intentional — children must opt back in.
- Terminal colour is always `#0f0` on `rgba(0,0,0,0.85)` (classic phosphor green).
- Z-index of `#volume-visual-container` is the highest in the stylesheet (9999) — it must always sit on top.
- `#gen-preview-container` is forced to 16:9 via `aspect-ratio`.

## Surprises / risks / TODOs

1. **No CSS custom properties** despite the design clearly having reusable tokens (greens `#2E7D32` / `#4CAF50`, reds `#d32f2f` / `#c62828`, surface `rgba(20,20,20,0.95)`). Refactor opportunity → [[concepts/Design-Tokens]].
2. **Duplicate / overlapping rules** for `#settings-window` and `#advanced-window` between lines 115 and 152 — second block silently overrides padding & radius. Easy bug source.
3. **`writing-mode: bt-lr`** is invalid CSS3 (was a CSS3 Writing-Modes draft); modern browsers ignore it. Vertical volume slider relies on it together with the deprecated `appearance: slider-vertical`. Likely degraded on current Chrome / Safari.
4. **Hard-coded `right: 180px` on `#terminal-bar`** assumes the exact width of the bottom-right controls block (40+10+40+10+40+10+40 = ~190px with `gap: 10`). One added button breaks the layout.
5. **`transform: scale(1.6)` on `#ui-layer`** affects child measurements and may explain any pixel-blurry HUD text reports.
6. **`z-index: 9999`** — typical "I lost the z-index war" smell. Combined with no scale and no constants, the ladder is brittle.
7. **No accessibility affordances**:
   - `outline: none` on terminal input with no replacement focus ring.
   - No `:focus-visible` styles.
   - No `prefers-reduced-motion` handling for the many transitions.
   - No high-contrast media query.
   - Buttons rely on `title` attrs (set in main.ts) but no `aria-label`.
   - Modals lack any `role="dialog"` / `aria-modal` wiring at the markup level.
8. **No favicon for the actual app** — `public/vite.svg` is the default Vite logo; nothing branded.
9. **No fonts in `public/`** — relies on Inter being installed locally; remote users get the system fallback.
10. **`index.html` is essentially empty** — the entire UI lives in a JS-built `innerHTML` string in `main.ts`. No server-rendered fallback, no `<noscript>`, no SEO content.
11. **Mixed unit systems**: `px`, `vw/vh`, `%` mixed inside the same component; e.g. `#custom-gen-window` uses `80vw/80vh` but its parent `.ui-window` defaults to fixed padding/border-radius — could clip on small viewports despite `max-width: 90vw`.
12. **`cursor: default` on `.btn-smart-reset.default`** — a "button" that visually says "not clickable". Combined with red `modified` variant, communicates state nicely but breaks the affordance of "buttons are clickable".

## Suggested wiki pages

- [[entities/Settings-Window]]
- [[entities/Advanced-Window]]
- [[entities/Custom-Gen-Window]]
- [[entities/Terminal-Bar]] — paired with [[entities/Terminal-Output]]
- [[entities/Volume-Popup]] (with the invisible-bridge trick)
- [[entities/Volume-Visual-Bar]] (right-edge ambient meter)
- [[entities/Gesture-Speed-HUD]]
- [[entities/Dual-Slider]]
- [[entities/Smart-Reset-Button]]
- [[concepts/Modified-Indicator]] (default/modified pattern)
- [[concepts/Pointer-Events-Layering]] (ui-layer none + opt-in children)
- [[concepts/Z-Index-Ladder]] (10/100/150/200/300/500/9999)
- [[concepts/Visibility-Toggle-Class]] (.visible)
- [[concepts/CSS-Magic-Numbers]] — risk register page
- [[concepts/Accessibility-Gaps]]
- [[decisions/No-Design-Tokens]]
- [[sources/style-css]]
- [[sources/index-html]]

---

## Appendix A — DOM topology tree (HTML + JS-built `innerHTML`)

```
html
└── body
    ├── div#app                                    ← only element in index.html
    │   ├── div#ui-layer                           (scale 1.6, pointer-events:none)
    │   │   ├── div#seed-display
    │   │   │   ├── span#ui-seed-label  "Seed: "
    │   │   │   ├── span#ui-seed-val    (click-to-copy)
    │   │   │   ├── span#ui-divider     " | "
    │   │   │   ├── span#ui-time-label  "T: "
    │   │   │   └── span#ui-time-val    (click-to-copy)
    │   │   └── div#controls
    │   │       ├── input#seed-input
    │   │       ├── button#set-seed-btn
    │   │       └── button#random-seed-btn
    │   │
    │   ├── div#bottom-right-controls              (z:100, flex row)
    │   │   ├── button#btn-terminal.control-btn
    │   │   ├── div#sound-container
    │   │   │   ├── div#volume-popup               (z:200, ::before bridge trick)
    │   │   │   │   └── input#volume-slider        (vertical, deprecated APIs)
    │   │   │   └── button#btn-sound.control-btn
    │   │   │       └── svg#icon-sound
    │   │   ├── div#settings-container
    │   │   │   ├── div#settings-window.ui-window
    │   │   │   │   ├── button#btn-fullscreen.btn-small
    │   │   │   │   ├── button#btn-custom-gen.btn-small
    │   │   │   │   ├── button#btn-advanced.btn-small
    │   │   │   │   └── input#speed-slider (range)
    │   │   │   ├── div#advanced-window.ui-window  (position:fixed, z:300)
    │   │   │   │   ├── div#time-fmt-selector
    │   │   │   │   ├── button#btn-reset-time-fmt.btn-smart-reset.default
    │   │   │   │   ├── input#adv-speed-slider
    │   │   │   │   ├── input#adv-speed-input
    │   │   │   │   ├── button#btn-reset-adv-speed.btn-smart-reset.default
    │   │   │   │   ├── button#btn-adv-reset.btn-small
    │   │   │   │   └── button#btn-adv-close.control-btn
    │   │   │   └── button#btn-settings.control-btn
    │   │
    │   ├── div#custom-gen-window.ui-window        (80vw×80vh, z:200)
    │   │   └── div#custom-gen-content             (flex split-pane)
    │   │       ├── div#gen-controls               (flex:1, right-border divider)
    │   │       │   ├── input#custom-seed-input
    │   │       │   ├── select#custom-biome-select
    │   │       │   ├── button#btn-random-preview-seed
    │   │       │   └── div#tree-settings-dropdown-container
    │   │       └── div#gen-preview-container      (flex:2, aspect-ratio 16/9)
    │   │           └── canvas#gen-preview-canvas
    │   │
    │   ├── div#terminal-output-container          (z:150, green-on-black, scrollback)
    │   │   └── div.terminal-line  (× N, runtime)
    │   ├── div#terminal-bar                       (z:150, bottom command bar)
    │   │   └── input#terminal-input
    │   │
    │   ├── div#gesture-slider-container           (z:500, drag-positioned by JS)
    │   │   ├── span#gesture-speed-val
    │   │   └── div#gesture-slider-bar
    │   │
    │   └── canvas#game-canvas                     (the scroller itself)
    │
    └── div#volume-visual-container                (z:9999, runtime-injected)
        └── div#volume-visual-bar
```

> Note: `#volume-visual-container` is appended outside `#app` at runtime
> (`main.ts:1863–1871`) — explains the `position: fixed` + escape-hatch z-index.
