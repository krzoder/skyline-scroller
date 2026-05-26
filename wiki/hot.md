---
name: Hot cache
description: Rolling current-state snapshot of the project. Overwrite each substantive session.
type: hot
---

# Hot - 2026-05-27 (post-merge: speed UX + pixel-snap both shipped)

**Status**: 0 open PRs. 0 open issues. Latest on `main`: 0079d1c. Build clean. Bundle 79.42 kB / gzip 22.74 kB (after #42 pixel-snap; #41 added no net bytes). Tests 67/67. Wersja 1.2.0.

## Merged today (2026-05-26 -> 2026-05-27 UTC)

| PR | Commit | Closes | Summary |
|---|---|---|---|
| [#41](https://github.com/krzoder/skyline-scroller/pull/41) | 0079d1c | #38, #39 | Speed slider strictly non-negative; basic bar pins to extremes when Advanced drives outside [0.1, 10]. |
| [#42](https://github.com/krzoder/skyline-scroller/pull/42) | 77f8bb3 | #40 | `Layer.draw` snaps `layerViewX` to integer device-pixel grid (`Math.round(cameraX * speedModifier * effectiveScale) / effectiveScale`). Layer translates in whole-pixel steps; border shimmer fixed. Codex APPROVE. |

### DEC-10 footnote (operational gap noticed today)

Both PRs were admin-merged (branch-protection bypass) because the self-hosted homelab runner failed to pick up `Deploy preview to fidom` for ~3 hours. The `Await manual fidom verification` required-status-check never materialised so the gate could not be approved. User explicitly authorised the bypass. **Not a default operating mode** — fidom verification is the canonical gate. If the runner stays flaky we should reassess DEC-10 or add a runner-health check / fallback path.

## Engine snapshot (post-#42)

`src/engine/Layer.ts:32-39` is now the single point that decides where a parallax layer renders. All four layers (speedModifier 0.2/0.4/0.6/1.0; bg scale 1.3; others 1.0) share the snap. `Game.scaleFactor = 1.6` is now passed in as a draw parameter rather than implicit.

Per-entity edges may still anti-alias if `entity.x * effectiveScale` is non-integer (stable AA, no jitter). Separate refactor would touch every `drawImage`/`fillRect` call site - not done yet.

## UI snapshot (post-#41)

`src/ui/advanced-window.ts` slider is monotonic "stop -> fast" end-to-end. `speedRange` returns `{0, 20}` for the default centre, `{max(0, center-10), center+10}` otherwise. Negative / reverse speeds reachable only through the input text box (which still uses `evalExpression` + `[-10000, 10000]` clamp).

`src/main.ts` `advanced.onSpeedChange`: out-of-range pinned to extreme (`-1` for slower than 0.1x, `+1` for faster than 10x) instead of the misleading centre snap-back.

## Deploy story (DEC-10)

- **GitHub Pages (`krzoder.github.io/skyline-scroller/`)** = production. Auto-deploys on push to `main` via `deploy.yml`. Both merges will trigger.
- **fidom.link (`skyline-scroller.fidom.link`)** = PR preview. `pr-preview.yml` builds on ubuntu-hosted, deploys via self-hosted homelab runner.
- **Approval gate**: `fidom-verified` Environment with required reviewer. **Today's bypass was an exception; runner-online is the steady state.**
- One-time setup tracked in [[operations/dec-10-manual-setup]].

## Wielka dekompozycja main.ts (DEC-04, unchanged)

main.ts: 1722 -> 427 LOC (-75.2%). 10 modules in `src/ui/`.

## Hard rules all clean

- D18 (`Function()` eval), D19 (`Math.random()` in preview), deepClone, ALL_BIOMES frozen, SkySystem rng required, `[INEFFECTIVE_DYNAMIC_IMPORT]` Vite warning. All addressed.

## Tests

5 plików, 67 case'ów. No new tests in #41/#42. Visual / rendering bugs - hard to unit-test; relying on Codex review + manual verification. Determinism tests (3) still pass.

## Open work (deferred)

- 3x `Math.random()` w `src/ui/seed-controls.ts` + `src/ui/custom-gen.ts` - legitimate entropy entry points after decomposition.
- CityGenerator `pickMaterial`/`pickRoof`/`pickColor` - REGIONS-aware refactor pending determinism test extension.
- **Per-entity pixel snap** (follow-up to #42) - currently entity edges still anti-alias; could remove residual blur with another sweep across `drawImage`/`fillRect` sites. Low priority unless visually objectionable on fidom.
- Palette extraction (~30 inline colors in `src/ui/`).
- **Homelab self-hosted runner health** - flaky/offline today; review before next non-trivial PR.
