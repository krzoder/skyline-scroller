---
name: Skyline Scroller Master Simplification Plan
description: Single source-of-truth plan that consolidates DEC-01..05 (plus prospective DEC-06/07) and 15 swarm scans into 10 commit-sized stages. Pre-commit Codex review per stage, direct push to main, each stage individually revertable.
type: plan
status: implemented
date: 2026-05-20
completed: 2026-05-27
followup: "[[plans/architecture-pass-2]] for second-pass refactor work (DEC-11)"
deciders: fszalaj
related:
  - "[[DEC-01-unified-rng]]"
  - "[[DEC-02-lifecycle]]"
  - "[[DEC-03-safe-eval-and-error]]"
  - "[[DEC-04-main-decomposition]]"
  - "[[DEC-05-low-code-config]]"
  - "[[entities/Game]]"
  - "[[entities/main]]"
  - "[[entities/Random]]"
  - "[[entities/BiomeSystem]]"
  - "[[entities/CityGenerator]]"
  - "[[entities/Terminal]]"
  - "[[entities/SkySystem]]"
  - "[[entities/Tree]]"
  - "[[entities/TreeConfig]]"
  - "[[entities/Building]]"
  - "[[entities/Landscape]]"
  - "[[systems/game-loop]]"
  - "[[systems/procgen]]"
  - "[[systems/ui-shell]]"
  - "[[systems/css-architecture]]"
  - "[[systems/terminal]]"
  - "build deploy"
  - "[[operations/codex-integration]]"
  - "[[concepts/determinism]]"
  - "escape priority stack"
  - "idempotent render"

---

# Skyline Scroller — Master Simplification Plan

## Executive summary

The project today is a single-side-effect `src/main.ts` (1894 LOC, CC=215, 0 exports) orbiting an otherwise clean DAG of 16 small modules (~2400 LOC total). Determinism is claimed but broken in five places (`Math.random()` in `Game.initNoise`, `Landscape.generateShape/decorate`, `Building` windows, `Tree` cactus flowers, plus `Date.now()` in `SkySystem`). The terminal `speed` command is a `new Function()` RCE surface. The Apply button is double-bound. The repo carries a 5 MB nested legacy wiki (`./skyline-scroller/`, 27 .md + a 173 KB `ts_contents.json` LLM-scrap dump) plus a 3.9 MB older mirror at `./docs/knowledge_base/`. Configuration is a thousand scattered hex literals; biomes are encoded imperatively across `BiomeSystem.ts` + `CityGenerator.ts` switch-ladders; there is no `vite.config.ts`; `package.json` still says `1.0.0-beta` while commits say `1.1.2`.

After this plan: **deterministic seed → identical scene across reloads**; safe arithmetic parser replacing the eval; idempotent `Game.dispose()` killing the `previewGame` rAF leak; `main.ts` shrunk to a 20-line bootstrap with nine `src/ui/*` modules; declarative biomes in `src/regions/`; design tokens in `src/config/` + CSS `:root`; single `vite.config.ts` with `PUBLIC_BASE_PATH` env; version pulled from `package.json` at build time; Cloudflare Worker outpost (DEC-06) for shareable seed permalinks; SHA-pinned, composite-action-driven workflows (DEC-07). Strictly retained: the visible game (every pixel byte-for-byte under a fixed seed), every existing terminal command, every keyboard shortcut, every DOM ID, the entire Canvas-only no-dependencies runtime stance, the `Renderable` DAG layering.

Net delta: **−2500 LOC removed / +1200 LOC added / −1300 LOC net**, plus structural wins (no eval, no rAF leak, deterministic procgen, low-code biomes).

## Slop inventory — DELETE

Everything in this table is dead, duplicated, or wholesale superseded. No replacement needed beyond what the simplification/expansion inventories below already add.

