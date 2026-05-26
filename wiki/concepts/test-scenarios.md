---
type: concept
title: Test scenarios — high-ROI cluster
status: canonical
date: 2026-05-27
related:
  - "[[DEC-11-architecture-pass-2]]"
  - "[[plans/architecture-pass-2]]"
  - "[[concepts/determinism]]"
---

# Test scenarios — high-ROI cluster (23 tests, Codex-curated)

The 5-agent swarm catalogued ~50 candidate tests; Codex B pruned trivia (e.g. "preview skips resize" — which is FALSE: `Game.constructor` always calls `resize`) and ranked the rest by bug-catching ROI. **These 23 are the canonical first wave** to write in Stages I + J of [[plans/architecture-pass-2]].

Each test has a **concrete numeric assertion** where possible — vague "snap is deterministic" claims were rewritten with specific numeric expectations so the assertion fails loudly on regression.

## UI logic tier (Stage I — Vitest + jsdom)

### 1. `speed-slider.test.ts` — log10 math

```
getSpeedFromSlider(-1) === 0.1
getSpeedFromSlider(0)  === 1
getSpeedFromSlider(1)  === 10
getSliderFromSpeed(5)  closeTo 0.6989700043360188, eps 1e-9
getSliderFromSpeed(1)  === 0
abs(sliderInput - 0) < 0.05 -> snap to 0 and updateSpeed(1.0)
```

### 2. `advanced-window.test.ts` — slider zero stops the game (regression #38)

```
init game with timeScale=1
advanced.executeAdvSpeedSet(0, true)
expect(game.timeScale).toBe(0)
expect(advSpeedSlider.value).toBe('0')    // leftmost
expect(advSpeedInput.value).toBe('0')
```

### 3. `advanced-window.test.ts` — basic bar pins to extreme (regression #39)

```
init basic slider at 0
advanced.onSpeedChange(100)
expect(speedSlider.value).toBe('1')       // right extreme, not center

advanced.onSpeedChange(0.001)
expect(speedSlider.value).toBe('-1')      // left extreme
```

### 4. `smart-reset.test.ts` — visual toggle

```
updateSmartResetVisual(btn, true)
expect(btn.classList).toContain('default')
expect(btn.classList).not.toContain('modified')

updateSmartResetVisual(btn, false)
expect(btn.classList).toContain('modified')
expect(btn.classList).not.toContain('default')
```

### 5. `error-toast.test.ts` — debounce

```
showErrorToast('a'); showErrorToast('b'); showErrorToast('c')
within 250ms only one toast in DOM
text reads 'c' (last write wins)
after 4s toast auto-hides
```

### 6. `keyboard-shortcuts.test.ts` — terminal toggle on 't'

```
dispatchEvent(new KeyboardEvent('keydown', {key: 't'}))
expect(terminalBar.style.display).toBe('flex')
```

### 7. `terminal-bind.test.ts` — quoted multi-arg parse

```
execute(`generate "oak" biomes:forest,plains`)
expect(commandsRan).toEqual([{cmd: 'generate', args: ['oak', 'biomes:forest,plains']}])

execute(`speed (1+2)*3`)
expect(game.timeScale).toBe(9)
```

### 8. `gestures.test.ts` — pointer-lock cleanup

```
dispatch dblclick on canvas
expect(document.exitPointerLock).toHaveBeenCalled()
expect(speedSlider.value).toBe('0')   // reset to centre
```

### 9. `audio-controls.test.ts` — mute toggle

```
init with isMuted=false, volume=0.5
clickMute()
expect(game.getMuted()).toBe(true)
expect(iconSound.dataset.muted).toBe('true')
clickMute()
expect(game.getMuted()).toBe(false)
```

### 10. `custom-gen-window.test.ts` — preview disposed on close

```
openWindow()
const preview = getPreview()
closeWindow()
expect(preview.isRunning).toBe(false)
expect(getPreview()).toBeNull()
```

### 11. `tree-config-editor.test.ts` — isTreeModified

