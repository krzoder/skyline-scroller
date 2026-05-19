# Agent 07 — procgen (CityGenerator, BiomeSystem, TreeConfig)

## Files scanned

- `/src/procgen/CityGenerator.ts` (233 LOC)
- `/src/procgen/BiomeSystem.ts` (51 LOC)
- `/src/procgen/TreeConfig.ts` (68 LOC)

Touched for context (not deeply scanned, but cross-referenced):
- `/src/utils/Random.ts` (49 LOC) — Mulberry32 PRNG used by both `CityGenerator` and `BiomeSystem`
- `/src/engine/Game.ts` lines ~110-180 — instantiation and per-frame `generate()` call
- `/src/main.ts` lines ~700-1560 — custom-gen UI that mutates `previewGame.generator.config`
- `/src/engine/Tree.ts` line 3 — `TreeType` union

## Public surface (exports/classes/functions/types)

### `CityGenerator.ts`
- `class CityGenerator`
  - `constructor(seed: number | string, layerCount: number, config?: TreeConfig)`
  - `public config: TreeConfig` — live, mutable instance config (this is the field the custom-gen UI in `main.ts` reaches in and rewrites — see [[Surprises]] below)
  - `public generate(layers: Layer[], cameraX: number, viewportWidth: number): void`
  - `public forceBiome(b: BiomeType): void`
  - `public getCurrentBiome(): BiomeType`
  - private: `addChunk`, `pickTreeType`, `pickMaterial`, `pickRoof`, `pickColor`
- internal `interface CityDNA { density; greenery; buildingHeight }` — **not exported**; recoverable only via `console.log("City DNA:", ...)` side-channel

### `BiomeSystem.ts`
- `type BiomeType = 'forest' | 'desert' | 'tundra' | 'plains' | 'city'`
- `class BiomeSystem`
  - `constructor(seed)`
  - `public update(dx: number): BiomeType`
  - `public getCurrentBiome(): BiomeType`
  - `public forceBiome(b: BiomeType): void`
  - private `switchBiome()`, `transitions` adjacency graph

### `TreeConfig.ts`
- `interface TreeConfigItem { enabled, biomes, minHeight, maxHeight, flowerChance }`
- `type TreeConfig = Record<TreeType, TreeConfigItem>`
- `const DEFAULT_TREE_CONFIG: TreeConfig` — frozen-by-convention defaults for 6 tree species
- `let currentTreeConfig: TreeConfig` — **module-level mutable singleton** (an orphan, see [[Surprises]])
- `function resetTreeConfigToDefault(type?: TreeType)` — also operates on the orphan singleton

## Internal state

### `CityGenerator`
- `rng: Random` — single Mulberry32 stream forked from constructor seed
- `lastX: number[]` — per-layer write cursor (length = `layerCount`, initialized to 0)
- `biomeSystem: BiomeSystem` — given the **same** seed as the generator (parallel streams from identical state, see [[Determinism]])
- `dna: CityDNA` — drawn once at construction:
  - `density ∈ [0.4, 0.9)` — building probability per non-water foreground chunk
  - `greenery ∈ [0.1, 0.8)` — tree probability when building roll fails
  - `buildingHeight ∈ [0.8, 1.2)` — global multiplier on building height
- `config: TreeConfig` — deep-cloned from arg or `DEFAULT_TREE_CONFIG` via `JSON.parse(JSON.stringify(...))`

### `BiomeSystem`
- `rng: Random` — independent stream from same seed
- `currentBiome: BiomeType` — picked uniformly from all 5 at construction
- `durationRemaining: number` — pixels-of-camera-travel until next switch; range `[3000, 8000)`
- `transitions: Record<BiomeType, BiomeType[]>` — hardcoded climate-adjacency graph (see below)

### `TreeConfig`
- `currentTreeConfig` — a module-level singleton initialized as a deep copy of `DEFAULT_TREE_CONFIG`. **Nothing in the codebase reads this variable** — the `CityGenerator` carries its own `config`, and `main.ts` mutates `previewGame.generator.config` directly. This is dead state. See [[Surprises]].

