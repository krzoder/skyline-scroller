---
name: Hot cache
description: Rolling current-state snapshot of the project. Overwrite each substantive session.
type: hot
---

# Hot - 2026-05-26 (mid-day, 2 PRs awaiting fidom approval)

**Status**: 2 open PRs (#41 speed slider UX, #42 layer pixel-snap). 0 closed-but-unmerged. 3 issues active (#38, #39, #40) - all assigned fszalaj, all blocked on merge of their fix PR. Build clean. Bundle 79.42 kB / gzip 22.74 kB. Tests 67/67. Wersja 1.2.0. Last merge to main: d4220d2 (DEC-10 manual setup tracking, 2026-05-20).

## In-flight PRs

| PR | Branch | Closes | Status | Note |
|---|---|---|---|---|
| [#41](https://github.com/krzoder/skyline-scroller/pull/41) | `fix/speed-controls` | #38, #39 | All CI green; **fidom preview CANCELLED by #42 push** | Needs empty-commit re-trigger or merge of #42 first |
| [#42](https://github.com/krzoder/skyline-scroller/pull/42) | `fix/biome-border-flicker` | #40 | Building (in progress as of last poll) | Holds the live fidom preview right now |

**Concurrency reminder**: `fidom-preview` workflow group has `cancel-in-progress`. Latest PR push wins. Documented in PR sticky comments.

## What changed today (2026-05-26)

### #41 - speed slider UX (#38 + #39)

- `src/ui/advanced-window.ts`: slider strictly non-negative. `speedRange` returns `{0, 20}` for default centre; non-default centre uses `{max(0, center-10), center+10}`. Mapping: slider 0..500 → speed 0..1, 500..1000 → 1..max.
- `src/main.ts` `advanced.onSpeedChange`: out-of-range advanced speeds pin basic bar to extreme (-1 / +1) instead of snapping to centre.
- Reverse / negative scrolling now reachable only via the input text box.

### #42 - layer pixel-snap (#40)

- `src/engine/Layer.ts`: `Layer.draw` gains `scaleFactor` parameter, snaps `layerViewX = Math.round(cameraX * speedModifier * effectiveScale) / effectiveScale`. Whole layer translates in integer device-pixel steps; edges no longer wobble between columns.
- `src/engine/Game.ts`: passes `this.scaleFactor` to each `layer.draw(...)` call.
- Verified by parallel Explore agent + Codex (independent investigation -> approve).
- Per-entity edges may still anti-alias (if `entity.x * effectiveScale` non-integer) - that's a STABLE blend (no jitter) and a separate follow-up if desired.

## Deploy story (unchanged from 2026-05-20)

- **GitHub Pages (`krzoder.github.io/skyline-scroller/`)** = production, auto-deploys on push to `main`.
- **fidom.link (`skyline-scroller.fidom.link`)** = PR preview. `pr-preview.yml` builds PR HEAD on ubuntu-hosted, atomic-swaps via self-hosted homelab runner.
- **Approval gate (BLOCKING merge)**: `fidom-verified` Environment with required reviewer (self). Approve in Actions UI to unblock merge.
- One-time setup tracked in [[operations/dec-10-manual-setup]].

## Wielka dekompozycja main.ts (DEC-04 implemented)

main.ts: 1722 -> 427 LOC (-75.2%). 10 modules in `src/ui/`. (Details unchanged from 2026-05-20 hot cache - see `log.md`.)

## Hard rules all clean

- D18 (`Function()` eval), D19 (`Math.random()` in preview), deepClone, ALL_BIOMES frozen, SkySystem rng required, `[INEFFECTIVE_DYNAMIC_IMPORT]` Vite warning - all addressed.

## Tests

5 plików, 67 case'ów. No new tests in #41/#42 (UI rendering / Canvas2D - hard to unit-test; visual verification on fidom is the gate).

## Open work (deferred)

- 3x `Math.random()` w `src/ui/seed-controls.ts` + `src/ui/custom-gen.ts` - legitimate entropy entry points after decomposition; rule update or refactor.
- CityGenerator `pickMaterial`/`pickRoof`/`pickColor` - REGIONS-aware refactor pending determinism test extension.
- Per-entity pixel snap (follow-up to #42) - currently entity edges still anti-alias; could remove residual blur with another sweep across draw calls.
- Palette extraction (~30 inline colors in `src/ui/`).