```
config = deepClone(DEFAULT_TREE_CONFIG)
expect(isTreeModified('oak', config)).toBe(false)
config.oak.minHeight = 999
expect(isTreeModified('oak', config)).toBe(true)
```

### 12. `seed-controls.test.ts` — input read / write

```
seedInput.value = 'abc'
setSeedBtn.click()
expect(game.getSeed()).toBe('abc')

randomBtn.click()
expect(game.getSeed()).not.toBe('abc')
```

## Engine + procgen tier (Stage J — Vitest with mock canvas)

### 13. `Layer.test.ts` — snap with concrete inputs (regression #40)

```
const layer = new Layer(0.2, 0, 0, 1.3)
const obj = {x: 100, width: 50, draw: jest.fn()}
layer.add(obj)
layer.draw(mockCtx, 11.2, 1920, 1080, 1.6)

const effectiveScale = 1.6 * 1.3            // = 2.08
const snapped = Math.round(11.2 * 0.2 * effectiveScale) / effectiveScale
// snapped = Math.round(4.6592) / 2.08 = 5 / 2.08 = 2.4038461538461538
expect(obj.draw).toHaveBeenCalledWith(mockCtx, 2.4038461538461538)
```

### 14. `Layer.test.ts` — culling boundary

```
layer.add({x: 100, width: 50, draw})   // right edge at 150
layer.prune(2150, 2000)                 // buffer=2000, cutoff=150
expect(layer.objects).toHaveLength(0)   // pruned

layer.add({x: 100, width: 50, draw})
layer.prune(2149, 2000)                 // cutoff=149, edge at 150 > 149
expect(layer.objects).toHaveLength(1)   // retained
```

### 15. `Game.test.ts` — dt clamp

```
const game = new Game(mockCanvas)
game.timeScale = 2
game.loop(performance.now())            // first frame, lastTime captured
const longDelay = 1000                  // 1000ms tab-inactive
game.loop(performance.now() + longDelay)
// safeDt should clamp to 0.1, then * timeScale=2 -> 0.2s
expect(game.getCameraX()).toBeCloseTo(100 * 0.2)   // 20px, not 200px
```

### 16. `Game.test.ts` — dispose cancels RAF + removes resize listener

```
game.start()
expect(game.isRunning).toBe(true)
game.dispose()
game.dispose()                          // idempotent
expect(game.isRunning).toBe(false)
expect(cancelAnimationFrame).toHaveBeenCalledTimes(1)
expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
```

### 17. `Game.test.ts` — setSeed recreates generator

```
const game = new Game(mockCanvas)
const gen1 = game.generator
game.setSeed('newseed')
const gen2 = game.generator
expect(gen2).not.toBe(gen1)             // new instance
expect(game.getCameraX()).toBe(0)       // reset
```

### 18. `BiomeSystem.test.ts` — forceBiome duration boundary

```
const rng = new Random('forced').fork('biome')
const sys = new BiomeSystem(rng)
sys.forceBiome('forest')
const max = BIOME_DURATION_MAX                       // 8000
sys.update(max - 1)
expect(sys.getCurrentBiome()).toBe('forest')
sys.update(1)
expect(sys.getCurrentBiome()).not.toBe('forest')     // switched
```

### 19. `BiomeSystem.test.ts` — transition membership

```
sys.forceBiome('forest')
sys.update(BIOME_DURATION_MAX + 1)
const next = sys.getCurrentBiome()
expect(REGIONS.forest.transitionsTo).toContain(next)
```

### 20. `CityGenerator.test.ts` — deterministic stream with golden hash

```
const gen = new CityGenerator('42', 4, DEFAULT_TREE_CONFIG, new Random('42').fork('city'))
const layers = [new Layer(0.2, 0), new Layer(0.4, 1), new Layer(0.6, 2), new Layer(1.0, 3)]
gen.generate(layers, 50000, 1200, 50000)
const hash = sha1(layers.flatMap(l => l.objects.map(o => `${o.x}|${o.width}`)).join(','))
expect(hash).toBe('<golden-hash-captured-once>')   // regenerated post-DEC-11 Stage F
```

