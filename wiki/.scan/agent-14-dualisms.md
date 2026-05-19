# Agent 14 — Dualisms & duality patterns (canonical catalogue)

> Scope: every binary-pair / opposing-pole pattern visible in `src/`, `index.html`, and `src/style.css`. This is the canonical dualism catalogue for the swarm; sibling agents only flag locally observed dualisms.

## Files scanned

- `src/main.ts` (1894 LOC) — UI wiring, sliders, gestures, terminal glue
- `src/engine/Game.ts` — render/update loop, layer config, preview vs main
- `src/engine/SkySystem.ts` — diurnal cycle, sun/moon flip
- `src/engine/Building.ts`, `src/engine/Tree.ts`, `src/engine/Ground.ts`, `src/engine/Landscape.ts`, `src/engine/CityEntity.ts`, `src/engine/Layer.ts`, `src/engine/Renderable.ts`, `src/engine/TextureGenerator.ts`, `src/engine/Terminal.ts`
- `src/procgen/CityGenerator.ts`, `src/procgen/BiomeSystem.ts`, `src/procgen/TreeConfig.ts`
- `src/utils/Random.ts`
- `index.html`, `src/style.css`

## Public surface (exports/classes/functions/types)

Not applicable — this agent does not own any module. Cross-link: [[entities/Game]], [[entities/SkySystem]], [[entities/Terminal]], [[entities/CityGenerator]], [[entities/Building]], [[entities/Tree]], [[entities/Ground]], [[entities/Landscape]], [[entities/BiomeSystem]], [[entities/Layer]], [[entities/CityEntity]], [[entities/Random]].

## Internal state

Not applicable.

## Control flow

Not applicable.

## Dependencies (imports / imported-by, even if known indirectly)

Not applicable.

## Complexity & hotspots

Hotspots specifically of dualism-saturated code:
- `SkySystem.drawCelestialBody` — branched into TWO mirrored hemispheres (sunrise side vs sunset side), each further subdivided by flip/ray windows. The most dualism-dense single function in the codebase.
- `main.ts setGlobalVolume` — entangles `currentVolume / lastVolume` (now / memory) with `isMuted / !isMuted` (state pair).
- `main.ts updateAdvSpeedUI` & friends — log-scaled slider with negative/positive halves treated as separate domains.

## Dualisms & duality patterns observed

### Master table

