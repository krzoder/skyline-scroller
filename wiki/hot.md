---
name: Hot cache
description: Rolling current-state snapshot of the project. Overwrite each substantive session.
type: hot
---

# Hot - 2026-05-27 (autonomous-mode session end)

**Status**: 0 open issues. 0 open PRs (besides the wiki-eod PR this entry lives in). Latest on `main`: post-U-DT. Build clean. Bundle ~87 kB / gzip ~25 kB. Tests 78/78. Wersja 1.2.0.

## What shipped today (autonomous mode, all admin-merged under DEC-10 relaxation)

| PR | Stage | Closes | Headline |
|---|---|---|---|
| #43 | DEC-11 Stage A | (DEC-11 step) | HUD state snapshot API; engine stops touching DOM. |
| #35, #36, #37 | dependabot trio | - | vite-ecosystem patch, codeql/release-drafter minor, marocchino major. |
| #44 | dead-code batch 1 | - | Terminal trimLeft->trimStart, Game ctx narrowing, Layer drop unused param, Tree drop unused ALL_TREE_TYPES. |
| #45 | wiki batch 2 | - | Entity source paths refreshed; simplification-plan -> implemented. |
| #46 | utils batch 3 | - | clamp() + generateRandomSeed() extracted; 19 inline sites consolidated. |
| #47 | graphics DPR | - | devicePixelRatio support; sharp on retina + zoom. |
| #62 | R-A reliability | #49 #50 #51 #52 | Game-loop toast, preview-game close on Apply, initial-biome from seed, pickColor reads REGIONS. |
| #63 | O-A biome variety | #53 | Desert/Tundra/City +2nd tree species each. |
| #64 | S-A terminal XSS | #48 | innerHTML -> createElement+textContent for dynamic hints. |
| #65 | P-A cloud globalAlpha | partial #57 | rgba() string allocation drop. |
| #66 | C-A npm audit | #56 | CI fails on high+ vulns. |
| #67 | U-C localStorage | #54 | volume / isMuted / timeFormat / lastSeed persisted. |
| #68 | W-A weather skeleton | #59 | State machine + drop static noise overlay. |
| #69 | P-B keyframe RGB | #57 | Sky keyframes pre-parsed as tuples; 720 ops/s saved. |
| #70 | T-A HSL jitter | partial #61 | Per-building hue/sat/light variation. |
| #71 | W-D rain renderer | partial #60 | 280 vector streaks, pooled Float32Array. |
| #72 | W-E/F/G snow/fog/sand | #60 | Snow particles, fog tint, sandstorm streaks + tint. |
| #73 | U-Weather | partial #55 | Weather stub button -> 6-state cycle. |
| #74 | T-B hash noise | #61 | 80 sub-pixel specks per building cache. |
| #75 | T-X tests | #58 | WeatherSystem + Layer.prune unit tests (9). |
| #76 | U-DT density/terrain | #55 | Both stubs -> 3-state cycle, CityGenerator runtime multipliers. |

**24 PRs merged in this session.** All 14 GitHub issues (#48-#61) plus reopened/discovered ones closed.

## Operational notes

- **DEC-10 relaxation active**. Homelab self-hosted runner offline for >36h; `fidom-verified` gate could not materialise. User explicitly authorised admin-merge with Codex APPROVE + CI green as substitute. Documented in [[DEC-10-pr-preview-on-fidom]] frontmatter (`status: implemented-with-relaxation`, `relaxation_date: 2026-05-27`).
- **fidom.link** still shows stale content until runner returns; the new app lives at `krzoder.github.io/skyline-scroller/` via Pages auto-deploy.
- Remediation plan in [[plans/admin-merge-remediation]] tracks the gate restoration path.

## Big-picture wins shipped today

1. **Engine boundary restored** (#43): Game.update no longer queries DOM; HUD owns its updates via Game.onTick.
2. **Weather system** (W-A through W-G): 5 weather states (clear/rain/snow/fog/sandstorm) with deterministic state machine, per-biome weights, smooth blend transitions, pool-allocated particle renderers.
3. **Per-object building texture variation** (T-A + T-B): HSL jitter + hash-noise grain make adjacent same-material buildings visibly distinct.
4. **DPR sharpness** (#47): retina + zoom now render at device pixels.
5. **localStorage persistence** (#67): volume, mute, time format, last seed survive reloads.
6. **CI security gate** (#66): `npm audit --audit-level=high` blocks vulnerable deps at merge time.
7. **All 3 Custom Gen stub buttons wired** (#73 + #76): Weather 6-cycle, Density 3-cycle, Terrain 3-cycle.
8. **Test infrastructure** (#75): 9 new unit tests for WeatherSystem + Layer.prune.

## Deferred / future work

- Big features the user asked for but parked for future sessions:
  - **Animations**: tree sway, window-break in sandstorm, sand overlay on buildings/cacti. (Issue not filed; tracked in [[plans/weather-textures-animations]].)
  - **UI redesign from scratch**: 6-agent UI swarm research done; design recipes filed in [[plans/weather-textures-animations]] Stage S-U; implementation deferred.
  - **Mountains editor** (Stage U-M): landscape silhouette per-biome editor.
  - **More building types** (Stage O-B): spire, dome-cathedral, ruin, glass-tower variants.
  - **Enterprise hardening** (Stages E-A/E-B/E-C): prefers-reduced-motion gate, CSP + SRI, web-vitals telemetry.

## Open work (carried over)

- 3x `Math.random()` in seed-controls + custom-gen - legitimate entropy entry points; rule update or refactor (low priority).
- CityGenerator pickMaterial/pickRoof are still imperative ladders (pickColor was data-fied in #62; the other two pending).
- Palette extraction (~30 inline colors in `src/ui/`).
- Homelab self-hosted runner health (operational).

## Hard rules clean

D18, D19, deepClone, ALL_BIOMES frozen, SkySystem rng required, INEFFECTIVE_DYNAMIC_IMPORT - all clean.

## See also

- [[log]] - chronological session notes.
- [[plans/weather-textures-animations]] - the master plan for what was shipped + what's deferred.
- [[plans/admin-merge-remediation]] - the gate restoration plan.
- [[DEC-11-architecture-pass-2]] - the second-pass refactor decision.