### 21. `CityGenerator.test.ts` — config deepclone isolation

```
const config = deepClone(DEFAULT_TREE_CONFIG)
const gen = new CityGenerator('s', 1, config, rng)
config.oak.minHeight = -1                          // mutate after construction
expect(gen.getConfig().oak.minHeight).not.toBe(-1) // gen has its own copy
```

### 22. `SkySystem.test.ts` — time wrap at 24

```
const rng = new Random('42')
const sky = new SkySystem(mockCanvas, rng)
const start = sky.getTime()                        // deterministic for seed 42
const speed = 0.1
const ticksToWrap = (24 - start) / speed + 1
for (let i = 0; i < ticksToWrap; i++) sky.update(1, 1920)
expect(sky.getTime()).toBeCloseTo(0.1, 5)          // wrapped, not stuck at 0
```

### 23. `SkySystem.test.ts` — keyframe interpolation midpoint

```
// keyframes 0: t=0  top=#020024, 1: t=2.5 top=#000000
// midpoint t=1.25 expected top = lerp(#02 -> #00) = #01 etc.
const sky = new SkySystem(mockCanvas, new Random('42'))
sky.setTime(1.25)
const {top} = sky.getSkyColorsForTest()
expect(top).toBe('rgb(1, 0, 18)')                  // exact midpoint
```

## Testability blockers (resolution before Stage J)

Per Codex B's blocker analysis:

1. **`Game.constructor` requires `HTMLCanvasElement` + `window`**. Resolution: a `mockCanvas` helper in `tests/helpers/mockCanvas.ts` returning `{getContext: () => mockCtx, width: 1920, height: 1080, clientWidth: 1920, clientHeight: 1080}`. `mockCtx` stubs only the methods Game actually calls (`save`, `restore`, `translate`, `scale`, `fillRect`, `fillStyle setter`, `createPattern`, `createImageData`, `putImageData`). Jsdom for `window`.

2. **`CityGenerator.generate` reaches `Building`/`Tree`/`Landscape` constructors that cache canvases**. Resolution: same `mockCanvas` helper; entities don't need a real raster, just the API shape.

3. **`SkySystem` cloud assertions touch private `clouds` array**. Resolution: add a `getCloudsForTest()` or `[Symbol.for('test')]` accessor. Tests use only the test-visibility hook.

4. **`Game.start()` immediately schedules RAF**. Resolution: `Game.constructor(canvas, {autoStart: false})` option, OR keep current behaviour and tests call `game.dispose()` immediately to cancel before assertions.

## Out-of-cluster (deferred)

The remaining ~27 scenarios from the swarm pool are valuable but lower ROI — keep this page as a queue. Add them in batches of 5-10 once the 23-cluster proves the testing pattern works.

Lower-ROI examples deferred:
- Material textures *visually* distinct (use pixel diff — heavy, defer)
- Snake-paths / cloud movement smoothness (no clear pass/fail threshold)
- Full Game render-order assertion (sky → layers → ground → ambient → noise)
- Tree visible pixel count

## Conventions

- One file per source module: `tests/<Module>.test.ts`.
- Test names match the table headings above (`'snap with concrete inputs'`).
- `beforeEach` creates a fresh mock canvas; `afterEach` calls `game.dispose()` if game was constructed.
- Golden hashes (Determinism, CityGenerator) live in `tests/golden/` as small JSON files, regenerated only when a DEC bumps the seed-format version.

## See also

- [[DEC-11-architecture-pass-2]] — the decision
- [[plans/architecture-pass-2]] — the staged implementation order
- [[concepts/determinism]] — invariants the tests defend
- [[entities/Random]] · [[entities/BiomeSystem]] · [[entities/CityGenerator]] · [[entities/SkySystem]] · [[entities/Layer]] · [[entities/Game]]