| # | Name | Where | Form | Sym? | Why |
|---|------|-------|------|------|-----|
| 1 | day / night | `SkySystem.ts` 282–401 (`drawSun = (time>6 && time<18)`) | boolean branch | symmetric | drive sun vs moon glyph and ambient overlay |
| 2 | sun / moon | `SkySystem.drawCelestialBody` 375–398 | if/else draw branch | asymmetric (sun has bloom + ray phases, moon is a plain disc with one crater) | sun is the "default" celestial body, moon is the inverted alternative |
| 3 | sunrise / sunset flip | `SkySystem.ts` 305–369 | top-level if/else by `time>12` | mirror-symmetric (flipStart/flipEnd vs flipStart/rayEnd) | encode the two transition points in the 24h cycle |
| 4 | bloom / no-bloom (rays on / off) | `SkySystem` 301, 318–366 | float `currentBloom 0..1` | asymmetric (bloom is sun-only) | hide rays before flip, restore after |
| 5 | flip window / ray window | `SkySystem` 294–296 (`flipWin=0.15`, `rayWin=0.5`) | numeric pair | asymmetric (rayWin is wider) | nested concentric transitions |
| 6 | scaleX cos flip (left-half / right-half) | `SkySystem` 327, 353 (`Math.cos(angle)` → +/–) | sign of cosine | symmetric | celestial body squashes through zero width during flip |
| 7 | sky-top / sky-bot gradient | `SkySystem.keyframes[].top / .bot`, draw 194–198 | string pair per keyframe | symmetric | two-stop linear gradient encodes every sky moment as a vertical pair |
| 8 | ambient overlay (multiply) / source-over | `Game.render` 246–251 | `globalCompositeOperation` toggle | asymmetric (source-over is default) | global tint via multiply, then reset |
| 9 | paused / playing | `Terminal.ts pause` 232–258; `Game.timeScale === 0` | numeric ≠ 0 vs == 0 | asymmetric (1.0 is canonical "running") | reuse timeScale as both rate and play-flag |
| 10 | timeScale positive / negative | `main.ts adv-speed-slider` (`-10000..10000`); slider min "-1" | signed float | symmetric range, asymmetric semantics (negative = reverse time, untested) | allow time reversal as a power-user toggle |
| 11 | real-time / in-world time | `Game.update` 156 (`safeDt * timeScale`); `cameraX` (world) vs `lastTime` (real) | two clocks | asymmetric | decouple sim speed from frame cadence |
| 12 | frame-time / delta-time | `Game.loop` 150–154; `Math.min(deltaTime, 0.1)` | raw vs capped | asymmetric | safe-dt clamp prevents tab-inactive jumps |
| 13 | seeded / unseeded RNG | `Random` (Mulberry32, deterministic) vs `Math.random()` in `Building.ts` 62/74/79, `Landscape.ts` 38/92, `SkySystem` constructor `Date.now()` | class instance vs global | asymmetric (seeded is the contract, unseeded is the leak) | deterministic city + stochastic decoration |
| 14 | deterministic core / stochastic decoration | same files as #13 | architectural | asymmetric | layout is reproducible, surface noise is not |
| 15 | string seed / numeric seed | `Random` ctor 7–13 (`cyrb128` vs `>>> 0`) | typed union | asymmetric (string path hashes, number path masks) | accept both; strings hashed via cyrb128 |
| 16 | default config / custom config | `TreeConfig.ts` (`DEFAULT_TREE_CONFIG` vs `currentTreeConfig` / `game.treeConfig`) | object pair, deep-cloned via `JSON.parse(JSON.stringify(...))` | asymmetric (default is the anchor) | always-resettable customisation |
| 17 | modified / default (reset button state) | `main.ts updateResetButton` 311–321; `.btn-smart-reset.default` vs `.modified` in CSS 418–430 | CSS class pair | asymmetric | red = act, yellow = inert |
| 18 | reset-pending / reset-idle | `Terminal.pendingResetTarget`; `isAdvResetConfirming`; `isResetConfirming` | nullable string / boolean | asymmetric | two-step destructive-action gate |
| 19 | confirm / abort | `Terminal.execute` 60–71 ("y/yes" vs anything else) | substring check | asymmetric (anything-not-yes = abort) | safer default |
| 20 | enabled / disabled (per tree type) | `TreeConfig.TreeConfigItem.enabled`; checkbox `cb-${type}` | boolean | symmetric | per-species toggle |
| 21 | available / unavailable per biome | `CityGenerator.pickTreeType` 179–194 (filter by `biomes.includes(biome)`) | set membership | asymmetric | biome whitelist |
| 22 | urban / natural (building / tree) | `CityGenerator.addChunk` 99–116 | discriminated string `'building'/'tree'/'landscape'/'none'` | symmetric (rolled against `dna.density` then `dna.greenery`) | one slot per chunk |
| 23 | foreground / background (layer index) | `Game.reset` 110–115; `CityGenerator.addChunk` 76,102 (`layerIndex===3` vs `<=1`) | int index 0..3 | asymmetric (index 3 is "alive", index 0 is "scenery") | parallax + content-type gating |
| 24 | parallax near / far (speedModifier) | `Layer` 11; values `0.2/0.4/0.6/1.0` | float | symmetric ladder | depth illusion |
| 25 | on-screen / off-screen (visibility cull) | `Layer.draw` 67; `CityEntity.isVisible` 61–64 | bounds check | asymmetric (off-screen is skipped) | rendering optimisation |
| 26 | on-screen / pruned (memory cull) | `Layer.prune` 22–36 | filter | asymmetric (kept = default) | bounded memory for infinite scroll |
| 27 | world-coords / screen-coords | `Layer.draw` 39 (`layerViewX = cameraX * speedModifier`), `obj.draw(ctx, offsetX)` | subtract camera in draw | asymmetric | per-layer affine |
| 28 | logical / physical pixels (scaleFactor 1.6) | `Game.scaleFactor` 25; `Game.render` 211–215 | uniform scale | asymmetric | pixel-art crispness |
| 29 | preview / main canvas | `Game.isPreview` 29, 121, 182 (`if (!this.isPreview)`) | boolean ctor flag | asymmetric (main is fully featured; preview skips sky & UI sync) | tiny in-window generator preview |
| 30 | evergreen / deciduous-ish | `Tree.TreeType` (`sequoia/pine` cold-tolerant vs `oak/bush/hedge` warm) implicit in `TreeConfig` biome lists | data convention | asymmetric | biome-realism |
| 31 | living / non-living foliage (`cactus` flowering / non-flowering) | `Tree.hasFlower`, `flowerChance` 34–38 | float gated boolean | asymmetric (default chance 0.05) | cosmetic bloom |
| 32 | flower left / flower right | `Tree.flowerPos`; 37, 159–164 | string union `'left'/'right'/'top'` (top unused for cactus) | symmetric (50/50 coin flip) | symmetry-breaking on a symmetric cactus model |
| 33 | trunk / foliage | every `Tree.draw*` method (e.g. 61–77) | fill colour pair + fillRect order | asymmetric | render order: trunk first, then crown |
| 34 | body / roof | `Building.ts` 13–14 (`baseColor` / `roofColor`) | pair of fields | asymmetric (roofColor = base − 20% L, see `CityGenerator.pickColor` 231) | derived dual |
| 35 | brick / wood / stone / plaster (material) | `Building.BuildingMaterial` 4 | string union (4) | not strictly binary; brick+wood are textured, stone+plaster are flat → secondary dualism textured/flat | gen-time material picker |
| 36 | flat / gabled / dome / crenelated (roof) | `Building.RoofType` 5 | string union (4) | secondary dualism: pointed (gabled, crenelated, dome partly) vs flat | roof shape gen |
| 37 | grass / pavement / water / dirt (ground) | `Ground.GroundType` 3 | string union (4) | secondary dualism: walkable (grass/pavement/dirt) vs blocking (water) — see `CityGenerator.addChunk` 108 "if groundType !== 'water'" | gates feature placement |
| 38 | water / not-water | `CityGenerator.addChunk` 108, 160–163 | boolean derived | asymmetric (water suppresses obj, enforces min width) | rivers without objects |
| 39 | cold biome / hot biome | `BiomeSystem.transitions` 11–17 (tundra↔forest, desert↔plains) | adjacency graph | symmetric topology | climate-believable transitions |
| 40 | desert / non-desert (cactus eligibility) | `TreeConfig` 43–49; `Tree.drawCactus` flower logic | string match | asymmetric | only cacti flower |
| 41 | biome auto / biome forced | `CityGenerator.forceBiome`; HTML `<option value="auto">` 155 | sentinel string | asymmetric (auto = default) | UI override |
| 42 | sparse / dense (density DNA) | `CityGenerator.dna.density` 11, 37 (range 0.4..0.9) | float | not symmetric (skewed toward dense) | building frequency |
| 43 | low / high greenery DNA | `CityGenerator.dna` 12, 38 (0.1..0.8) | float | symmetric range | tree frequency |
| 44 | short / tall (height DNA, building) | `CityGenerator.dna.buildingHeight` 13, 39 (0.8..1.2) | float | symmetric around 1.0 | global scale |
| 45 | min / max height (per tree) | `TreeConfig.minHeight/maxHeight`; `main.ts` dual slider 1040–1041, 1217–1243 | numeric pair + dual `<input type=range>` | symmetric (clamped against each other) | range of randomness per species |
| 46 | computed / cached texture | `Building.cacheCanvas` 18, 30; `CityEntity.cacheCanvas` 8, 19–30 | per-instance offscreen canvas | asymmetric | draw-once, blit-many |
| 47 | inline / cached drawing | `Ground.draw` (inline) vs `Building.draw` (blit cache); `Landscape.draw` does BOTH (cache + live `fillRect`) | per-class choice | asymmetric | grounds are cheap rectangles, buildings are expensive textures |
| 48 | abstract / concrete (`Renderable` / `CityEntity` / `Ground` / `Building`) | `Renderable.ts` interface vs `CityEntity.ts` abstract class | TS `interface` vs `abstract class` | asymmetric | two ways to be drawable |
| 49 | type-only / runtime import | many `import type { … }` (e.g. `Terminal.ts` 1–3, `Game.ts` 3, `CityGenerator.ts` 3, `Landscape.ts` 2) | `import type` keyword | asymmetric | erase types at build, preserve runtime |
| 50 | declared / used | TypeScript `_canvas` 41 in `SkySystem`, `_viewX/_viewWidth` in `Building.isVisible` 124, `_screenHeight` in `Layer.draw` 38 | leading underscore convention | asymmetric (underscore = consciously unused) | satisfy lint |
| 51 | exported / internal | `export class` vs file-private; e.g. `SkySystem.keyframes` (private) vs `getTime()`, `update()`, `draw()` (public) | TS access modifiers | asymmetric | encapsulation |
| 52 | public / private (Game fields) | `Game.ts` 8–30 (`public generator`, `public treeConfig`, `public timeScale` vs `private canvas`, `private layers`, `private isMuted`) | TS modifiers | asymmetric (private = default-ish) | API boundary |
| 53 | strict / lax typing | `args[0] as any` in `Terminal.ts` 335 (`fmt as any`); `import type` strictness | per-line escape hatches | asymmetric | pragmatic TS |
| 54 | visible / hidden (CSS class `.visible`) | `style.css` 111–113, 149–152, 166–168, 473–475; `main.ts` `classList.add/remove('visible')` everywhere | CSS class toggle | asymmetric (default = hidden via `display:none`) | window discoverability |
| 55 | fullscreen / windowed | `Terminal.fullscreen` 348–386; `main.ts toggleFullscreen` 629–652; `index.html` btn-fullscreen | document.fullscreenElement boolean | symmetric (vendor prefixes in toggleFullscreen handle the same dual on 4 vendors) | immersion mode |
| 56 | vendor-prefixed / standard fullscreen | `main.ts` 630–651 | branch chain: webkit/moz/ms/standard | asymmetric (standard tried first) | cross-browser fallback |
| 57 | focused / unfocused (input element) | `main.ts` 1680–1693 (`document.activeElement?.tagName === 'INPUT'`); also 1178–1183 (`document.activeElement !== minInp`) | DOM property | asymmetric | gate keyboard shortcuts; don't fight user typing |
| 58 | muted / unmuted | `Game.isMuted`; `Terminal.mute` 290–317; `main.ts setGlobalVolume` 538–573 | boolean + icon swap (line/cross vs arc) | asymmetric (unmuted default; icon SVG paths are TWO distinct fragments) | audio gate |
| 59 | volume / lastVolume | `main.ts` 533–534, 549–554 | number pair (now / remembered) | asymmetric | restore-after-mute pattern |
| 60 | simple / advanced settings | `index.html` settings-window vs advanced-window 50–138; `main.ts btnAdvanced` 343–358 | two `.ui-window` divs | asymmetric (settings is the entry point) | progressive disclosure |
| 61 | slider / numeric input (Advanced Speed) | `index.html` 113–114; `main.ts` 481–500 | two `<input>` siblings, kept in sync | symmetric (either can drive) | precision vs feel |
| 62 | log-slider / linear-slider | `main.ts getSpeedFromSlider` 1399–1405 (log10) vs `adv-speed-slider` 1397+ linear 0..1000 | math fn pair | asymmetric (advanced is linear, casual is log) | two speed UX modes |
| 63 | center / out-of-bounds (adv speed recenter) | `main.ts updateAdvSpeedUI` 432–456 (`spd < minS || spd > maxS`) | numeric guard | asymmetric | sliding viewport over an unbounded axis |
| 64 | snap-to-center / continuous (speed slider) | `main.ts` 1442 (`Math.abs(val) < 0.05` snap) | threshold | asymmetric (snap is exception) | UX magnet |
| 65 | input-text expression / numeric (volume + speed) | `Terminal.speed` 199–216 + `main.ts applyAdvInputText` 468–479 (`Function(...)` eval) | string parse → number | asymmetric (numeric is "happy path") | accept math (π, Math.PI) |
| 66 | π / Math.PI substitution | `Terminal.ts` 202 (`inputStr.replace(/π/g, 'Math.PI')`) | string substitution | asymmetric | unicode convenience |
| 67 | history-active / history-inactive | `main.ts commandHistory` 1564–1566, ArrowUp/Down 1635–1655 | `historyIndex === -1` sentinel | asymmetric (-1 = idle) | shell-like history |
| 68 | command / alias | `Terminal.commands` 27 (Map double-keyed by name + each alias) 47–52 | Map collision | symmetric storage, asymmetric in help (`getSuggestions` filters `name === cmd.name.toLowerCase()` to dedupe) | terse aliases without duplicate help |
| 69 | name / description | every `Command` 17–24 | string pair | symmetric (always both present) | help text |
| 70 | usage / aliases (help text) | `Terminal.help` 142–143 | string pair | asymmetric (aliases optional) | helpful CLI |
| 71 | execute / autocomplete | `Command.execute` vs `Command.autocomplete` 22–23 | function pair (mandatory / optional) | asymmetric | type/query symmetry |
| 72 | query / mutate (Terminal commands) | `seed [val]` / `seed` (display) 175–186; `speed [val]` / `speed` (display) 194–198; etc. | "no-args = read, args = write" convention | symmetric | REPL idiom |
| 73 | echo input / output result | `Terminal.execute` 58 (`> ${input}`) vs `onOutput(msg)` everywhere | prefix string `> ` | asymmetric | tty mimicry |
| 74 | error / non-error output | `onOutput(msg, isError?)` 30, 38; `main.ts` 1573 (`'#ff5555' : '#00ff00'`) | optional boolean → red vs green | asymmetric (success default) | color-coded log |
| 75 | green / red (CSS palette) | `style.css` 397 `#2E7D32` (selected/apply), 426 `#d32f2f` (reset/modified), 247 `rgba(0,255,0,0.4)` (copied), 1573 (terminal lines), 1825 hsl gradient | colour pair | asymmetric (green = good, red = danger) | universal UI semantic |
| 76 | yellow / red reset button | `style.css` 418–430; `main.ts updateTreeResetButton` 871–884 | two CSS class states | asymmetric | tri-state collapsed: yellow=idle, red=dirty, (dark-red briefly during confirm) |
| 77 | first-click / confirmed-click (destructive) | `main.ts btnAdvReset` 512–530, `btnGenReset` 1330–1361; `Terminal.reset` 411–414 | boolean `isResetConfirming` + 3000ms timeout | asymmetric | "are you sure?" gate |
| 78 | timer-armed / timer-cleared | `main.ts` 528 `setTimeout(cancelAdvResetConfirm, 3000)`; `clearTimeout(volFadeTimer)` 1888 | timer id / null | asymmetric | TTL on confirm state |
| 79 | manual override / native handle (Escape) | `main.ts` 1680–1770 (Escape priority chain ends with "we leave preventDefault OFF here deliberately") | branching with explicit non-prevent | asymmetric | cede control to browser for fullscreen exit |
| 80 | pointer-locked / pointer-free | `main.ts` 1785, 1804, 1761–1765 (`document.pointerLockElement`) | DOM flag | asymmetric (locked = special, free = default) | infinite drag gesture |
| 81 | drag / hold | `main.ts mousedown` 1779–1801 (`setTimeout(..., 200)` to upgrade click into hold-drag) | time threshold | asymmetric | gesture vs click |
| 82 | mouse / keyboard input | `main.ts wheel/mousedown/mousemove/dblclick/click` vs `keydown` (1678) | two event families with separate handlers | symmetric (both drive same state) | dual input paths |
| 83 | scroll-up / scroll-down (volume) | `main.ts wheel` 1855–1859 (`e.deltaY < 0` increment, else decrement) | sign of deltaY | symmetric | natural scroll mapping |
| 84 | mouse-enter / mouse-leave (volume popup) | `main.ts` 1462–1467 | event pair | symmetric | hover popover |
| 85 | open / close window | `main.ts toggleWindow` 604–609; close-on-outside-click 620–626 | function returns next state | symmetric | UX standard |
| 86 | inside-target / outside-target (click) | `main.ts` 622 (`!settingsWindow.contains(...)`); 1364 | DOM containment check | asymmetric | dismiss-on-outside |
| 87 | "isVisible" old API / "isVisible" optimised | `Renderable.isVisible` 7 vs `Building.isVisible` always-true (124–126) vs `CityEntity.isVisible` bounds (61–64) | interface contract drift | asymmetric (Building opts out) | dead-code-ish |
| 88 | update / render | `Game.loop` 156–157 | two sequential method calls | asymmetric (update first) | classic game loop |
| 89 | save / restore (canvas state) | `Game.render` 214–235 (`ctx.save()` / `ctx.restore()`); `SkySystem.draw` 205–230; `Layer.draw` 53–72; `CityEntity.initCache` 27 (translate only, no restore) | matched call pair | symmetric | canvas stack |
| 90 | translate(pad) / no-restore (CityEntity cache) | `CityEntity.initCache` 27 | asymmetric pair (no `restore()`) | asymmetric, broken-on-purpose | offscreen canvas is discarded |
| 91 | minX / maxX (cloud bounds) | `SkySystem` 80–137 | numeric pair tracked during cloud-part generation | symmetric | precise off-screen cull |
| 92 | spawn / despawn (clouds) | `SkySystem.update` 166–182 (`createCloud(false)` after splice) | re-spawn loop | symmetric (count stays at 20) | infinite cloud stream |
| 93 | cumulus / cirrus / stratus | `SkySystem.createCloud` 57–76 | tertiary string union | tertiary not binary; secondary dualism cumulus (puffs/arc) vs non-cumulus (ellipse/rect) | varied skies |
| 94 | initial spawn (randomX) / wrap spawn (overrideX or off-screen) | `SkySystem.createCloud(randomX, overrideX)` 47, 141–152 | two-arg branching | asymmetric (initial fills the sky, wrap fills the gap) | seeded-looking sky on boot |
| 95 | hex / rgb colour string | `SkySystem.lerpColor.parse` 254–270 | regex branch | asymmetric (hex is the data, rgb appears in `overlay`) | mixed colour formats |
| 96 | r1/g1/b1 / r2/g2/b2 lerp endpoints | `SkySystem.lerpColor` 271 | two triplets | symmetric | colour interpolation |
| 97 | round / float (interpolated colour) | `SkySystem.lerpColor` 274–277 | explicit `Math.round` to dodge sub-pixel multiply | asymmetric | canvas/CSS integer demand |
| 98 | clear / fill (canvas before texture) | `Building.generateTexture` 47–65; `TextureGenerator.create*` | implicit clear via initial fillRect | asymmetric | first-paint wipe |
| 99 | brick offset row / non-offset row | `TextureGenerator.createBrickPattern` 18 (`(y/brickHeight) % 2 === 0 ? 0 : brickWidth/2`) | parity | symmetric | running-bond masonry |
| 100 | day reflection / warm light (window colour) | `Building.generateTexture` 73–74 (`Math.random() > 0.5` → `#FDF5E6` vs `#87CEEB`) | coin flip | symmetric | every building biased one way |
| 101 | window present / window missing | `Building.generateTexture` 79 (`Math.random() > 0.2`) | coin flip 80/20 | asymmetric (mostly present) | dilapidation noise |
| 102 | merlon / crenel | `Building.generateTexture` 102–104 (`(i / 10) % 2 === 0`) | parity | symmetric | crenelated roof teeth |
| 103 | smooth silhouette / decorated landscape | `Landscape.decorate` 86 (`if (this.biome === 'city') return`) | early-return | asymmetric (city is special-cased) | distant city skyline = no props |
| 104 | left-of-peak / right-of-peak (landscape decor) | `Landscape.decorate` 110–116 (`if (px < peakX)`) | branch | mirror-symmetric | place props on slope |
| 105 | shape closing top-walk / bottom-walk | `Landscape.drawToCache` 70–79 (forward `lineTo` along points, then "way down" close at `this.height * 2`) | path direction | asymmetric | fill below curve |
| 106 | layer Y-offset positive / zero | `Layer.yOffset` 13; `Game.reset` 110–114 (190 / 100 / 50 / 0) | float per layer | asymmetric (foreground anchored at 0) | hill-effect for backgrounds |
| 107 | layer scale `1.0` / `1.3` (background) | `Game.reset` 111 (4th arg `1.3` only on background layer) | asymmetric option | asymmetric | distance fake |
| 108 | yes-prefix / no-prefix command name dedup | `Terminal.getSuggestions` 109 (`name === cmd.name.toLowerCase()`) | string equality | asymmetric | alias / canonical separation in autocomplete |
| 109 | ends-with-space / no-trailing-space (autocomplete) | `Terminal.getSuggestions` 101 (`/\s$/.test(input)`) | regex | symmetric (drives two branches of completion) | "complete next arg" vs "complete current arg" |
| 110 | empty-args / non-empty-args branching | every `execute` callback (e.g. `seed` 175, `pause` 242, `volume` 270, `mute` 301, `format` 329) | `args.length === 0` | symmetric pair (read vs write) | REPL idiom (see #72) |
| 111 | enabled (true) / disabled (false) token shorthand | `Terminal.generate` 513–514 | bare-token vs `key:value` | asymmetric | terse CLI |
| 112 | bare token / `key:value` token | `Terminal.generate` 512–528 | token shape branch | symmetric (each pair becomes one mutation) | flexible parser |
| 113 | input echo prefix `> ` / non-prefixed paste | `main.ts terminal-line click` 1577–1588 (`msg.startsWith('> ') ? msg.substring(2) : msg`) | conditional substring | asymmetric | copy without prompt char |
| 114 | clipboard success / failure | `main.ts copyToClipboard` 250–262 / 1579–1587 (`.then` / `.catch`) | promise pair | asymmetric (success path animates green) | best-effort clipboard |
| 115 | typescript-strict / `as any` escape | `Terminal.ts` 335 (`fmt as any`), `main.ts` various `(document as any).webkitFullscreenElement` 630–650, `(game as any).setTimeScale?.` 1418, `(window as any).volFadeTimer` 1881 | cast | asymmetric | pragmatic gaps |
| 116 | error popup alert / silent | `main.ts` 3–5 (`window.addEventListener('error', alert(...))`) vs caught try/catch in `Game.loop` 158–161 | global alert vs console.error | asymmetric | dev-time loudness vs runtime-safe |
| 117 | first-paint immediate / interval re-paint (tree icons) | `main.ts renderTreeSettings` 1083–1085 (`drawIcon()` + `setInterval(drawIcon, 1000)`) | one-shot vs recurring | symmetric (both call same fn) | live preview tile |
| 118 | open-modal / clear-intervals (tree icons leak guard) | `main.ts btnGenClose` 687–691 (`iconIntervals.forEach(clearInterval)`) | array-of-handles cleanup | asymmetric | perf when window closed |
| 119 | DOM-injected / DOM-existing (treeSettingsContainer) | `main.ts` 719–727 | `if (!treeSettingsContainer)` fallback | asymmetric (already-present is the happy path) | defensive HTML injection |
| 120 | hot-cache config (`previewGame.generator.config`) / persisted config (`game.treeConfig`) | `main.ts btnGenApply` 698–710, `refreshPreview` 747 | two TreeConfig instances kept in sync via `JSON.parse(JSON.stringify(...))` | asymmetric (preview is editable scratch, game is canonical) | apply-on-confirm flow |
| 121 | `JSON.parse(JSON.stringify(...))` deep-clone everywhere / no-clone aliasing | `Game.ts` 41; `CityGenerator` 30–33; `Terminal.ts` 435, 438, 583, 586; `main.ts` 704, 747, 951, 1093, 1344, 1346, 1375, 1552, 1553 (15+ sites) | manual clone convention | asymmetric (alias was the bug, clone is the fix) | break shared references; see #46 inline duplication |
| 122 | active hint / passive hint (terminal autocomplete) | `main.ts renderTerminalHints` 1497–1520; `terminalActiveHintIndex` 1480 | int index pointing to active | asymmetric | tab cycles through |
| 123 | tab next / no-tab (hint stays the same) | `main.ts terminalInput keydown` 1599–1604 (`e.key === 'Tab'`) | event branch | asymmetric | cycle navigation |
| 124 | space-commits-hint / space-as-space | `main.ts` 1605–1619 (`if e.key === ' ' && terminalActiveHintIndex >= 0`) | conditional intercept | asymmetric | "tab to highlight, space to accept" |
| 125 | command in window-visible state / not-in-window (Enter shortcut) | `main.ts keydown` 1722–1728 | DOM class check | asymmetric | Enter inside windows = native form behaviour |
| 126 | priority chain Escape (Terminal > CustomGen > Advanced > Settings > PointerLock > Fullscreen) | `main.ts` 1731–1770 | sequential `if … return` ladder | asymmetric (ordered) | nested-modal close order |
| 127 | Polish chat / English code | `main.ts` 1895 final Polish flavour comment vs entirely-English identifiers | language pair | asymmetric | author's voice / lingua franca |
| 128 | success comment / dev-warning comment | many `// TODO: Apply to audio context` (Game.ts 273, 283), `// NOTE: Ideally we check` (CityGen 88), `// User Update: Stretch periods` (SkySystem 292) | annotation type | asymmetric | bug-debt markers |
| 129 | `score` / clock time format | `Game.update` 190–204; `Terminal.format` 320–346 | tertiary `'score'/'24h'/'12h'` but rooted in clock-vs-counter | asymmetric (24h is the default) | gameplay vs immersion clock |
| 130 | 24h / 12h time format | same lines, AM/PM branch 198–204 | sub-dualism inside #129 | symmetric | locale taste |
| 131 | AM / PM | `Game.update` 199 (`h >= 12 ? 'PM' : 'AM'`) | string pair | symmetric | clock convention |
| 132 | h % 12 || 12 (zero / twelve guard) | `Game.update` 200 | fallback expression | asymmetric (12 replaces 0) | non-zero clock hour |
| 133 | `padStart` / raw int | `Game.update` 196–203 | optional zero-pad | asymmetric | aligned numerals |
| 134 | string seed / numeric seed start | `main.ts` 235 (`Math.floor(Math.random()*100000).toString()`) | always start as string | asymmetric | type uniformity downstream |
| 135 | static class methods / instance methods | `TextureGenerator.createBrickPattern/createWoodPattern` (static) 2, 26 vs all other classes (instance) | TS modifier | asymmetric (texture gen is stateless) | utility vs stateful |
| 136 | colour-scheme `light dark` (root) | `style.css` 6 | CSS dual-mode declaration | symmetric (UA decides) | system theme |
| 137 | `display: none` / `display: flex`/`block` | `style.css` 106–113, 143–152, 162–168 | toggle by `.visible` class | asymmetric | window hide/show |
| 138 | `pointer-events: auto` / `pointer-events: none` | `style.css` 343 (`#gesture-slider-container … pointer-events: none`), `#ui-layer` 57 `none`, `#bottom-right-controls` 77 `auto`, `#seed-display` style 11 `auto` | CSS pair | asymmetric | overlay-but-click-through |
| 139 | -webkit-appearance / -moz-appearance | `style.css` 383–384, 388, 514–515, 520, 535 | vendor prefix pair | symmetric (both targeted) | cross-browser slider styling |
| 140 | track-bg / track-fill (dual slider) | `style.css` 488–504; `main.ts` 1038–1039 | two stacked divs | asymmetric (fill sits over bg) | range visualisation |
| 141 | slider-min input / slider-max input (z-stacked dual) | `style.css` 506–518 (`pointer-events: none` on track wrapper, `auto` on thumb only); `main.ts` 1040–1041 | two `<input type="range">` siblings | symmetric | "Dual Slider" pattern is named — the explicit duality |
| 142 | thumb auto / track none (pointer events) | `style.css` 506–521 | per-element override | asymmetric | clicks pass through track gaps to whichever thumb is closer |
| 143 | `font-synthesis: none` / antialiased | `style.css` 10–13 | typography pair | symmetric | crisp text |
| 144 | `:hover` / default state (CSS) | many: `.control-btn:hover`, `.btn-small:hover`, `.tree-setting-wrapper:hover`, `.terminal-line:hover` | pseudo-class | asymmetric | feedback |
| 145 | `aspect-ratio: 16/9` preview / freeform main canvas | `style.css` 199, 207–212 vs `#game-canvas` 45–49 (100% × 100%) | aspect lock vs fluid | asymmetric | preview consistency |
| 146 | `transform: translate(-50%, -50%)` centred modal / corner-anchored UI | `style.css` 126, 158 vs `#bottom-right-controls` 73 (`bottom/right`) | positioning pair | asymmetric | centre = focus, corner = ambient |
| 147 | fixed / absolute positioning | `style.css` 122–123, 441; vs `position: absolute` (default for most) | CSS keyword pair | asymmetric | escape ancestor layout |
| 148 | `z-index` low / high (UI layer) | `style.css` 55 (z=10), 76 (z=100), 132 (z=300), 161 (z=200), 228 (z=150), 310 (z=200), 348 (z=500), 454 (z=9999), `main.ts` 1510 (z=10) | stacking ladder | asymmetric ladder | nested modals + global overlays |
| 149 | overflow hidden / overflow scroll | `style.css` 37 (`body, html: overflow:hidden`) vs 174 (`#custom-gen-content: overflow:hidden`) vs 222 (`#terminal-output-container: overflow-y:auto`) vs 978 (`#tree-settings-list: overflow-y:auto`) | per-container | asymmetric | only intentional scrollers scroll |
| 150 | bullet-icon arrow `▶` / `▼` (collapsed/expanded tree settings) | `main.ts` 962–963 | unicode glyph pair | symmetric | disclosure widget |

Total: **150 distinct dualisms catalogued.**

(Other agents may double-count localised dualisms; this list dedupes.)

## Grouped by category

### Diurnal (sky / lighting / celestial)

#1 day/night, #2 sun/moon, #3 sunrise/sunset flip, #4 bloom/no-bloom, #5 flipWin/rayWin, #6 scaleX cosine flip, #7 sky-top/sky-bot gradient, #8 multiply/source-over composite, #93 cloud type partitions (cumulus vs others), #94 initial-spawn / wrap-spawn (cloud lifecycle), #95 hex/rgb parsing, #96 colour endpoints, #97 round/float in lerp. Related: [[concepts/Day Night Cycle]], [[entities/SkySystem]].

### Temporal (time, simulation)

#9 paused/playing, #10 timeScale ±, #11 real-time vs in-world, #12 frame-time vs safeDt, #129 score/clock, #130 24h/12h, #131 AM/PM, #132 0/12 hour guard, #133 padStart, #62 log/linear slider, #64 snap-to-center, #67 history-active/idle, #78 timer-armed/cleared. Related: [[concepts/Game Loop]], [[concepts/Time Formats]].

### Spatial (rendering, parallax, coords)

#23 fg/bg layer index, #24 parallax near/far, #25 visibility cull, #26 prune cull, #27 world/screen coords, #28 logical/physical px (1.6 scale), #91 cloud minX/maxX, #104 left/right of peak, #105 path closing direction, #106 layer yOffset, #107 layer scale, #146 centred/corner UI, #147 fixed/absolute, #148 z-index ladder, #149 overflow scroll. Related: [[concepts/Parallax Layers]], [[entities/Layer]].

### Generative (proc-gen)

#13 seeded/Math.random, #14 deterministic core / stochastic decoration, #15 string/number seed, #16 default/custom config, #21 biome-available/unavailable, #22 building/tree, #30 evergreen/deciduous, #31 flowering/non, #32 flower L/R, #41 biome auto/forced, #42 sparse/dense, #43 greenery low/high, #44 short/tall, #45 min/max height pair, #98 clear/fill, #99 brick parity, #100 day-reflection / warm-light window, #101 window present/missing, #102 merlon/crenel, #103 silhouette / decorated, #134 seed always-string. Related: [[concepts/Procedural Generation]], [[concepts/Determinism]].

### Categorical (taxonomies)

#22 building/tree (also generative), #30 evergreen/deciduous, #35 brick/wood/stone/plaster + textured/flat sub-dual, #36 roof types + pointed/flat, #37 ground types + walkable/blocking, #38 water/not-water, #39 cold/hot biome via adjacency, #40 desert/non-desert, #93 cumulus/cirrus/stratus + cumulus/non. Related: [[concepts/Biomes]], [[entities/BiomeSystem]].

### Interface (UI affordances)

#17 reset modified/default, #18 reset pending/idle, #19 confirm/abort, #20 enabled/disabled toggle, #29 preview/main canvas, #54 visible/hidden, #55 fullscreen/windowed, #56 vendor/standard fullscreen, #57 focused/unfocused input, #58 muted/unmuted, #59 volume/lastVolume, #60 simple/advanced settings window, #61 slider/text input pair, #63 center/out-of-bounds, #74 error/non-error output, #75 green/red, #76 yellow/red reset, #77 first/confirmed click, #79 manual/native Escape handling, #80 pointer-locked/free, #81 drag/hold, #82 mouse/keyboard, #83 scroll +/-, #84 mouseenter/leave, #85 open/close, #86 inside/outside click, #117 first-paint/interval, #118 open/clear-intervals, #122 active/passive hint, #123 tab/no-tab, #124 space-commits/space-as-space, #125 in-window/out-of-window Enter, #126 Escape priority chain, #136 light/dark, #137 display none/flex, #138 pointer-events auto/none, #140 track-bg/track-fill, #141 dual-slider min/max inputs, #142 thumb auto / track none, #144 hover/default, #145 aspect-locked / fluid, #150 ▶/▼ disclosure glyph. Related: [[concepts/UI Surfaces]], [[concepts/Reset Confirmation Pattern]].

### Behavioural (read/write, sync/async)

#9 paused/playing (also temporal), #46 computed/cached, #47 inline/cached drawing, #65 expression / numeric input, #66 π/Math.PI, #68 command/alias, #69 name/description, #70 usage/aliases, #71 execute/autocomplete, #72 query/mutate REPL idiom, #73 echo/output, #88 update/render, #89 save/restore canvas, #90 translate/no-restore (cache bug-by-design), #92 spawn/despawn, #110 empty-args/non-empty, #111 enable-shorthand/key-value, #112 bare-token/key-value, #113 prefix-stripped copy, #114 clipboard success/fail, #119 inject/existing DOM, #120 hot/persisted config, #121 deep-clone/alias, #128 todo/note comments. Related: [[concepts/Terminal Command Model]], [[concepts/Config Mirroring]].

### Compile-time

#48 interface/abstract class, #49 type-only/runtime imports, #50 declared/used (underscore convention), #51 exported/internal, #52 public/private fields, #53 strict/lax (`as any`), #115 strict/escape-hatch, #135 static/instance, #143 font-synthesis none/antialiased. Related: [[concepts/TypeScript Conventions]].

### Architectural

#11 real/world time, #14 deterministic core / stochastic decoration, #29 preview/main, #46–47 cache vs inline, #48 interface vs abstract class, #88 update/render, #120 preview/persisted config, #126 Escape priority chain, #116 alert/console error. Related: [[concepts/Engine Architecture]], [[entities/Game]].

## Invariants

- Every `ctx.save()` in main render paths has a matching `ctx.restore()` — except #90 (deliberate offscreen-canvas exception).
- `JSON.parse(JSON.stringify(...))` is the canonical clone idiom; failing to use it has been the source of the "config aliasing" class of bugs (#121, see also `refreshPreview` and `btnGenApply`).
- Default vs Modified state is always a dual rendered as a CSS class (.default / .modified), never just a colour change.
- Deterministic vs stochastic split is leaky: `Building`, `Landscape.decorate`, `SkySystem` constructor all use `Math.random()` even though the rest of generation is seeded. This is by design (decorative noise) but undocumented.

## Surprises / risks / TODOs

- **Negative `timeScale`** (#10): the Advanced slider allows `[-10000, 10000]` but `Game.update(dt)` happily accepts negative `dt` and feeds it into `cameraX += cameraSpeed * dt` — reverse-scrolling is implicit. Buildings would never *un*-spawn though, because `Layer.prune` only filters left edge. Risk: undefined behaviour at large negatives.
- **`Math.random()` inside seeded contexts** (#13, #14): `Building.generateTexture`'s window-colour coin flip and `Landscape.decorate`'s prop jitter mean two runs with the same seed produce visually different cities. Surprising for a "seeded" engine.
- **`SkySystem` is unseeded** (#13): constructor uses `Date.now()`. Time-of-day at startup is non-reproducible even with a fixed seed.
- **Reset confirm timer leak** (#78): `setTimeout(cancelAdvResetConfirm, 3000)` is not stored in a handle and not cleared if the user confirms within 3s. Benign but a leak class.
- **CityEntity cache asymmetry** (#90): `initCache` calls `ctx.translate(padding, padding)` without `save`/`restore`. Works because the offscreen ctx is single-use, but violates the canvas-state dualism elsewhere.

## Suggested wiki pages

- [[concepts/Dualism in skyline-scroller]] — landing page using this table as the index
- [[concepts/Day Night Cycle]] — the sunrise/sunset flip mechanism (#1–#8)
- [[concepts/Determinism]] — seeded vs `Math.random()` leak (#13–#15)
- [[concepts/Reset Confirmation Pattern]] — three implementations of the same dual (#17–#19, #77–#78)
- [[concepts/Dual Slider]] — the literally-named UI duality (#45, #140–#142)
- [[concepts/Escape Priority Chain]] — sequenced-dualism close order (#126)
- [[concepts/Config Mirroring]] — preview vs game `treeConfig` (#120, #121)
- [[concepts/Time Formats]] — score/24h/12h dualisms (#129–#133)

## Top NON-OBVIOUS dualisms

1. **#6 scaleX cosine flip (`Math.cos(angle)` through zero)** — the sun→moon transition isn't a fade; it's a 1D scale that *passes through zero width*, with `drawSun = false` switching at the cosine zero-crossing. The mathematical zero is the moment the celestial body is "edge-on" and invisible. Day/night here is the *sign* of a cosine, not a boolean. (`SkySystem.ts:325–330, 351–356`)

2. **#90 CityEntity.initCache violates the canvas save/restore dualism deliberately** — every render path matches `ctx.save()` with `ctx.restore()`, but `initCache` (`CityEntity.ts:18–30`) calls `ctx.translate(padding, padding)` and never restores. The dualism is broken on purpose because the offscreen canvas is discarded after one use. A "missing pole" that is invisible until you notice every other call site preserves the pair.

3. **#121 The 15+-site `JSON.parse(JSON.stringify(...))` clone idiom is the load-bearing fix for the alias/clone dualism** — `Game.ts:41`, `CityGenerator.ts:30,32`, `Terminal.ts:435,438,583,586`, `main.ts:704,747,951,1093,1344,1346,1375,1552,1553` all do the same deep-clone dance. The dualism between *aliased reference* (bug) and *deep-cloned snapshot* (correct) is encoded as a manual convention everywhere instead of being abstracted. The presence of this idiom at *every* config-handoff site is the strongest signal in the codebase that aliasing was a real, recurring bug.

4. **#129/#130 The "score" time format is a tertiary that hides a deeper dualism**: gameplay-time (`cameraX` integer) vs immersive-time (clock derived from `sky.getTime()`). These two clocks are *not synchronised* — `cameraX` advances with `cameraSpeed * timeScale * dt`, `sky.time` advances with `0.1 * dt * timeScale`. Same `timeScale`, different domains. The "format" UI conflates them.

5. **#108 Alias/canonical command de-duplication in the autocomplete-only path** — `Terminal.registerCommand` writes the command into `this.commands` once per name *and* once per alias (lines 47–52), but `getSuggestions` deduplicates with `if (name === cmd.name.toLowerCase())` (line 109). The dualism between the storage shape (duplicated) and the user-visible shape (deduplicated) is enforced by a string-equality filter in one specific spot — invisible at the API level, load-bearing for help text.
