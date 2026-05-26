---
type: plan
title: Architecture pass 2 — staged implementation
status: proposed
date: 2026-05-27
deciders: fszalaj
related:
  - "[[DEC-11-architecture-pass-2]]"
  - "[[concepts/test-scenarios]]"
  - "[[plans/simplification-plan]]"
---

# Architecture pass 2 — staged implementation

Builds on [[plans/simplification-plan]] (2026-05-20, Stages 1-9 done). Each stage below is **one PR**, individually revertable, gated by Codex review and (when homelab runner is up) fidom preview verification.

## Stage order

Topological — each stage's dependencies appear in earlier stages.

| # | Stage | Touches | Tests added | Codex gate |
|---:|---|---|---|---|
| A | Engine HUD/state API | `src/engine/Game.ts`, `src/ui/seed-display.ts` (new), `src/main.ts` | `Game.getStateSnapshot()` shape; HUD updates only when value changes | architecture |
| B | `speed-slider.ts` extracted | `src/ui/speed-slider.ts` (new, ~60 LOC), `src/main.ts` (-45 LOC) | log10 math + snap-to-1.0x edge cases | mechanical |
| C | `SmartResetVisual` helper | `src/ui/smart-reset.ts` (new, ~20 LOC), `src/ui/advanced-window.ts`, `src/ui/custom-gen.ts` | toggle predicate cases | mechanical |
| D | Grouped config modules | `src/config/{game,procgen,terminal,ui}.ts` (new), `src/config.ts` (barrel) | promotion targets compile & wire correctly | mechanical |
| E | `custom-gen.ts` split | `src/ui/custom-gen-window.ts` (new), `src/ui/tree-config-editor.ts` (new), `src/ui/gen-preview-controls.ts` (new), `src/ui/custom-gen.ts` (deleted) | 3 modules independently testable | architecture |
| F | `BiomeDefinitionResolver` | `src/procgen/BiomeDefinitionResolver.ts` (new), `src/procgen/CityGenerator.ts`, `src/regions/_index.ts` (weighted shape), `tests/Determinism.test.ts` (golden hash bump) | resolver picks from REGIONS deterministically | architecture + determinism |
| G | REGIONS landscape style | `src/regions/{forest,desert,tundra,plains,city}.ts`, `src/procgen/entities/Landscape.ts` (replace switch with style read) | per-biome style branches | mechanical |
| H | `GameControl` interface for Terminal | `src/engine/GameControl.ts` (new), `src/engine/Terminal.ts` (depend on interface), Game implements it | Terminal compiles against narrow interface; setter calls match | architecture |
| I | jsdom + UI-logic tests | `package.json`, `vitest.config.ts`, ~12 new tests across `src/ui/` | speed-slider + smart-reset + advanced-window logic | mechanical |
| J | Engine + procgen tests | ~11 new tests in `tests/` for Game lifecycle, Layer, BiomeSystem, CityGenerator, SkySystem | the 23-test high-ROI cluster from [[concepts/test-scenarios]] | mechanical |

Stages I + J are kept separate so the test scaffolding (I) doesn't block engine refactor work; the J cluster lands after the refactors so tests assert post-refactor behaviour.

## Per-stage detail

### Stage A — Engine HUD/state API

**Problem**: `Game.update()` (Game.ts:195-220) queries `document.getElementById('ui-seed-val')` and `'ui-time-val'` every frame. Engine reaches across the boundary into UI DOM.

**Fix**: expose `Game.getStateSnapshot()` returning `{seed, cameraX, time, timeFormat, biome}`. Move the HUD update into a new `src/ui/seed-display.ts` that subscribes (via a small rAF tick or a `Game.onTick(cb)` callback registry).

**Codex review focus**: the snapshot must allocate at most once (no per-frame object churn). The callback must not introduce a circular import. Engine retains no UI element references.

**Acceptance**:
- `grep -n "getElementById\|querySelector" src/engine/` returns 0 hits.
- HUD continues to update at ~60fps in DevTools.
- Bundle size delta ≤ +0.3 kB.

### Stage B — `speed-slider.ts`

**Problem**: main.ts:321-365 has the log10 math + snap-to-1.0x for the basic speed slider. Pure behaviour, fits the UI module pattern.

**Fix**: extract `initBasicSpeedSlider({game, speedSlider, getSpeedFromSlider, getSliderFromSpeed, advanced})` into `src/ui/speed-slider.ts`. Export the two pure functions for tests.

**Acceptance**:
- `main.ts` no longer references the slider element or the conversion functions.
- `getSpeedFromSlider(-1) === 0.1`, `(0) === 1`, `(1) === 10` (exact).

### Stage C — `SmartResetVisual` helper