| Target | LOC / size | Reason | Source |
|---|---:|---|---|
| `./skyline-scroller/` (whole folder, 27 .md + `.obsidian/`) | ~5.0 MB | Legacy swarm-output wiki. Every page is SUPERSEDED by `wiki/entities|systems|concepts|operations/*`. Invariants 1–11 lifted in Stage 1; nothing left to preserve. | agent 11 wiki drift |
| `./skyline-scroller/md_contents.json` | 52 KB | Flat LLM-scrap dump of every .md from the prior swarm. Not knowledge. | agent-11 |
| `./skyline-scroller/ts_contents.json` | 173 KB | Flat LLM-scrap dump of every .ts from the prior swarm. Not knowledge. | agent-11 |
| `./skyline-scroller/.obsidian/` | — | Stale per-vault config + Local REST API keys for a vault we no longer use. Audit then remove. | agent-11 |
| `./docs/knowledge_base/` (whole folder, 13 .md) | ~3.9 MB | Strict older subset of `./skyline-scroller/`. 8 of 13 are byte-identical mirrors; others are older. Superseded by new wiki same as parent. | agent-11 |
| `src/engine/Building.ts:drawCactus` — `flowerPos === 'top'` branch | ~8 LOC | Unreachable: `flowerPos` is only ever assigned `'left'` or `'right'` in `Tree.ts` cactus path. Dead code per agent-06. | agent 06 entities |
| `src/procgen/TreeConfig.ts:60` — `let currentTreeConfig` module-level singleton | 1 LOC + transitive usages | Nothing reads it. Mutated by `resetTreeConfigToDefault()` and that's it. Dead state. | agent 07 procgen |
| `src/procgen/TreeConfig.ts` — `resetTreeConfigToDefault()` helper | ~6 LOC | Paired dead code with the singleton above. No callers. | agent-07 |
| `src/main.ts:1369` — duplicate `btnGenApply.addEventListener` | ~14 LOC | D12 (Codex CONFIRMED). Earlier handler at `main.ts:698` is the canonical one and survives the `custom-gen.ts` extraction. | [[DEC-04-main-decomposition]] |
| `src/main.ts:1382` — duplicate `btnGenClose.addEventListener` | ~5 LOC | One survives (the one extended in DEC-02 to call `previewGame?.dispose()`); the other goes. | [[DEC-02-lifecycle]] |
| `src/engine/Landscape.ts:Landscape.draw` — double-paint (super.draw + fillRect flood) | ~3 LOC | Two paints for one frame. Drop the flood; keep `super.draw`. | agent 05 landscape ground layer |
| `src/engine/Terminal.ts` — `biome` command usage string + 6-entry biome autocomplete | ~10 LOC | D11. Usage advertises writable; command is read-only. Either make it writable (out of scope here) or trim the lie. Stage 1 trims; future DEC can re-add write. | agent 03 terminal |
| `src/main.ts:1895` — Polish signoff comment | 1 LOC | "Żadna komórka mózgowa nie ucierpiała…" Author's tombstone on the file. Goes with the file when `main.ts` shrinks to 20 LOC. Keep the spirit, not the comment. | [[DEC-04-main-decomposition]] |
| `src/main.ts:735` — second `import { Tree }` line | 1 LOC | Already imported transitively + at line 713. Symptom; dies in DEC-04 extraction. | agent 13 complexity deps |
| `src/main.ts:3-5` — `alert(...)` global error handler | 3 LOC | D13. Replaced by toast in DEC-03. | [[DEC-03-safe-eval-and-error]] |
| `src/engine/Terminal.ts:207-211` — `Function('… return (${inputStr});')` | ~5 LOC | D10 / RCE surface. Replaced by `parseExpr` in DEC-03. | [[DEC-03-safe-eval-and-error]] |
| `src/style.css:329-338` — `writing-mode: bt-lr` + `-webkit-appearance: slider-vertical` | ~10 LOC | D14. Both removed from Chromium 2021–2024; slider is broken in every modern browser. Replaced by rotated-container + `@supports (writing-mode: vertical-lr)` in DEC-05. | agent 09 css html |
| `src/style.css` — z-index collisions (`terminal-bar`/`terminal-output-container` both 150; `custom-gen-window`/`volume-popup` both 200; double-declared `settings-window`/`advanced-window`) | ~6 sites | D15. Replaced by single `--z-*` ladder in DEC-05. | agent-09 |
| `src/counter.ts` | 9 LOC | Vite scaffold leftover. Zero imports, zero usages. | agent-13 |

**Slop subtotal: ≈ 2500 LOC removed** (legacy wiki + JSON dumps + `main.ts` duplication + dead branches + counter).

## Simplification inventory — REPLACE with simpler equivalent

