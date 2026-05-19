---
name: Dualisms
description: The canonical catalogue of 150 binary-pair patterns in skyline-scroller — categorised, with the three non-obvious ones surfaced.
type: concept
---

# Dualisms

## Definition

A **dualism** is a binary-pair design pattern: two opposing poles that together encode a single decision, range, mode, or invariant. The skyline-scroller codebase is dualism-saturated — almost every design axis resolves to a fork. This page is the canonical catalogue (150 entries) deduplicated across the swarm scan; sibling [[concepts/control-flow]], [[concepts/determinism]], [[concepts/single-canvas]], [[concepts/parallax-math]] pages refer back here for cross-cutting tension labels.

## Where it lives

Everywhere. The densest sites:

- `src/engine/SkySystem.ts` — the most dualism-saturated file (sun/moon, sunrise/sunset, flip/ray window, hemisphere mirroring, hex/rgb lerp).
- `src/main.ts` — the DOM-state vs game-state mirror, every two-step confirm, the dual slider, the Escape priority chain.
- `src/engine/Game.ts` — update/render, preview/main, save/restore, world-x/sky-time.

## Why it matters

- Reading the codebase as a graph of dualisms (rather than as a list of files) reveals the **load-bearing conventions** — e.g. `JSON.parse(JSON.stringify(...))` deep-clone idiom (#121) is the bridge across the *aliased / cloned* dualism at 15+ sites.
- Three of the dualisms are **non-obvious traps** — they look symmetric but break at a specific point (see "Top non-obvious" below).
- It maps cleanly onto the concept graph in [[concepts/control-flow]] — concept-level tensions D1–D10 are dualisms about other dualisms.

## Counter-examples

Not every pattern is binary. Several categorical types are **tertiary** with a hidden secondary dualism:

- `BuildingMaterial` ∈ {brick, wood, stone, plaster} → textured (brick+wood) vs flat (stone+plaster).
- `RoofType` ∈ {flat, gabled, dome, crenelated} → pointed vs flat.
- `GroundType` ∈ {grass, pavement, water, dirt} → walkable vs blocking (water suppresses placement).
- `CloudType` ∈ {cumulus, cirrus, stratus} → cumulus (puffs) vs non-cumulus (ellipse/rect).
- Time format ∈ {score, 24h, 12h} → world-x counter vs sky-clock; with sky-clock further dualised into 24h/12h.

## The master table (150 entries)

| # | Name | Where | Form | Sym? | Why |
|---|------|-------|------|------|-----|
| 1 | day / night | `SkySystem.ts` 282–401 | boolean | sym | sun vs moon |
| 2 | sun / moon | `SkySystem.drawCelestialBody` 375–398 | if/else | asym | sun = default |
| 3 | sunrise / sunset flip | `SkySystem.ts` 305–369 | mirrored if/else | sym | 24h cycle's two transitions |
| 4 | bloom / no-bloom | `SkySystem` 301, 318–366 | float 0..1 | asym | sun-only |
| 5 | flipWin / rayWin | `SkySystem` 294–296 | numeric pair | asym | nested transitions |
| 6 | scaleX cos flip | `SkySystem` 327, 353 | sign of cosine | sym | edge-on zero crossing |
| 7 | sky top / bot | `SkySystem.keyframes[]` 194–198 | string pair | sym | gradient stops |
| 8 | multiply / source-over | `Game.render` 246–251 | composite op | asym | ambient tint |
| 9 | paused / playing | `Terminal.pause` 232–258 | timeScale==0 | asym | reuse rate as flag |
| 10 | timeScale +/− | `main.ts adv-speed-slider` | signed float | sym range | reverse time |
| 11 | real-time / in-world time | `Game.update` 156 | two clocks | asym | sim cadence decoupled |
| 12 | frame dt / safe dt | `Game.loop` 150–154 | raw vs capped | asym | tab-inactive clamp |
| 13 | seeded / unseeded RNG | `Random` vs `Math.random()` leaks | class vs global | asym | the determinism leak |
| 14 | deterministic core / stochastic decoration | same files | architectural | asym | macro vs micro |
| 15 | string / numeric seed | `Random` ctor 7–13 | typed union | asym | hash vs mask |
| 16 | default / custom config | `TreeConfig.ts` | object pair | asym | resettable |
| 17 | modified / default reset btn | `main.ts:311-321` | CSS class pair | asym | red/yellow |
| 18 | reset pending / idle | `Terminal.pendingResetTarget` | nullable | asym | two-step gate |
| 19 | confirm / abort | `Terminal.execute` 60–71 | substring check | asym | safer default |
| 20 | enabled / disabled (tree) | `TreeConfigItem.enabled` | boolean | sym | per-species |
| 21 | available / unavailable per biome | `CityGenerator.pickTreeType` | set member | asym | whitelist |
| 22 | urban / natural (build/tree) | `CityGenerator.addChunk` 99–116 | discriminated str | sym | one slot/chunk |
| 23 | foreground / background | `Game.reset` 110–115 | int 0..3 | asym | parallax gate |
| 24 | parallax near / far | `Layer.speedModifier` 0.2..1.0 | float | sym ladder | depth illusion |
| 25 | on-screen / off-screen cull | `Layer.draw` 67 | bounds | asym | render cull |
| 26 | on-screen / pruned | `Layer.prune` 22–36 | filter | asym | memory cull |
| 27 | world / screen coords | `Layer.draw` 39 | subtract cam | asym | per-layer affine |
| 28 | logical / physical px | `Game.scaleFactor=1.6` | uniform scale | asym | pixel-art |
| 29 | preview / main canvas | `Game.isPreview` 29 | ctor flag | asym | dual personality |
| 30 | evergreen / deciduous | `TreeConfig` biomes | data convention | asym | biome realism |
| 31 | flowering / non | `Tree.hasFlower` 34–38 | float-gated bool | asym | cactus only |
| 32 | flower left / right | `Tree.flowerPos` 37 | string union | sym | break symmetry |
| 33 | trunk / foliage | `Tree.draw*` | fill order | asym | trunk first |
| 34 | body / roof | `Building.ts` 13–14 | colour pair | asym | derived (roof = body − 20% L) |
| 35 | brick/wood/stone/plaster | `BuildingMaterial` 4 | string union | tertiary | textured/flat sub-dual |
| 36 | flat/gabled/dome/crenelated | `RoofType` 5 | string union | tertiary | pointed/flat sub-dual |
| 37 | grass/pavement/water/dirt | `GroundType` 3 | string union | tertiary | walkable/blocking |
| 38 | water / not-water | `addChunk` 108 | bool derived | asym | water suppresses obj |
| 39 | cold / hot biome | `BiomeSystem.transitions` 11–17 | adjacency | sym | climate-believable |
| 40 | desert / non-desert | `TreeConfig` 43–49 | string match | asym | only cacti |
| 41 | biome auto / forced | `CityGenerator.forceBiome` | sentinel | asym | UI override |
| 42 | sparse / dense | `dna.density` 0.4..0.9 | float | skewed | dense-biased |
| 43 | low / high greenery | `dna.greenery` 0.1..0.8 | float | sym | trees |
| 44 | short / tall | `dna.buildingHeight` 0.8..1.2 | float | sym around 1 | global scale |
| 45 | min / max height (tree) | `TreeConfig.minHeight/maxHeight` | pair | sym | dual slider |
| 46 | computed / cached texture | `cacheCanvas` | per-instance canvas | asym | draw-once blit-many |
| 47 | inline / cached drawing | `Ground` vs `Building` | per-class | asym | cheap vs expensive |
| 48 | interface / abstract class | `Renderable` / `CityEntity` | TS construct | asym | two drawable shapes |
| 49 | type-only / runtime import | `import type` | TS keyword | asym | build erasure |
| 50 | declared / used | leading `_` convention | naming | asym | satisfy lint |
| 51 | exported / internal | `export class` vs file-private | TS access | asym | encapsulation |
| 52 | public / private | `Game.ts` 8–30 | TS modifier | asym | API boundary |
| 53 | strict / lax (`as any`) | `Terminal.ts:335` | escape hatch | asym | pragmatism |
| 54 | visible / hidden | `.visible` CSS class | toggle | asym | window discoverability |
| 55 | fullscreen / windowed | `document.fullscreenElement` | DOM flag | sym | immersion |
| 56 | vendor / standard fullscreen | `main.ts` 630–651 | prefix chain | asym | x-browser |
| 57 | focused / unfocused input | `activeElement?.tagName==='INPUT'` | DOM prop | asym | gate kbd |
| 58 | muted / unmuted | `Game.isMuted` + SVG swap | bool | asym | audio gate |
| 59 | volume / lastVolume | `main.ts` 533–534 | pair | asym | restore after mute |
| 60 | simple / advanced settings | two `.ui-window` divs | window pair | asym | progressive disclosure |
| 61 | slider / numeric input | adv speed pair | dual `<input>` | sym | precision vs feel |
| 62 | log / linear slider | casual vs adv | math fn | asym | two UX modes |
| 63 | center / out-of-bounds | adv speed recenter | numeric guard | asym | sliding viewport |
| 64 | snap-to-center / continuous | `Math.abs(val)<0.05` | threshold | asym | UX magnet |
| 65 | expr / numeric input | `Function(...)` eval | str → num | asym | accept π |
| 66 | π / Math.PI | `Terminal.ts` 202 | substitution | asym | unicode convenience |
| 67 | history active / idle | `historyIndex===-1` | sentinel | asym | shell history |
| 68 | command / alias | `Terminal.commands` Map | double-keyed | sym storage | dedup in help |
| 69 | name / description | every `Command` | string pair | sym | help text |
| 70 | usage / aliases | `Terminal.help` 142–143 | pair | asym | aliases optional |
| 71 | execute / autocomplete | `Command` 22–23 | fn pair | asym | mandatory / optional |
| 72 | query / mutate | no-args = read, args = write | REPL idiom | sym | universal |
| 73 | echo / output | `> ${input}` prefix | string | asym | tty mimicry |
| 74 | error / non-error output | `onOutput(msg, isError?)` | bool param | asym | colour-coded |
| 75 | green / red | `style.css` | colour pair | asym | good/danger |
| 76 | yellow / red reset btn | `style.css` 418–430 | tri-state | asym | idle/dirty/confirm |
| 77 | first-click / confirmed | reset confirm flags | bool + timeout | asym | are-you-sure |
| 78 | timer armed / cleared | `setTimeout(..., 3000)` | handle / null | asym | TTL on confirm |
| 79 | manual / native Escape | `preventDefault OFF` deliberately | branching | asym | cede control |
| 80 | pointer-locked / free | `pointerLockElement` | DOM flag | asym | infinite drag |
| 81 | drag / hold | `setTimeout(..., 200)` upgrade | time threshold | asym | gesture vs click |
| 82 | mouse / keyboard | separate handler families | event source | sym | dual input |
| 83 | scroll +/- | `e.deltaY < 0` | sign | sym | natural scroll |
| 84 | mouseenter / mouseleave | volume popup | event pair | sym | hover popover |
| 85 | open / close window | `toggleWindow` | fn | sym | UX standard |
| 86 | inside / outside (click) | `.contains(...)` | DOM check | asym | dismiss-on-outside |
| 87 | old `isVisible` / opt | `Renderable` vs `Building` true | drift | asym | dead-code-ish |
| 88 | update / render | `Game.loop` 156–157 | sequential | asym | classic loop |
| 89 | save / restore (canvas) | `ctx.save() / ctx.restore()` | pair | sym | stack |
| 90 | translate / no-restore | `CityEntity.initCache:27` | broken pair | asym | offscreen discard |
| 91 | minX / maxX (cloud) | `SkySystem` 80–137 | numeric pair | sym | precise cull |
| 92 | spawn / despawn | `SkySystem.update` 166–182 | re-spawn loop | sym | infinite stream |
| 93 | cumulus/cirrus/stratus | `SkySystem.createCloud` | tertiary | sec-dual | cumulus vs other |
| 94 | initial / wrap spawn | `createCloud(randomX, overrideX)` | two-arg | asym | seeded-look at boot |
| 95 | hex / rgb colour | `lerpColor.parse` | regex branch | asym | mixed formats |
| 96 | r1g1b1 / r2g2b2 | `lerpColor` 271 | triplets | sym | lerp endpoints |
| 97 | round / float | `Math.round` in lerp | explicit | asym | canvas integer demand |
| 98 | clear / fill | `Building.generateTexture` 47–65 | implicit clear | asym | first-paint wipe |
| 99 | brick offset / non-offset | `createBrickPattern:18` | parity | sym | running-bond |
| 100 | day refl / warm light | `Building.generateTexture` 73–74 | coin flip | sym | per-building bias |
| 101 | window present / missing | `Building.generateTexture` 79 | 80/20 flip | asym | dilapidation |
| 102 | merlon / crenel | `Building.generateTexture` 102–104 | parity | sym | crenel teeth |
| 103 | smooth silhouette / decorated | `Landscape.decorate` 86 | early-return | asym | city special |
| 104 | left / right of peak | `Landscape.decorate` 110–116 | branch | sym | slope props |
| 105 | top-walk / close-down | `Landscape.drawToCache` 70–79 | path direction | asym | fill below |
| 106 | yOffset positive / zero | `Layer.yOffset` 190/100/50/0 | per layer | asym | foreground anchored |
| 107 | scale 1.0 / 1.3 | `Game.reset:111` | per layer | asym | distance fake |
| 108 | name / alias dedup | `getSuggestions:109` | str equality | asym | autocomplete dedup |
| 109 | space-trailing / not | `getSuggestions:101` | regex | sym | next vs current arg |
| 110 | empty / non-empty args | every `execute` | length check | sym | REPL idiom |
| 111 | enable shorthand | `Terminal.generate` 513–514 | bare token | asym | terse CLI |
| 112 | bare / key:value token | `Terminal.generate` 512–528 | token shape | sym | flexible parser |
| 113 | `> ` prefix / paste | terminal-line click 1577 | substring | asym | copy without prompt |
| 114 | clipboard success / fail | `.then/.catch` | promise | asym | best-effort |
| 115 | strict / `as any` escape | various | cast | asym | pragmatic gaps |
| 116 | alert / console error | window vs try/catch | global vs caught | asym | dev loudness |
| 117 | first-paint / interval | tree icons | one-shot vs recurring | sym | live preview |
| 118 | open-modal / clear-intervals | `btn-gen-close` | array cleanup | asym | perf gate |
| 119 | inject / existing DOM | `if (!treeSettingsContainer)` | defensive | asym | happy path = present |
| 120 | hot / persisted config | preview vs game treeConfig | two instances | asym | apply-on-confirm |
| 121 | deep-clone / alias | `JSON.parse(JSON.stringify(...))` 15+ sites | manual convention | asym | bug class fix |
| 122 | active / passive hint | `terminalActiveHintIndex` | int sentinel | asym | tab cycles |
| 123 | tab / no-tab | `keydown==='Tab'` | branch | asym | cycle navigation |
| 124 | space-commits / space-as-space | `if e.key===' ' && active>=0` | conditional intercept | asym | accept hint |
| 125 | window-Enter / not | DOM class check | asym | native form behaviour |
| 126 | Esc priority chain | sequential `if … return` | ordered | asym | nested-modal close |
| 127 | Polish / English | chat vs code | language | asym | author voice / lingua franca |
| 128 | TODO / NOTE comment | annotation type | asym | debt markers |
| 129 | score / clock | `Game.update` 190–204 | tertiary | asym | gameplay vs immersion |
| 130 | 24h / 12h | sub-dualism | sym | locale taste |
| 131 | AM / PM | `Game.update:199` | str pair | sym | clock convention |
| 132 | 0 / 12 hour guard | `h % 12 \|\| 12` | fallback | asym | non-zero |
| 133 | padStart / raw int | optional pad | asym | aligned numerals |
| 134 | str-seed always | `main.ts:235` | always string | asym | type uniformity |
| 135 | static / instance methods | `TextureGenerator` static | TS | asym | utility vs stateful |
| 136 | colour-scheme light dark | `style.css:6` | CSS dual-mode | sym | UA decides |
| 137 | display none / flex/block | `.visible` | toggle | asym | window hide |
| 138 | pointer-events auto / none | various CSS | pair | asym | click-through |
| 139 | -webkit / -moz appearance | `style.css` | vendor prefix | sym | x-browser slider |
| 140 | track-bg / track-fill | dual slider visuals | stacked divs | asym | range vis |
| 141 | slider-min / slider-max input | z-stacked | sibling `<input>` | sym | named "Dual Slider" |
| 142 | thumb auto / track none | `pointer-events` per-element | override | asym | clicks pass to nearest thumb |
| 143 | font-synthesis none / AA | `style.css:10-13` | pair | sym | crisp text |
| 144 | `:hover` / default | pseudo-class | asym | feedback |
| 145 | aspect-ratio / freeform | preview vs main canvas | CSS | asym | preview consistency |
| 146 | centred modal / corner UI | transform vs bottom/right | positioning | asym | focus vs ambient |
| 147 | fixed / absolute | CSS keyword | asym | escape ancestor |
| 148 | z-index low / high | 10..9999 ladder | stacking | asym ladder | nested modals |
| 149 | overflow hidden / scroll | per-container | asym | intentional scrollers |
| 150 | `▶` / `▼` | disclosure glyph | unicode pair | sym | tree settings |

## Grouped by category

- **Diurnal** (sky/lighting/celestial): 1, 2, 3, 4, 5, 6, 7, 8, 93, 94, 95, 96, 97. See [[concepts/control-flow]] §SM2.
- **Temporal** (time/simulation): 9, 10, 11, 12, 62, 64, 67, 78, 129, 130, 131, 132, 133. See [[concepts/time]].
- **Spatial** (rendering, parallax, coords): 23, 24, 25, 26, 27, 28, 91, 104, 105, 106, 107, 146, 147, 148, 149. See [[concepts/parallax-math]].
- **Generative** (proc-gen): 13, 14, 15, 16, 21, 22, 30, 31, 32, 41, 42, 43, 44, 45, 98, 99, 100, 101, 102, 103, 134. See [[concepts/determinism]], [[concepts/procedural-budgets]].
- **Categorical** (taxonomies): 22, 30, 35, 36, 37, 38, 39, 40, 93. See [[entities/BiomeSystem]].
- **Interface** (UI affordances): 17, 18, 19, 20, 29, 54, 55, 56, 57, 58, 59, 60, 61, 63, 74, 75, 76, 77, 79, 80, 81, 82, 83, 84, 85, 86, 117, 118, 122, 123, 124, 125, 126, 136, 137, 138, 140, 141, 142, 144, 145, 150.
- **Behavioural** (read/write, sync/async): 9, 46, 47, 65, 66, 68, 69, 70, 71, 72, 73, 88, 89, 90, 92, 110, 111, 112, 113, 114, 119, 120, 121, 128.
- **Compile-time**: 48, 49, 50, 51, 52, 53, 115, 135, 143.
- **Architectural**: 11, 14, 29, 46, 47, 48, 88, 116, 120, 126.

## Top non-obvious dualisms

Three patterns look symmetric but break load-bearingly at a specific point. These are the ones worth knowing if you only learn three.

### 1. `scaleX` cosine flip (#6)

The sun→moon transition is not a fade — it's a 1D horizontal scale that *passes through zero width*, with `drawSun = false` switching at the cosine zero-crossing (`SkySystem.ts:325-330, 351-356`). Day vs night is encoded as the **sign of a cosine**, not as a boolean. The mathematical zero is the moment the celestial body is "edge-on" and invisible — physically motivated, mechanically a sign flip on `ctx.transform`. Look for it whenever you see `Math.cos(angle)` in a draw method.

### 2. `CityEntity.initCache` save/restore asymmetry (#90)

Every render path matches `ctx.save()` with `ctx.restore()` — *except* `CityEntity.initCache` (`CityEntity.ts:18-30`), which calls `ctx.translate(padding, padding)` and never restores. The dualism is broken on purpose because the offscreen canvas is discarded after one use. A "missing pole" that is invisible until you notice every *other* call site preserves the pair. If you ever copy this method for a reusable cache, the bug will surface.

### 3. The 15+-site `JSON.parse(JSON.stringify(...))` clone idiom (#121)

`Game.ts:41`, `CityGenerator.ts:30,32`, `Terminal.ts:435,438,583,586`, `main.ts:704,747,951,1093,1344,1346,1375,1552,1553` — all do the same deep-clone dance. The dualism between *aliased reference* (bug) and *deep-cloned snapshot* (correct) is encoded as a manual convention everywhere instead of being abstracted. The presence of this idiom at *every* config-handoff site is the strongest signal in the codebase that aliasing was a real, recurring bug. See [[concepts/customisation-flow]] (D8).

## Invariants

- Every `ctx.save()` in main render paths has a matching `ctx.restore()` — except #90.
- `JSON.parse(JSON.stringify(...))` is the canonical clone idiom; failing to use it is the "config aliasing" bug class.
- Default vs modified state is always rendered as a CSS class (`.default` / `.modified`), never as a colour-only change.
- The deterministic vs stochastic split (#13, #14) is leaky and undocumented — see [[concepts/determinism]].

## See also

- [[concepts/control-flow]] — state machines that compose dualisms into FSMs (D-table)
- [[concepts/determinism]] — D7 expanded
- [[concepts/single-canvas]] — D3, D5 expanded
- [[concepts/customisation-flow]] — D8 (clone-vs-alias) expanded
- [[concepts/time]] — D4 expanded
- [[entities/SkySystem]] — the densest single dualism site
