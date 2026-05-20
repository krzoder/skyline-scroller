---
name: TreeConfig
description: Schema + defaults for the six tree species, exposed to the low-code custom-gen UI.
type: entity
source: src/procgen/TreeConfig.ts
loc: 68
---

# TreeConfig

## Role

Declares the data shape that `CityGenerator` consults when picking tree species (`pickTreeType`) and dimensioning a tree (`minHeight`, `maxHeight`, `flowerChance`). The low-code custom-gen UI in main.ts mutates the per-instance copy on `generator.config` directly. See [[decisions/DEC-05-low-code-config]].

## Public surface

- `interface TreeConfigItem { enabled: boolean; biomes: BiomeType[]; minHeight: number; maxHeight: number; flowerChance: number }`
- `type TreeConfig = Record<TreeType, TreeConfigItem>`
- `const DEFAULT_TREE_CONFIG: TreeConfig` — frozen-by-convention defaults for `sequoia`, `pine`, `oak`, `bush`, `hedge`, `cactus`.
- `let currentTreeConfig: TreeConfig` — module-level mutable singleton (orphan; see defects).
- `function resetTreeConfigToDefault(type?: TreeType)` — operates on the orphan singleton.

## Internal state

- `DEFAULT_TREE_CONFIG` — read-only constant (mutating it after a `CityGenerator` exists has no effect because the generator deep-clones on construction).
- `currentTreeConfig` — initialised as a deep copy of `DEFAULT_TREE_CONFIG`; updated only by `resetTreeConfigToDefault`.
- `flowerChance` is non-zero only for `cactus` (`0.05`); the schema allows any species (`"Only used for Cactus currently, but good to have generic"`).

## Confirmed defects

- **Three copies of the config in flight**:
  1. `DEFAULT_TREE_CONFIG` (read-only constant).
  2. `currentTreeConfig` (module-level mutable, **read by nothing in the codebase** — dead state).
  3. `generator.config` (per-instance, the one actually used).
- `resetTreeConfigToDefault` operates on the orphan `currentTreeConfig`, so calling it has no observable effect on world generation.
- The custom-gen UI exposes `flowerChance` for every species, but only `cactus` rendering acts on it (see [[entities/Tree]]).

## Dependencies

- Imports: `TreeType` (type from [[entities/Tree]]), `BiomeType` (type from [[entities/BiomeSystem]]).
- Imported by: [[entities/CityGenerator]] (deep-clones into `config`), [[entities/Game]] (default holder), main.ts (custom-gen UI mutates `previewGame.generator.config` then serializes back to `game.treeConfig` via `JSON.parse(JSON.stringify(...))`).

## Invariants

- `Object.keys(DEFAULT_TREE_CONFIG)` insertion order = species enumeration order in `pickTreeType` — reordering changes every existing seed's output.
- Every entry must have all five fields; `biomes` must be a non-empty subset of `BiomeType`.
- `minHeight ≤ maxHeight`; `flowerChance ∈ [0, 1]`.
- Generator captures config by deep value at construction — runtime mutation of `DEFAULT_TREE_CONFIG` post-construction is a no-op.

## See also

- [[decisions/DEC-05-low-code-config]] — how the UI mutates per-instance config.
- [[decisions/DEC-01-unified-rng]] — deep-clone discipline preserves determinism across config edits.
- [[systems/procgen]] — tree-pick step in the chunk pipeline.
- [[entities/CityGenerator]], [[entities/Tree]], [[entities/BiomeSystem]].
