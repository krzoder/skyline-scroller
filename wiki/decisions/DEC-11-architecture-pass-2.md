---
type: decision
status: proposed
date: 2026-05-27
deciders: fszalaj
related:
  - "[[DEC-04-main-decomposition]]"
  - "[[DEC-05-low-code-config]]"
  - "[[plans/architecture-pass-2]]"
  - "[[concepts/test-scenarios]]"
  - "[[entities/Game]]"
  - "[[entities/Terminal]]"
  - "[[entities/CityGenerator]]"
  - "[[systems/procgen]]"
  - "[[systems/ui-shell]]"
---

# DEC-11 — Architecture pass 2

## Context

After DEC-01..05 (RNG, lifecycle, eval-safety, main decomposition, low-code config) + DEC-10 (PR-preview gate), the codebase is in good shape: `main.ts` 427 LOC, 10 `src/ui/` modules, REGIONS as single-source biome data, 67 passing tests. But a second-pass review (5 explore agents + 2 Codex verifiers, 2026-05-27) surfaced a sharper set of refinements - and three "obvious" micro-extractions that should NOT happen.

## Method

- 5 parallel Explore agents investigated engine / procgen / UI / utils+config / test-coverage.
- 2 Codex agents independently verified the proposals.
- Findings consolidated in [[plans/architecture-pass-2]]; canonical 23-test high-ROI cluster catalogued in [[concepts/test-scenarios]].

## Decision

Adopt the **revised** swarm proposals (those Codex A marked APPROVE or REVISE). Drop the three that Codex A blocked. The accepted scope:

### IN scope (do)

1. **Engine HUD/state API**. Stop `Game.update()` from querying `#ui-seed-val` / `#ui-time-val` every frame. Expose a state snapshot (or callback) and let UI subscribe. Restores the engine/UI boundary.
2. **`speed-slider.ts`** extracted from `main.ts` (the ~45 LOC of log10 math + snap-to-1.0x is the only remaining behaviour in the orchestrator).
3. **`SmartResetVisual` helper** — the `default` / `modified` class toggle is duplicated in 3 sites. Extract only the visual-state helper; do NOT bundle the two-click confirmation buttons together (different concerns).
4. **`custom-gen.ts` split** with a single explicit owner of `previewGame` + `refreshPreview()` state, then inject those operations into:
   - `tree-config-editor.ts` (the tree settings DOM)
   - `gen-preview-controls.ts` (pause / speed / refresh / biome / seed bar)
5. **Grouped config modules** (not a flat magic-number dump). Promote tunable constants into `src/config/{game,procgen,terminal,ui}.ts` keeping `src/config.ts` as the barrel. This unblocks the ~16 outstanding magic numbers identified by swarm 4.
6. **`BiomeDefinitionResolver`** that reads weighted choices from `REGIONS` and replaces `CityGenerator.pickMaterial/pickRoof/pickColor`. **Version the deterministic stream** (introduce a `seed-format` bump and a regenerated golden hash in `Determinism.test.ts`) because today's choices are not uniformly distributed, so the resolver changes the seeded output.
7. **REGIONS extension**: declarative `landscapeStyle` per biome (replaces hard-coded shape switch in `Landscape.generateShape`). **Keep** `GroundType` palettes in a shared render/color config — ground types are reusable across biomes, not biome-specific.
8. **Narrow `GameControl` interface**: Terminal (and other UI mutators) depend on the interface, not on `Game`'s public class. Terminal command core can stay outside `ui/` if it consumes only the interface; presentation (`terminal-bind.ts`) stays in `ui/`. This is the REVISE of swarm proposal #4 — do not blindly move the whole 610-LOC file.
9. **Test scaffolding**: add `jsdom` to dev deps for UI logic tests; keep canvas tests in unit form by mocking the few ctx methods actually used (Codex B's recipe). Defer Playwright; 1-2 Chromium smoke tests only if a visual regression escapes.

### OUT of scope (don't do)

- ❌ **Extract `CameraController`** — Codex A BLOCKED. `cameraX/cameraSpeed/setCameraX/getCameraX` are only used inside `Game.reset/update/render/debug`. Splitting introduces indirection without a separate policy.
- ❌ **Extract `RenderPipeline`** — Codex A BLOCKED. `Game.render()` is already a compact composition over Game-owned state. Relocation, not a boundary.
- ❌ **Extract `CachedPattern`** — Codex A BLOCKED. `initNoise` runs on every `reset()` including `setSeed`. A lazy cache that doesn't invalidate on seed change would be a determinism bug.
- ❌ Per-tree species classes (`PineTree`, `OakTree`, ...) from the 2026-05-20 plan — `TREE_SPECS` registry already solves the dispatch; further split is style work, not value.
- ❌ Playwright suite for this size of project. (1-2 Chromium smoke tests acceptable.)

## Consequences

**Gains**
- Engine no longer reaches into UI DOM (HUD/state API is the canonical engine→UI boundary).
- Adding a new biome touches **2 files** (`src/regions/<biome>.ts` + `src/regions/_index.ts`); the resolver does the rest.
- 16+ magic numbers promoted; tunable surface is one barrel import.
- ~50 tests catalogued; 23 high-ROI cluster picked as the implementation first wave.

**Costs**
- The biome resolver shifts the deterministic seed stream once. Documented in [[concepts/determinism]] and the regenerated golden hash in `Determinism.test.ts`. Seeds saved before this DEC will render slightly differently.
- `jsdom` dev dependency added; CI minute cost trivial (~2-3s).

**Reversibility**: every change is one PR per stage, individually revertable.

## Push policy (unchanged from DEC-10)

Branch → PR → fidom preview → `fidom-verified` approval → merge to main → GitHub Pages auto-deploy. Codex review on substantive diffs. Admin merge only when self-hosted runner is offline AND user explicitly authorises (per 2026-05-27 precedent).

## See also

- [[plans/architecture-pass-2]] — staged implementation order
- [[concepts/test-scenarios]] — 23 high-ROI tests to write first
- [[DEC-04-main-decomposition]] — the prior pass that this builds on
- [[DEC-05-low-code-config]] — the low-code config layer this extends