| Site | Current | Replacement | Source |
|---|---|---|---|
| ~15 sites of `JSON.parse(JSON.stringify(x))` across `main.ts` (treeConfig clones, preview state, biome snapshots) | 15× idiom | Single `deepClone<T>(x: T): T` in `src/utils/deepClone.ts`. Uses `structuredClone` with `JSON` fallback. | agent-13 |
| 3 bespoke window controllers (Settings 614–626, Advanced 575–584, Custom-Gen 655–711) — each re-implementing open/close/Escape/click-outside | ~150 LOC of copy-paste | Single `Window` class + escape-priority registry in `src/ui/window-manager.ts` per DEC-04. Each window becomes ~10 LOC of `new Window(el, {escapePriority: N})`. | [[DEC-04-main-decomposition]] |
| `renderTreeSettings()` (`main.ts:887–1310`, 420 LOC, deeply nested `forEach`) | 1 monster function | `src/ui/tree-settings-renderer.ts` with six per-row components: `renderTreeRow`, `renderBiomeChips`, `renderDualSlider`, `renderHeightInputs`, `renderFlowerSlider`, `renderTreeIcon`. Each ≤60 LOC. | DEC-04 |
| Two duplicated `cancelResetConfirm()` paths in `main.ts` (one for advanced reset, one for custom-gen reset) | 2 closures | Single `ResetConfirm` helper exported from `window-manager.ts`. | DEC-04 |
| Hex literals in `src/engine/{Building,Tree,Ground,Landscape,SkySystem}.ts` (~40 distinct hex/rgba) | inline | `src/config/colors.ts` `COLORS` registry; engine consumes `COLORS.tree.bark.oak` etc. Same hexes referenced by CSS via `:root --c-*`. | [[DEC-05-low-code-config]] |
| `Game.reset()` inline parallax layer construction (`Game.ts:111-114`) | 4 inline `new Layer(...)` | `PARALLAX_LAYERS.map(c => new Layer(c.speedModifier, c.zIndex, c.yOffset, c.scale))` from `src/config/parallax.ts`. | DEC-05 |
| `SkySystem` 17-keyframe inline array (`SkySystem.ts:9-25`, 51 inline color strings) | 51 literals | `COLORS.sky.keyframes` in config. SkySystem imports the constant. | DEC-05 |
| `BiomeSystem.ts:11-17` adjacency graph + `CityGenerator.ts:196-231` `pickMaterial`/`pickRoof`/`pickColor` switch ladders | imperative table + 3 switch ladders, ~70 LOC | `src/regions/{forest,desert,tundra,plains,city}.ts` declarative `BiomeDefinition` files, registered in `src/regions/_index.ts`. `BiomeSystem` rewritten to ~40 LOC; `CityGenerator.pickX` becomes weighted-uniform draw over registry. | DEC-05 |
| `Math.random()` sites in `Game.initNoise`, `Landscape.generateShape/decorate`, `Building` window code, `Tree` cactus flowers | 6 sites + 1 `Date.now()` in `SkySystem` | All take `rng: Random` forked from `rootRng` via `Random.fork(label)`. | [[DEC-01-unified-rng]] |
| `new Function('… return (${inputStr})')` in `Terminal.speed` | RCE surface | `src/engine/Expression.ts` recursive-descent parser (~100 LOC); rejects identifiers other than `π` and `e`. | [[DEC-03-safe-eval-and-error]] |
| `alert(...)` in global error handler | Modal storm | `#error-toast` div, debounced 250 ms, auto-hide 4 s, `aria-live="assertive"`. `console.error` always called. | DEC-03 |
| Three workflows duplicating `checkout → setup-node → npm ci` + `--base=` CLI flag | 3× copy-paste | `.github/actions/setup/action.yml` composite + `PUBLIC_BASE_PATH` env, SHA-pinned third-party actions. | DEC-05 §6 |
| `package.json:4 = "1.0.0-beta"` vs commits saying `1.1.2` | Drift | Bump `package.json` to `1.1.2`; `vite.config.ts` injects `__PACKAGE_VERSION__`; `src/config/version.ts` re-exports as `VERSION`. | DEC-05 §4, D17 |

**Simplification net: ≈ −400 LOC** (the replacements are smaller than what they replace).

## Expansion inventory — ADD to make the system API-modifiable

These additions are the "easily expandable and modifiable with API" surface the user asked for. They are deliberate spend on structure that pays for itself within one feature addition.

