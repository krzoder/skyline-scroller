---
name: Hot cache
description: Rolling current-state snapshot of the project. Overwrite each substantive session.
type: hot
---

# Hot - 2026-05-27 (arch pass 2 in flight)

**Status**: main HEAD includes Stage A (HUD state API) + dead-code batch 1 + 3 dependabot bumps. PR #45 (wiki batch 2) in flight. 0 open issues. Tests 67/67. Build clean. Bundle 80.10 kB / gzip 22.95 kB.

## Recently merged today (in order)

1. PR #43 (Stage A): `Game.getStateSnapshot()` + `onTick(cb)`; HUD DOM ownership moved to `src/ui/seed-display.ts`. Engine no longer touches DOM.
2. PR #35: vite 8.0.13 -> 8.0.14, vitest 4.1.6 -> 4.1.7 (patch).
3. PR #36: codeql-action 4.35.5 -> 4.36.0, release-drafter 7.3.0 -> 7.3.1 (minor).
4. PR #37: marocchino/sticky-pull-request-comment 2.9.1 -> 3.0.4 (major, Node-runtime bump only).
5. PR #44 (dead-code batch 1): Terminal trimLeft->trimStart, Game ctx honest null narrowing, Layer.draw drop `_screenHeight`, Tree drop unused `ALL_TREE_TYPES`.

## In flight

- PR #45: wiki accuracy - 6 entity pages have correct `source:` (engine -> procgen/entities/) + refreshed loc; simplification-plan flipped to `implemented`.

## DEC-11 architecture pass 2 — staged plan

See [[DEC-11-architecture-pass-2]] + [[plans/architecture-pass-2]].

**Adopted (9 stages)**:
- A. ✅ Engine HUD/state API (PR #43).
- B. speed-slider.ts extracted from main.ts.
- C. SmartResetVisual helper (3 sites of `default`/`modified` toggle).
- D. Grouped config modules (`src/config/{game,procgen,terminal,ui}.ts` + barrel).
- E. custom-gen.ts split (window / tree-editor / preview-controls) with single owner of previewGame.
- F. BiomeDefinitionResolver from REGIONS. Determinism stream changes; golden hash bump.
- G. REGIONS landscape style declarative; ground palettes stay in shared render config.
- H. Narrow GameControl interface for Terminal.
- I. jsdom dev dep + 12 UI-logic tests.
- J. 11 engine + procgen tests from the 23-test high-ROI cluster.

**Blocked (BLOCK by Codex A)**: CameraController, RenderPipeline, CachedPattern extractions (micro-relocations without boundary).

## Dead-code remaining batches

- Batch 3: CSS selector dedup (only - `.setting-group` + `!important` overlap with Stage B/inline-style overrides per Codex M).
- Batch 4: registry `id` field removal (coordinate with Stage F).
- DEFERRED: complexity + dependency maps regen until after E+H.

## Hard rules clean

D18, D19, deepClone, ALL_BIOMES frozen, SkySystem rng required, INEFFECTIVE_DYNAMIC_IMPORT - all addressed previously.

## Operational caveat

Homelab self-hosted runner offline for ~24h. `fidom-verified` gate doesn't materialise without it. Admin merge is the current pragmatic path with CI + Codex as the substitute gates. Reassess DEC-10 if the runner stays flaky.

## Open work

- DEC-11 Stages B-J.
- Per-entity pixel snap (follow-up to #42).
- 3x `Math.random()` in `src/ui/seed-controls.ts` + `src/ui/custom-gen.ts` - legitimate entropy entry points; rule update or refactor.
- Palette extraction (~30 inline colors in `src/ui/`).
- Homelab self-hosted runner health.