## Control flow

### End-to-end pipeline (per frame)

1. `Game.update(dt)` advances `cameraX += cameraSpeed * dt`.
2. `Game.update` calls `generator.generate(layers, cameraX, logicalW)`.
3. `CityGenerator.generate`:
   - Ticks `biomeSystem.update(1)` — **always `dx = 1`**, regardless of real camera advance (see [[Surprises]]: biome duration is wall-time-ish, not pixel-accurate).
   - For each of 4 layers, computes `limitX = cameraX * layer.speedModifier + viewportWidth + 500` (500 px lookahead).
   - While `lastX[i] < limitX`, calls `addChunk(layer, i, currentBiome)`.
4. `addChunk` is the heart of the system. A **chunk** = a horizontal slice on one layer, comprising:
   - One `Ground` object (always).
   - Zero or one feature: `Building` | `Tree` | `Landscape` | nothing.

### `addChunk` decision tree

**Step 1 — Ground type:**
- Foreground (`layerIndex === 3`): rolls `r`; `r < 0.6` → `pavement`, `r < 0.8` → `grass`, else → `water`.
- Backgrounds (0, 1, 2): mapped by biome:
  - `desert → dirt`, `forest → grass`, `city → pavement`, anything else → `dirt`.
  - Note: `plains` and `tundra` both collapse to `dirt` on backgrounds — slightly surprising for `plains`.

**Step 2 — Feature selection:**
- Layers 0 and 1 (`layerIndex <= 1`): always `landscape` (silhouette hills).
- Layers 2 and 3: skip if ground is water; otherwise:
  - `building` if `rng.nextFloat() < dna.density`.
  - Else `tree` if `rng.nextFloat() < dna.greenery` (note: **two RNG draws**, not one — independence per roll).
  - Else nothing.

**Step 3 — Object construction:**
- `landscape`: width `[200, 500)`, height `[100, 300)`, biome-tinted via `Landscape`.
- `building`: width `[60, 120 + 20·layerIndex)` (foreground buildings can be wider), height `[100, 300) · dna.buildingHeight`, material/roof/color picked by biome.
- `tree`: pick a valid `TreeType` via `pickTreeType`; if none for current biome, treat as gap. Height drawn from per-species `[minHeight, maxHeight)`, `flowerChance` passed verbatim. Width = `obj.width + nextInt(10, 30)` "breathing room".
- empty: width `[20, 100)`.

**Step 4 — Water override:** if ground is water, `featureWidth = max(width, 100)` (min river width) and `obj = null` (drop any feature already generated — note the RNG draws still happened, so this **does not** desync determinism).

**Step 5 — Commit:** `Ground` added, feature added if non-null, `lastX[i] += chunkWidth - 1` (1-pixel overlap to hide seams).

### `pickTreeType(biome)`

Iterates `Object.keys(this.config)` (insertion order = declaration order in `DEFAULT_TREE_CONFIG`), keeps trees where `enabled && biomes.includes(biome)`, then picks uniformly from the survivors. **Uniform** — there is no weight column despite the `// Weighting?` comment.

### Material / Roof / Color picking

- `pickMaterial`: biome-conditioned binary roll (desert→stone/plaster, forest→wood/stone, city→brick/stone with 70% brick, fallback→brick).
- `pickRoof`: desert→flat/dome, tundra→`gabled` (deterministic, "shed snow"), forest→`gabled` (deterministic), else 50/50 flat or crenelated.
- `pickColor`: HSL synthesis; biome biases the hue (desert 30-60°, tundra 180-240°, forest 90-150°). Roof = base with L−20.

### `BiomeSystem.update`

- `durationRemaining -= dx` — but `dx` is always `1` from the caller, so this is "1 unit per call", not "1 pixel per call". Switches when `≤ 0`, picking uniformly from `transitions[currentBiome]`.

### Biome transition graph