| Addition | LOC | What it unlocks | Source |
|---|---:|---|---|
| `src/utils/deepClone.ts` | ~15 | One canonical clone helper; eliminates JSON-clone idiom. | DEC-04 + agent-13 |
| `src/config/{index,colors,timing,parallax,version}.ts` | ~150 | Single palette + timing constants registry. Designers/agents edit one file. | [[DEC-05-low-code-config]] |
| `src/regions/{types,_index,forest,desert,tundra,plains,city}.ts` | ~250 | Declarative biomes. Adding a 6th biome = drop one file + one import. | DEC-05 §2 |
| `vite.config.ts` (root) | ~25 | Single `define` for `__PACKAGE_VERSION__`; `PUBLIC_BASE_PATH` env replaces 3 duplicated CLI flags; place to register Vite plugins/aliases later. | DEC-05 §3 |
| `:root { --c-*, --z-* }` token block + token-aware CSS | ~80 | Single theme surface; future "theme picker" is `documentElement.style.setProperty(...)`. | DEC-05 §5 |
| `Random.fork(label)` + `nextInt` guard + `Determinism.test.ts` golden-stream test | ~30 + ~80 tests | Decoupled per-subsystem RNG streams; shareable seeds; snapshot regression tests. | [[DEC-01-unified-rng]] |
| `Game.dispose()` rewrite (rafId + resizeHandler fields) + `previewGame?.dispose()` call site | ~25 | Idempotent teardown; preview window can be opened+closed indefinitely without leaks. | [[DEC-02-lifecycle]] |
| `src/engine/Expression.ts` recursive-descent parser + `tests/Expression.test.ts` | ~150 + ~30 tests | Safe arithmetic eval; no RCE; parser is reusable by other future commands. | [[DEC-03-safe-eval-and-error]] |
| `src/ui/window-manager.ts` (`Window` class + `registerEscapeHandler`) | ~120 | Generic window primitive. Future windows (about, share-seed, mod manager) are 10-line additions. | [[DEC-04-main-decomposition]] |
| `src/ui/{seed-controls,settings-window,advanced-window,custom-gen,terminal-bind,gestures,tree-settings-renderer,bootstrap}.ts` | ~1500 | `main.ts` from 1894 → 20 LOC; each UI island independently editable. | DEC-04 |
| `cloudflare/worker/` (Worker source + `wrangler.toml` + KV binding) | ~200 | DEC-06 outpost: shareable seed permalinks, share-image OG meta tags, optional analytics. Free-tier capable. | DEC-06 (to write) |
| Hardened workflows: composite `actions/setup`, SHA-pinned third-party actions, `dependabot.yml`, `vitest.config.ts` (with `define` reapplied for `__PACKAGE_VERSION__`) | ~120 | DEC-07: reproducible CI; supply-chain hygiene; PR-preview parity with prod base path. | DEC-07 (to write) |

**Expansion subtotal: ≈ +1200 LOC.**

## Implementation stages