**Problem**: `default` / `modified` class toggle duplicated in `advanced-window.ts:updateResetButton` (3 call sites) + `custom-gen.ts` per-tree row + `custom-gen.ts` global reset-all button.

**Fix**: `src/ui/smart-reset.ts` exporting one function:
```typescript
export function updateSmartResetVisual(btn: HTMLElement, isDefault: boolean): void;
```
NO confirmation behaviour, NO click wiring — those are different concerns. Per Codex A's REVISE.

**Acceptance**: every site uses the single helper; no remaining inline `classList.toggle('default', ...)`.

### Stage D — Grouped config modules

**Problem**: 16+ magic numbers (SEED_MAX_RANGE, BUILDING_WIDTH_MIN/MAX, CITY_DNA_*, GROUND_STRIPE_WIDTH, SPEED_CLAMP_*, etc.) live inline across CityGenerator/SkySystem/Landscape/Terminal. Per Codex A's REVISE: don't dump them all in a flat `config.ts`; group by domain.

**Fix**:
- `src/config/game.ts` — CAMERA_SPEED_PX_PER_S, GROUND_HEIGHT_PX, LAYER_PRUNE_BUFFER, SPEED_CLAMP_*, DEFAULT_VOLUME.
- `src/config/procgen.ts` — BUILDING_WIDTH_*, BUILDING_HEIGHT_*, FILLER_WIDTH_*, FEATURE_HEIGHT_*, CITY_DNA_*, GROUND_STRIPE_WIDTH, BIOME_DURATION_*.
- `src/config/terminal.ts` — SEED_MAX_RANGE, EXPRESSION_MAX_LENGTH (if added).
- `src/config/ui.ts` — anything UI-only (toast timers, gesture thresholds).
- `src/config.ts` — barrel re-export so existing imports keep working.

**Acceptance**: every numeric literal flagged in swarm 4's table now imports from `@/config/*`.

### Stage E — `custom-gen.ts` split

**Problem**: 593 LOC, three intertwined responsibilities (panel lifecycle / tree-config editor / preview controls). Codex A's REVISE: explicit ownership of `previewGame` + `refreshPreview()` shared state.

**Fix**:
- `src/ui/custom-gen-window.ts` (~100 LOC): owns `previewGame`, `refreshPreview()`, open/close/Apply/Reset confirm. Exposes `{openWindow, closeWindow, isOpen, getPreview, refresh}` to the inner modules.
- `src/ui/tree-config-editor.ts` (~300 LOC): renderTreeSettings + 6 row components. Receives `{previewGame, refresh}` injected.
- `src/ui/gen-preview-controls.ts` (~100 LOC): pause/speed/refresh/biome/seed bar. Receives `{previewGame, refresh}` injected.
- Delete `src/ui/custom-gen.ts`.

**Acceptance**: each new module < 350 LOC; no module owns `previewGame` other than the window controller; smoke test (open / edit tree / apply / close / re-open) identical UX.

### Stage F — `BiomeDefinitionResolver`

**Problem**: `CityGenerator.pickMaterial/pickRoof/pickColor` hardcodes hue/saturation/lightness logic that REGIONS already declares. Adding a biome requires editing CityGenerator. Per Codex A's REVISE: today's choices are NOT uniformly distributed (some have explicit weights). Encode weights, then resolve.

**Fix**:
- Extend `BiomeDefinition` with `materials: Array<{type: BuildingMaterial; weight: number}>` etc.
- `src/procgen/BiomeDefinitionResolver.ts` exports `pickMaterial(biome, rng)`, `pickRoof(biome, rng)`, `pickColor(biome, rng)`.
- CityGenerator delegates to resolver; the 3 switch ladders go.
- **Deterministic stream changes**. Bump `seed-format-version` (introduce if missing); regenerate the golden hash in `Determinism.test.ts`. Note in [[concepts/determinism]] that seeds saved before DEC-11 render slightly differently.

**Acceptance**: `grep -n "pickMaterial\|pickRoof\|pickColor" src/procgen/CityGenerator.ts` returns 0. Determinism test green against new hash. New biome added in a single PR by adding `src/regions/<biome>.ts` + 1 line in `_index.ts`.

### Stage G — REGIONS landscape style

**Problem**: `Landscape.generateShape()` switches on biome with hardcoded geometry (peaks for tundra, dunes for desert, etc.). Codex A's REVISE: keep `GroundType` palettes separate (ground types are reusable across biomes).

**Fix**:
- Extend `BiomeDefinition` with `landscapeStyle: 'peaked' | 'tiered' | 'silhouette' | 'flat' | 'dunes'`.
- `Landscape.generateShape()` reads style from REGIONS.
- Ground palette stays in `src/config/ui.ts` (or `src/render/ground-palette.ts`) — NOT in REGIONS.