```
tundra  ⇄ forest, plains
forest  ⇄ tundra, plains
plains  ⇄ forest, desert, city
city    ⇄ plains, desert
desert  ⇄ plains, city
```

`plains` is the only 3-degree hub; `tundra` and `forest` form a cold cluster, `city` and `desert` form a hot cluster. No direct tundra↔city or tundra↔desert edge — you must transit through forest/plains. This is a hand-authored **climate gradient**, not a fully connected graph.

## Dependencies (imports / imported-by)

### Imports
- `CityGenerator` imports: `Building`, `Layer`, `Random`, `Tree`, `BiomeSystem`, `Ground`, `Landscape`, `DEFAULT_TREE_CONFIG`/`TreeConfig`.
- `BiomeSystem` imports: `Random`.
- `TreeConfig` imports: `TreeType` (type), `BiomeType` (type).

### Imported by
- `CityGenerator` ← `Game.ts` (constructed in `reset()`, called in `update()`).
- `BiomeType` ← `main.ts` (custom-gen UI), `Building.ts` (likely tinting), `Ground.ts`, `Landscape.ts`, `SkySystem.ts` (sky tint — see [[Surprises]]).
- `TreeConfig` / `DEFAULT_TREE_CONFIG` ← `main.ts` (custom-gen UI), `Game.ts` (default holder), `CityGenerator.ts`.

## Complexity & hotspots

1. **`addChunk` is a single 110-line procedure** doing ground choice, feature choice, object construction, water override, and commit. The biggest cyclomatic-complexity unit in the file. Should be split into `pickGround` / `pickFeature` / `buildFeature` for testability — currently it's only exercised end-to-end.
2. **RNG draws are positional and entangled**: ground type, feature type, dimensions, material, roof, color — all from the same stream in a strict order. Reordering or skipping any branch reshuffles every chunk afterwards. The `if (groundType === 'water') obj = null` rescue happens **after** material/roof/color/height rolls were already consumed, so it's the cheap form of determinism preservation, but it makes the per-frame RNG cost non-trivial.
3. **No spatial caching / no chunk reuse.** `lastX[i]` is monotonic — there is no rewind, no negative-x generation, no backtracking when biome flips mid-chunk. The world is one-way scrollable.
4. **Pruning lives in `Layer.prune`**, not here — `CityGenerator` is fire-and-forget.
5. `pickTreeType` is `O(trees × biomes)` per tree-chunk. With 6 species and 5 biomes that's trivial, but the filter is recomputed every chunk — a `biome → TreeType[]` cache would be free perf.

## Dualisms & duality patterns observed

This file is *dense* with dualisms — fits the brief's billing as "the most algorithmically interesting part of the codebase."

| Axis | A | B |
|---|---|---|
| **Origin of decisions** | biome-driven (material/roof/color/ground/tree species) | DNA-driven (density/greenery/buildingHeight) |
| **Source of config** | `DEFAULT_TREE_CONFIG` (constant) | user-edited via `main.ts` custom-gen window |
| **Layer role** | backgrounds 0,1 = landscape silhouettes | foregrounds 2,3 = buildings + trees |
| **World axis** | foreground 3 = stochastic ground (pavement/grass/water roll) | backgrounds = biome-deterministic ground |
| **Feature type** | urban (`Building`, `pavement`, `city` biome) | natural (`Tree`, `grass`, `forest`/`plains`/`tundra`/`desert`) |
| **Density poles** | `dna.density ∈ [0.4, 0.9)` = building-likelihood | `dna.greenery ∈ [0.1, 0.8)` = tree-likelihood (only if building roll fails) |
| **Decoration determinism** | tree *position* is RNG-deterministic | tree *flower* is a per-render stochastic roll (passed as `flowerChance`, evaluated inside `Tree`) — *deterministic position, stochastic decoration* |
| **Width policy** | features have RNG widths | water has a `Math.max(_, 100)` floor — *constraint vs sample* |
| **Biome lifecycle** | `update()` drifts via adjacency graph | `forceBiome()` jumps anywhere (used by UI) |
| **Seed propagation** | `Random` is single-stream inside each owner | `CityGenerator` and `BiomeSystem` are **two parallel streams from the same seed** — not seed-forked, just seed-shared |
| **Config object** | `DEFAULT_TREE_CONFIG` (frozen by convention) | `currentTreeConfig` (mutable singleton, unused) vs `generator.config` (mutable per-instance, used) — *three copies of the same thing* |
| **Tree species spread** | `bush`/`hedge` are generalists (multi-biome) | `sequoia`/`cactus` are specialists (single-biome) |
| **Roof randomness** | desert/general = stochastic | tundra/forest = deterministic `gabled` (justified by physics comment "shed snow") |