Each stage is **one commit**, **passes `npx tsc --noEmit` + `npx vitest run` + `npm run build` green at HEAD**, and is **individually revertable** (`git revert <sha>` returns the repo to the prior stage's working state). Direct push to `main` per user instruction 2026-05-20. Pre-commit **Codex review** per stage using the prompt recipe noted in each row. Order is topological: each stage's dependencies appear in earlier stages.

### Stage 1 — Wiki bootstrap, Codex integration, ADRs, slop removal

**Files touched**
- `wiki/_templates/*` (verify present from prior session)
- `wiki/decisions/DEC-01..05.md` (already on disk)
- `wiki/decisions/DEC-06-cloudflare-outpost.md` (write)
- `wiki/decisions/DEC-07-enterprise-workflows.md` (write)
- `wiki/operations/codex-integration.md` (verify present)
- `wiki/plans/simplification-plan.md` (this file)
- DELETE `./skyline-scroller/` (whole folder, 5.0 MB, 27 .md + 2 JSON + `.obsidian/`)
- DELETE `./docs/knowledge_base/` (whole folder, 3.9 MB, 13 .md)
- DELETE `src/counter.ts`

**Depends on**: none. Pure delete + wiki write.

**Codex review scope**: `prompt-recipes/wiki-bootstrap.md` referencing `[[operations/codex-integration]]`. Verify: nothing under `wiki/` references the deleted folders; ADRs cross-link correctly; no orphan wikilinks introduced.

**Acceptance check**:
- `ls ./skyline-scroller ./docs/knowledge_base ./src/counter.ts 2>&1 | grep -c "No such"` returns `3`.
- `grep -r "skyline-scroller/skyline-scroller" wiki/ 2>/dev/null` returns empty.
- `npx tsc --noEmit` passes (counter.ts had no consumers).
- `npm run build` succeeds.

### Stage 2 — `src/utils/deepClone.ts` + JSON-clone idiom replacement

**Files touched**
- `src/utils/deepClone.ts` (new, ~15 LOC)
- `src/main.ts` (replace every `JSON.parse(JSON.stringify(x))` with `deepClone(x)`; ~15 sites)

**Depends on**: Stage 1 (clean tree).

**Codex review scope**: `prompt-recipes/mechanical-refactor.md`. Verify: every JSON-clone idiom is replaced, no semantic change, `deepClone` handles `Date`, nested arrays, plain objects. No use of `structuredClone` on DOM elements.

**Acceptance check**:
- `grep -c 'JSON.parse(JSON.stringify' src/main.ts` returns `0`.
- `npx tsc --noEmit` + `npx vitest run` green.
- Manual: open custom-gen, toggle tree, Apply — same UX as before.

### Stage 3 — DEC-01 unified RNG + `nextInt` guard + Math.random/Date.now purge

**Files touched**
- `src/utils/Random.ts` (`fork()`, `nextInt` guard)
- `src/engine/Game.ts` (`rootRng`, `initNoise` uses forked rng, `reset` constructs all subsystems from forked rng)
- `src/engine/SkySystem.ts` (constructor takes `rng: Random`)
- `src/engine/Landscape.ts` (constructor takes `rng: Random`; `generateShape` + `decorate` use it)
- `src/engine/Building.ts` (constructor takes `rng: Random`; stone noise + window lights use it)
- `src/engine/Tree.ts` (constructor takes `rng: Random`; cactus flower chance + side use it)
- `src/procgen/CityGenerator.ts` (constructor takes `rng: Random`; per-spawn forking)
- `src/procgen/BiomeSystem.ts` (constructor takes `rng: Random`)
- `tests/Random.test.ts` (extend with `fork()` + `nextInt(5,5)` cases)
- `tests/Determinism.test.ts` (new — golden-stream test)

**Depends on**: Stage 2.

**Codex review scope**: `prompt-recipes/dec-01-determinism.md` referencing `[[DEC-01-unified-rng]]` and `[[concepts/determinism]]`. Verify: zero remaining `Math.random()` in `src/engine/` and `src/procgen/`; `Date.now()` only in `Game` for `lastTime`; every constructor signature change is reflected at call sites; golden-stream test passes.

**Acceptance check**:
- `grep -rn 'Math.random\|Date.now' src/engine src/procgen` returns only comments + `Game.lastTime` deltas.
- `npx vitest run` includes 4 new `Random.fork()` cases + 2 `nextInt` edge cases + `Determinism.test.ts` golden hash.
- Same seed twice → byte-identical city stream.

### Stage 4 — DEC-02 dispose hygiene + previewGame leak fix

**Files touched**
- `src/engine/Game.ts` (`rafId`, `resizeHandler` fields; `dispose()` cancels + removes; `start()` + `loop()` capture rafId)
- `src/main.ts` — the surviving `btnGenClose` handler calls `previewGame?.dispose(); previewGame = null;` (the duplicate at `main.ts:1382` is deleted)

**Depends on**: Stage 3 (`Game` already touched).

**Codex review scope**: `prompt-recipes/dec-02-lifecycle.md` referencing `[[DEC-02-lifecycle]]`. Verify: every `requestAnimationFrame(` in `Game.ts` captures `this.rafId`; `dispose()` idempotent; preview close path nulls `previewGame`.

**Acceptance check**:
- DevTools Performance trace: after closing custom-gen window, zero `Game.loop` samples attributed to preview.
- `getEventListeners(window).resize` count is stable across open/close cycles.
- `previewGame?.dispose(); previewGame?.dispose();` does not throw.

### Stage 5 — DEC-03 safe expression parser + error toast

**Files touched**
- `src/engine/Expression.ts` (new, ~100 LOC parser)
- `src/engine/Terminal.ts` (speed command imports `parseExpr`; eval removed)
- `src/main.ts` (replace `alert(...)` handler with toast; add `unhandledrejection` listener)
- `src/style.css` (add `#error-toast` rules)
- `index.html` (the toast div is created in JS; no HTML change)
- `tests/Expression.test.ts` (new, ~30 cases)

**Depends on**: Stage 4 (independent, but commit-order keeps `main.ts` diffs sequential).

**Codex review scope**: `prompt-recipes/dec-03-safe-eval.md` referencing `[[DEC-03-safe-eval-and-error]]`. Verify: `parseExpr` rejects `Math.PI`, `alert(1)`, `(()=>{while(1)})()`; toast is debounced and a11y-compliant.

**Acceptance check**:
- `grep -n 'Function(' src/engine/Terminal.ts` returns nothing.
- `grep -n 'alert(' src/main.ts` returns nothing (except possibly the `#error-toast` text content).
- `npx vitest run` includes all 12 parser cases from DEC-03 acceptance criteria.

### Stage 6 — DEC-05 config + tokens + version + vite.config.ts

**Files touched**
- `package.json` (bump `version: "1.1.2"`)
- `vite.config.ts` (new — `base: PUBLIC_BASE_PATH ?? '/'`, `define.__PACKAGE_VERSION__`)
- `vitest.config.ts` (new — extends vite config, re-applies `define`)
- `src/config/{index,colors,timing,parallax,version}.ts` (new)
- `src/engine/{Building,Tree,Ground,Landscape,SkySystem}.ts` (replace hex literals with `COLORS.*`)
- `src/engine/Game.ts` (parallax via `PARALLAX_LAYERS.map`)
- `src/style.css` (`:root --c-* --z-*` block; replace inline literals; volume slider fix)
- `index.html` (volume slider wrapper for rotated fallback)
- `.github/workflows/{ci,deploy,pr-preview}.yml` (replace `--base=` with `PUBLIC_BASE_PATH` env)

**Depends on**: Stage 3 (constructor signatures already settled).

**Codex review scope**: `prompt-recipes/dec-05-config-tokens.md` referencing `[[DEC-05-low-code-config]]`. Verify: no remaining hex literals in `src/engine/`; `__PACKAGE_VERSION__` resolves to `"1.1.2"` in built bundle; `npm run preview` works locally without env var.

**Acceptance check**:
- `grep -E '#[0-9a-fA-F]{6}' src/engine/*.ts` returns nothing (or only acceptable runtime-derived strings).
- `grep -E '^\s*z-index:\s*[0-9]' src/style.css` returns nothing — only `var(--z-*)`.
- Built bundle contains `1.1.2` once.
- Volume slider works in current Chrome + Firefox.

### Stage 7 — DEC-05 declarative regions

**Files touched**
- `src/regions/{types,_index,forest,desert,tundra,plains,city}.ts` (new)
- `src/procgen/BiomeSystem.ts` (rewrite to consume registry; preserve RNG draw order)
- `src/procgen/CityGenerator.ts` (`pickMaterial/pickRoof/pickColor` rewritten as weighted-uniform draws over registry)
- `src/procgen/TreeConfig.ts` (deprecate `biomes[]` field; keep for one release behind TODO)
- `tests/regions.test.ts` (new — adjacency, treeSpecies sanity)
- `tests/Determinism.test.ts` (extend — same golden hash post-rewrite)

**Depends on**: Stage 6 (config + colors registered) + Stage 3 (RNG forked).

**Codex review scope**: `prompt-recipes/dec-05-regions.md` referencing `[[DEC-05-low-code-config]] §2 and Risk R1`. Verify: `REGION_IDS` order matches legacy `['forest','desert','tundra','plains','city']`; `nextFloat()` call-count per pick unchanged; golden hash still matches.

**Acceptance check**:
- Golden-stream test passes byte-for-byte against pre-DEC-05 hash captured in Stage 3.
- Demo PR adding `swamp.ts` + 1-line `_index.ts` edit touches exactly 2 files (manual smoke).
- `npx tsc --noEmit` green.

### Stage 8 — DEC-04 main.ts decomposition A (window-manager + tree-settings-renderer)

**Files touched**
- `src/ui/window-manager.ts` (new — `Window` class, escape registry)
- `src/ui/tree-settings-renderer.ts` (new — `renderTreeSettings` + 6 per-row components)
- `src/main.ts` (delete `renderTreeSettings` body 887–1310; import from new module)

**Depends on**: Stage 7 (`BiomeType` source-of-truth moved to `src/regions/_index`).

**Codex review scope**: `prompt-recipes/dec-04-stage-a.md` referencing `[[DEC-04-main-decomposition]] Step 1`. Verify: tree-settings UI byte-identical (idempotent render preserved); no `Window` is wired yet (file is imported nowhere) — pure orthogonal extraction.

**Acceptance check**:
- Tree settings smoke: toggle tree off → adjust min/max → flower% on cactus → reset buttons paint red/yellow correctly. Identical to pre-stage.
- `wc -l src/ui/tree-settings-renderer.ts` returns ≤300; no internal function exceeds 60 LOC.
- `npm run build` bundle size delta ≤1%.

### Stage 9 — DEC-04 main.ts decomposition B (remaining modules + Apply de-dup)

**Files touched**
- `src/ui/{seed-controls,gestures,terminal-bind,settings-window,advanced-window,custom-gen,bootstrap}.ts` (new)
- `src/main.ts` (shrunk to ~20 LOC — error handler import + `bootstrap()` call)
- **DELETE** duplicate `btnGenApply` listener (D12)

**Depends on**: Stage 8 (window-manager available; tree-settings-renderer available for `custom-gen` to call).

**Codex review scope**: `prompt-recipes/dec-04-stage-b.md` referencing `[[DEC-04-main-decomposition]] Steps 2–4`. Verify: 8-path smoke list from DEC-04 §Acceptance passes; `grep -c "btnGenApply.addEventListener" src/ui/custom-gen.ts` returns `1`; escape priority order preserved (terminal=0, custom-gen=10, advanced=20, settings=30, pointer-lock=40).

**Acceptance check**:
- `wc -l src/main.ts` returns ≤25.
- `grep -rn "btnGenApply.addEventListener" src/` returns exactly one hit (in `ui/custom-gen.ts`).
- Apply click → `cancelResetConfirm` and `game.setSeed` each run **once** (verified via console log shim, then removed).
- All 8 smoke paths from DEC-04 §Acceptance pass.

### Stage 10 — DEC-06 Cloudflare Worker outpost + DEC-07 hardened workflows

**Files touched**
- `cloudflare/worker/src/index.ts` (Worker: serves OG meta + `/api/seed/{seed}.png` share-image; reads from KV)
- `cloudflare/worker/wrangler.toml` (KV binding, routes)
- `cloudflare/worker/package.json` (Worker-only deps)
- `.github/actions/setup/action.yml` (composite — checkout-already-done caller, setup-node@SHA + npm ci)
- `.github/workflows/ci.yml` (rewrite per DEC-05 §6, SHA-pinned)
- `.github/workflows/deploy.yml` (rewrite — `cancel-in-progress: true`, SHA-pinned)
- `.github/workflows/pr-preview.yml` (rewrite — `PUBLIC_BASE_PATH` per-PR)
- `.github/workflows/worker-deploy.yml` (new — deploy worker on main push)
- `.github/dependabot.yml` (new — group GH-Actions ecosystem)

**Depends on**: Stage 6 (`PUBLIC_BASE_PATH` env exists) + Stage 9 (`main.ts` stable, build output reproducible).

**Codex review scope**: `prompt-recipes/dec-06-outpost.md` + `prompt-recipes/dec-07-workflows.md` referencing `[[DEC-06-cloudflare-outpost]]` and `[[DEC-07-enterprise-workflows]]`. Verify: Worker has no secrets in source; KV binding uses preview/prod separation; every third-party action is SHA-pinned with version comment; lint job runs before test/build.

**Acceptance check**:
- `wrangler deploy --dry-run` succeeds.
- All three workflow YAMLs use `./.github/actions/setup` (single source of npm-ci).
- `grep -E '@v[0-9]' .github/workflows/*.yml` returns nothing (only `@<sha>` references with `# v1.2.3` comments).
- PR preview URL works against `PUBLIC_BASE_PATH=/skyline-scroller/pr-preview/pr-N/`.
- `dependabot.yml` groups `github-actions` ecosystem.

## Codex review gate — summary

Every stage gates on a pre-commit Codex review using the `codex:codex-cli-runtime` skill (per `[[operations/codex-integration]]`). The recipe→DEC mapping:

| Stage | Prompt recipe | Primary DEC | Secondary refs |
|---|---|---|---|
| 1 | `wiki-bootstrap.md` | — | agent-11 disposition table |
| 2 | `mechanical-refactor.md` | DEC-04 | agent-13 |
| 3 | `dec-01-determinism.md` | DEC-01 | concepts/determinism |
| 4 | `dec-02-lifecycle.md` | DEC-02 | systems/game-loop |
| 5 | `dec-03-safe-eval.md` | DEC-03 | entities/Terminal |
| 6 | `dec-05-config-tokens.md` | DEC-05 §1, §3, §4, §5 | operations/build-deploy |
| 7 | `dec-05-regions.md` | DEC-05 §2 (Risk R1) | concepts/determinism |
| 8 | `dec-04-stage-a.md` | DEC-04 Step 1 | concepts/idempotent-render |
| 9 | `dec-04-stage-b.md` | DEC-04 Steps 2–4 | concepts/escape-priority-stack |
| 10 | `dec-06-outpost.md` + `dec-07-workflows.md` | DEC-06, DEC-07 | DEC-05 §6 |

**Failure handling**: if Codex flags an issue, fix in the same working tree (do NOT amend a previous commit). Commit the fix as the same stage; only push once Codex is green.

## Push policy

- **Direct push to `main`** per user instruction 2026-05-20.
- **One stage = one commit**. Each stage stands alone — `git revert <sha>` returns the repo to the prior stage's working state without manual recovery.
- **No `--force` push** unless the user explicitly asks (per user constraint).
- **Hooks not skipped** (pre-commit type-check + test must pass; if they fail, fix and commit again, do not `--no-verify`).
- **Commit messages**: imperative mood, prefixed by stage tag — `stage-3: DEC-01 unified RNG + nextInt guard`. Body lists files touched and the DEC the work implements.
- **No AI attribution in commit messages** (per user constraint).

## Estimated impact

| Bucket | LOC delta |
|---|---:|
| Legacy wiki + JSON dumps (Stage 1) | −5 MB raw, ~−2000 LOC equivalent in tracked text |
| `main.ts` (1894 → 20) (Stages 8–9) | −1874 in `main.ts`, +~1500 in `src/ui/*` (net −374) |
| Dead code (counter, cactus top, currentTreeConfig, double-paint, double Apply, double Close) | −60 |
| `JSON.parse(JSON.stringify)` → `deepClone` (Stage 2) | −15 |
| `Function(...)` eval → parser (Stage 5) | +95 in `Expression.ts`, −10 in `Terminal.ts` |
| `alert(...)` → toast (Stage 5) | +20 in `main.ts`/style.css |
| Random.fork + tests (Stage 3) | +30 in `Random.ts`, +80 in tests |
| dispose hygiene (Stage 4) | +25 |
| Config + tokens + vite.config + version (Stage 6) | +200 |
| Declarative regions (Stage 7) | +250 in `src/regions/`, −60 in `BiomeSystem.ts` + `CityGenerator.ts` |
| Worker + workflow hardening (Stage 10) | +200 in `cloudflare/`, +120 in `.github/` |
| **Totals** | **−2500 removed / +1200 added / −1300 net** |

Plus non-LOC wins:
- **Determinism contract enforced** end-to-end (golden-stream test).
- **No RCE** in the speed command.
- **No memory leak** from `previewGame`.
- **Adding a biome touches 2 files** instead of 5.
- **Single palette source-of-truth** spanning Canvas + DOM.
- **Single base-path source-of-truth** in `PUBLIC_BASE_PATH` env.
- **Reproducible CI** via composite action + SHA-pinned third-party actions.
- **Free-tier permalink + share-image** infrastructure (DEC-06).

## See also

- [[DEC-01-unified-rng]] · [[DEC-02-lifecycle]] · [[DEC-03-safe-eval-and-error]] · [[DEC-04-main-decomposition]] · [[DEC-05-low-code-config]] · DEC-06-cloudflare-outpost (to write Stage 10) · DEC-07-enterprise-workflows (to write Stage 10)
- [[entities/Game]] · [[entities/main]] · [[entities/Random]] · [[entities/Terminal]] · [[entities/SkySystem]] · [[entities/CityGenerator]] · [[entities/BiomeSystem]] · [[entities/Tree]] · [[entities/TreeConfig]] · [[entities/Building]] · [[entities/Landscape]]
- [[systems/game-loop]] · [[systems/procgen]] · [[systems/ui-shell]] · [[systems/terminal]] · [[systems/css-architecture]] · [[systems/sky]]
- [[concepts/determinism]] · escape priority stack · idempotent render · preview game mirror
- build deploy · [[operations/codex-integration]]
- agent 11 wiki drift · agent 13 complexity deps