**Acceptance**: `grep -n "case '\(desert\|tundra\|forest\|plains\|city\)'" src/procgen/entities/Landscape.ts` returns 0.

### Stage H — `GameControl` interface for Terminal

**Problem**: Terminal (610 LOC) is in `src/engine/` but is presentation-layer. Codex A's REVISE: don't blindly move it; carve out the narrow interface it actually needs.

**Fix**:
- `src/engine/GameControl.ts` — interface listing the exact setters Terminal uses (`setSeed`, `setTimeScale`, `setVolume`, `setMuted`, `getSnapshot`, `getCurrentBiome`, `forceBiome`).
- `Game implements GameControl`.
- Terminal accepts `GameControl`, not `Game`. Command core stays in `src/engine/` (it's logic, not presentation); but `terminal-bind.ts` (already in `src/ui/`) owns the DOM.

**Acceptance**: `Terminal.ts` imports zero engine concretes — only `GameControl` + types. `terminal-bind.ts` is the only file touching the terminal DOM.

### Stage I — jsdom + UI-logic tests

**Setup**:
- `npm i -D jsdom @vitest/coverage-v8`.
- `vitest.config.ts` adds `environment: 'jsdom'`.

**Tests added** (12, per Codex B's high-ROI cluster):
1. `speed-slider.test.ts` — log10 math + snap-to-1.0x.
2. `advanced-window.test.ts` — `speedRange(1)` returns `{0, 20}`; `getAdvSpeedFromSlider(0, 1)` returns 0 (regression #38).
3. `advanced-window.test.ts` — `onSpeedChange` pins basic bar to ±1 outside [0.1, 10] (regression #39).
4. `smart-reset.test.ts` — visual toggle.
5. `seed-controls.test.ts` — input read / write.
6. `error-toast.test.ts` — debounce.
7. `keyboard-shortcuts.test.ts` — 't' opens terminal.
8. `terminal-bind.test.ts` — quoted args + multi-arg parse.
9. `audio-controls.test.ts` — mute toggle, volume slider.
10. `gestures.test.ts` — pointer-lock cleanup on dblclick reset.
11. `custom-gen-window.test.ts` — preview disposed on close.
12. `tree-config-editor.test.ts` — `isTreeModified` comparison with DEFAULT_TREE_CONFIG.

### Stage J — Engine + procgen tests (~11)

The remaining members of the 23-test high-ROI cluster — see [[concepts/test-scenarios]] for the concrete numeric assertions. Focus:
- Layer snap with deterministic numeric inputs (regression #40).
- Game dt clamp + timeScale multiplication.
- Game `dispose()` cancels RAF and removes resize listener (idempotent).
- Game `setSeed` recreates generator (not in-place mutation).
- BiomeSystem `forceBiome` duration boundary.
- BiomeSystem transition membership against `REGIONS[from].transitionsTo`.
- CityGenerator deterministic stream with seed 42 (golden output).
- CityGenerator `config` deep-clone isolation.
- SkySystem time wrap at 24 with concrete seed.
- SkySystem keyframe interpolation midpoint.
- SkySystem deterministic initial cloud state.

## Estimated impact

| Bucket | LOC delta |
|---|---:|
| Stage A (HUD/state API) | +30 / -20 (net +10) |
| Stage B (speed-slider) | +60 / -45 (net +15) |
| Stage C (smart-reset) | +20 / -40 (net -20) |
| Stage D (grouped config) | +60 / -30 (net +30) |
| Stage E (custom-gen split) | +500 / -593 (net -93) |
| Stage F (BiomeDefinitionResolver) | +120 / -70 (net +50) |
| Stage G (REGIONS landscape style) | +30 / -50 (net -20) |
| Stage H (GameControl interface) | +40 / -10 (net +30) |
| Stage I (jsdom + UI tests) | +300 (new tests) |
| Stage J (engine + procgen tests) | +250 (new tests) |
| **Total** | **+1100 / -858 (net +242)** — most of which is new tests |

Plus structural wins:
- Engine no longer touches UI DOM.
- Adding a biome: 2 files.
- 16+ magic numbers promoted, grouped by domain.
- ~50 catalogued tests; 23 high-ROI cluster lands as part of the plan.

## See also

- [[DEC-11-architecture-pass-2]] — the formal decision
- [[concepts/test-scenarios]] — concrete numeric tests
- [[plans/simplification-plan]] — prior pass
- [[maps/dependencies]] — module graph (will be regenerated after Stage E + H)
- [[maps/complexity]] — LOC + CC ranking (regenerate after Stage E)