The cleanest dualism is **biome (what the place is) vs DNA (how dense the place is)**: biome controls the palette, DNA controls the saturation.

## Invariants

- `lastX[i]` is monotonically non-decreasing for every layer.
- Each chunk emits exactly one `Ground`; zero or one feature.
- A water chunk never carries a feature.
- A landscape chunk only appears on layers 0 or 1.
- A building or tree only appears on layers 2 or 3.
- `featureWidth ≥ 100` on water; `featureWidth ≥ 20` on land gaps; tree chunks always include 10-30 px of breathing room beyond the tree's own width.
- Deep-cloning of config on construction means mutating `DEFAULT_TREE_CONFIG` after a `CityGenerator` exists has no effect on it — config is captured by value, not reference.
- Chunks overlap by 1 px (`lastX[i] += chunkWidth - 1`) — hides ground tile seams; means absolute world-x of chunk N is **not** a pure sum of widths.
- Given the same seed and same config, the output should be byte-identical *if* the calling pattern is identical (see [[Determinism]] below).

## Surprises / risks / TODOs

### Surprises

1. **Three copies of the tree config in flight**:
   - `DEFAULT_TREE_CONFIG` (read-only constant)
   - `currentTreeConfig` in `TreeConfig.ts` (module-level mutable, **not read anywhere** — dead state plus a `resetTreeConfigToDefault()` helper that operates on it)
   - `generator.config` (the one actually used)
   `main.ts` reaches into `previewGame.generator.config` directly and clones it back to `game.treeConfig`. The `currentTreeConfig` singleton is an evolutionary remnant.

2. **`BiomeSystem.update(1)` is called with a hard-coded `1`**, despite the parameter being named `dx` and the duration being measured in "pixels (3000-8000)". So a biome lasts 3000-8000 *frames*, not pixels — at 60 fps that's ~50-130 s per biome. The naming and intent disagree.

3. **`CityGenerator` and `BiomeSystem` share the same seed but not the same stream.** Each does `new Random(seed)`. Mulberry32 is a single-state generator, so they produce **identical** sequences from identical starting states — they just consume them independently. The shared seed doesn't desync them, but it means `BiomeSystem`'s biome choice consumes from "the same" initial sequence the city would. Two `Random(seed)` instances are not "forked" — they're "cloned." Cheap and works, but conceptually it's not the usual sub-stream pattern.

4. **`pickTreeType` uses `Object.keys(this.config)` to enumerate species** — relies on JS object key-insertion order being stable. It is, by spec, for string keys, so this is safe but worth flagging.

5. **`flowerChance` is generic in the type but special-cased in defaults**: the `TreeConfigItem` interface offers it for every species, but only `cactus` has a non-zero default (`0.05`). Comment confirms: `"Only used for Cactus currently, but good to have generic"`. **Verified:** brief's claim that flowerChance is cactus-only by default is correct; the schema allows it for any species and the custom-gen UI exposes it (`main.ts:1058`).

6. **`sand` doesn't exist** as a `GroundType`. Desert biome maps to `dirt`. Comment in `addChunk` ("maybe 'dirt' acts as shore?", "let's stick to simple types for PoC") confirms this is intentional placeholder behavior.

7. **The foreground (layer 3) ignores biome for ground type** — its pavement/grass/water mix is pure RNG, biome-blind. So a forest biome can have a pavement strip in the foreground. This is the *one* place where the urban-vs-natural dualism breaks down.

8. **`Landscape` receives `biome` directly** (the only object that does, alongside the three pickers). Sky tint lives elsewhere (`SkySystem.ts`) — the brief asks whether biome controls sky tint; it does, but **not via this file**. Search shows `BiomeType` is imported by `SkySystem.ts`.

### Risks

1. **Determinism breakage vectors**:
   - Adding any RNG call inside `addChunk` reshuffles all chunks after it for all existing seeds.
   - The water-override drops `obj` *after* RNG was consumed — safe today, but a "skip rolls if water" optimization would silently change seeds.
   - `pickTreeType` uses `Object.keys`; if anyone reorders fields in `DEFAULT_TREE_CONFIG` (or adds a species mid-list), the uniform pick re-aligns, and every existing seed will produce different trees.
   - `console.log` calls in `BiomeSystem` constructor and `switchBiome` are cosmetic but they leak the internal state — useful for debugging, mild noise in production.

2. **User-config flow is a footgun**: `main.ts` mutates `previewGame.generator.config` in place, then later serializes it back to `game.treeConfig`. If `previewGame` and the real `game` ever shared a `config` reference (they don't, thanks to `JSON.parse(JSON.stringify(...))` at every transfer point), edits would race. The defensive deep-clones are the only thing keeping this safe.

3. **`forceBiome` doesn't reseed**: forcing to a new biome immediately changes new chunks' palettes but RNG state continues, so seeds drift relative to a "natural transition" run. Replays via `forceBiome` are deterministic *given the same sequence of forces*, not relative to a no-forces run.

4. **Layer 3's water can be arbitrarily long** (`Math.max(featureWidth, 100)`) but `featureWidth` was rolled before the water check — so water-chunk widths are biased toward whatever the prior feature would have rolled. Not a bug, but worth knowing.

### TODOs

Inline comments name several:
- "Logic to transition? If previous was Water and now Not Water → Shore?" — desired but unimplemented shore logic.
- "We need state per layer." — confirmation that ground-continuity tracking is missing.
- "Weighting? For now uniform random from available" — `pickTreeType` would benefit from per-species weights.
- "Or just global camera movement." — uncertainty about whether biome should be driven by background layer or global camera. Currently neither — it's frame-counted.

## Suggested wiki pages

- [[entities/CityGenerator]] — the procedural pipeline; cross-link to [[entities/Game]] (host), [[entities/Layer]] (output target), [[concepts/Chunk]]
- [[entities/BiomeSystem]] — biome state machine; embed the transition graph as a diagram
- [[entities/TreeConfig]] — schema + the three-copies-in-flight issue
- [[concepts/Chunk]] — definition of a chunk (ground + feature, layer-keyed)
- [[concepts/CityDNA]] — the three-axis genome (density / greenery / buildingHeight) and why it's not exported
- [[concepts/Procgen Pipeline]] — seed → biome → ground → feature → object diagram
- [[concepts/Biome Transition Graph]] — the climate-adjacency hand-authored graph
- [[concepts/Determinism]] — Mulberry32, shared-seed-not-forked pattern, RNG-draw ordering as an invariant
- [[concepts/Custom Generator UI]] — how `main.ts` reaches into `generator.config` and the deep-clone discipline that keeps it safe
- [[decisions/Dirt as Shore Placeholder]] — record the PoC compromise
- [[decisions/Frame-counted Biome Duration]] — record the `update(1)` decision

## Cross-references

- [[entities/Random]] — Mulberry32, cyrb128 string hash
- [[entities/Game]] — owns the `CityGenerator` instance and drives `generate()` per frame
- [[entities/Layer]] — receives `add(ground)` and `add(feature)`, owns `prune`
- [[entities/Building]], [[entities/Tree]], [[entities/Ground]], [[entities/Landscape]] — the four output object kinds
- [[entities/SkySystem]] — also consumes `BiomeType` (sky tint lives there, not here)
