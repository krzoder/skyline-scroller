---
type: map
title: Legacy Wiki Drift & Disposition
tags: [map, wiki, drift, legacy, cleanup]
updated: 2026-05-20
source: wiki/.scan/agent-11-wiki-drift.md
---

# Legacy wiki drift & disposition

Two legacy doc trees sit in the repo root, both produced by an older swarm:

- `skyline-scroller/skyline-scroller/` — **27 .md + 2 JSON dumps**, newer/fuller, the canonical legacy vault
- `docs/knowledge_base/` — **13 .md**, strict older subset (8 of the 13 are byte-identical to their `skyline-scroller/` siblings)

This map decides the fate of every legacy page. **Disposition counts: 0 KEEP / 4 UPDATE / 23 SUPERSEDED / 6 DELETE** + entire `docs/knowledge_base/` folder.

## Disposition table

Legacy paths relative to `skyline-scroller/skyline-scroller/` unless noted. `docs/knowledge_base/` mirrors inherit the disposition of their sibling.

| Legacy page | Status | Replacement |
|---|---|---|
| `agents.md` | **DELETE** (optional distil) | optional legacy-swarm-history (not written) |
| `Witaj.md` | **DELETE** | none — Obsidian default Polish stub |
| `Engine_Architecture.md` | SUPERSEDED | [[entities/Game]] + [[systems/game-loop]] |
| `Game_Loop_and_Time.md` | SUPERSEDED | [[entities/Game]] + [[systems/game-loop]] |
| `State_Management.md` | SUPERSEDED | [[entities/Game]] + main entrypoint |
| `Layering_System.md` | SUPERSEDED | [[entities/Layer]] + [[entities/Renderable]] + [[systems/parallax-layers]] |
| `UI_and_Configuration.md` | **UPDATE** then SUPERSEDED | [[systems/ui-shell]] (verify speed-slider range `−10x..+20x` against `main.ts`) |
| `Graphics Pipeline Overview.md` | SUPERSEDED | [[systems/entity-rendering]] |
| `Entity Caching System.md` | SUPERSEDED | [[entities/CityEntity]] + [[systems/entity-rendering]] |
| `Sky Gradients.md` | KEEP-AS-SOURCE → SUPERSEDED | [[entities/SkySystem]] + [[systems/sky]] (lift 17-keyframe table) |
| `Celestial Bodies.md` | KEEP-AS-SOURCE → SUPERSEDED | [[entities/SkySystem]] + [[systems/sky]] (lift sun-moon flip prose) |
| `Procedural Generation of Buildings.md` | **UPDATE** then SUPERSEDED | [[entities/Building]] (verify "50% cyan windows", "20% un-drawn" constants) |
| `Procedural Generation of Flora.md` | SUPERSEDED | [[entities/Tree]] |
| `Landscape Generation.md` | SUPERSEDED | [[entities/Landscape]] |
| `Procedural Generation Overview.md` | SUPERSEDED | [[systems/procgen]] |
| `Deterministic Randomness.md` | SUPERSEDED | Determinism + [[entities/Random]] |
| `City Generation.md` | SUPERSEDED | [[entities/CityGenerator]] |
| `Chunk System.md` | SUPERSEDED | [[concepts/chunking]] + [[entities/CityGenerator]] |
| `Biome System.md` | SUPERSEDED | [[entities/BiomeSystem]] |
| `Biome Mechanics.md` | SUPERSEDED (dup of Biome System) | [[entities/BiomeSystem]] |
| `Biome Transitions.md` | SUPERSEDED (dup of Biome System) | [[entities/BiomeSystem]] |
| `Building Configuration.md` | SUPERSEDED | [[entities/Building]] + [[entities/CityGenerator]] |
| `Tree Configurations.md` | SUPERSEDED | [[entities/Tree]] + [[entities/TreeConfig]] |
| `Terminal Overview.md` | SUPERSEDED | [[entities/Terminal]] + [[systems/terminal]] |
| `Terminal Grammar State Machine.md` | **UPDATE** then SUPERSEDED | [[systems/terminal]] (add `generate` grammar, `biome` read-only, cactus-only `flowerChance`) |
| `Terminal Autocomplete Engine.md` | SUPERSEDED | [[systems/terminal]] |
| `CSS Architecture.md` | SUPERSEDED | [[systems/css-architecture]] |
| `UI Architecture Overview.md` | SUPERSEDED | [[systems/ui-shell]] |
| `Build and Deploy Pipeline.md` | **UPDATE** then SUPERSEDED | operations/build-and-deploy (not written) (add `pr-preview.yml`, vitest suite) |
| `md_contents.json` | **DELETE** | none — indexing scrap (~52 KB) |
| `ts_contents.json` | **DELETE** | none — indexing scrap (~173 KB) |
| `.obsidian/` (both folders) | **DELETE** | none — per-vault config; audit for embedded REST API keys first |
| `docs/knowledge_base/*.md` | **DELETE** | dispositions inherited from sibling files; older mirrors |

## Counts

- **KEEP: 0** — no legacy page is still authoritative as-is; all were scaffolding for replacement.
- **UPDATE: 4** — `UI_and_Configuration.md`, `Procedural Generation of Buildings.md`, `Terminal Grammar State Machine.md`, `Build and Deploy Pipeline.md`. Fix specific drift before the supersession write.
- **SUPERSEDED: 23** — all remaining .md content pages. Material to be lifted into new structure.
- **DELETE: 6** — `agents.md`, `Witaj.md`, `md_contents.json`, `ts_contents.json`, both `.obsidian/` config dirs.
- **Plus**: the entire `docs/knowledge_base/` folder (recursive delete — every file is an older mirror of `skyline-scroller/skyline-scroller/`).

`Sky Gradients.md` + `Celestial Bodies.md` are marked KEEP-AS-SOURCE → SUPERSEDED because their prose is uniquely worth lifting; they collapse into SUPERSEDED in the count.

## Recommendation: delete both legacy folders wholesale

After the 23 supersession lifts + 4 UPDATE verifications are complete in the new `wiki/`:

1. Populate `wiki/entities/`, `wiki/systems/`, `wiki/concepts/`, `wiki/operations/` with canonical pages.
2. **Lift the 11 invariants** (see below) and the celestial-flip prose into those pages directly.
3. Verify the 4 UPDATE candidates against current `src/` line-by-line.
4. Audit both `.obsidian/` folders for any embedded API keys / credentials before removal.
5. `rm -rf docs/knowledge_base/` — older subset, fully covered by sibling vault.
6. `rm -rf skyline-scroller/skyline-scroller/` — empties the misnamed nested folder.
7. Append one line to [[log]] recording the supersession.

The legacy folders pollute the repo tree, contain stale facts in 4 files, and have a known case (`agents.md`) of meta-misinformation about themselves. There is no archival value once the SUPERSEDED content is lifted.

## 11 invariants to lift before deletion

These are byte-exact matches against current code — the legacy wiki got these right:

1. `BiomeType = 'forest' | 'desert' | 'tundra' | 'plains' | 'city'` (`BiomeSystem.ts:3`)
2. `TreeType = 'sequoia' | 'pine' | 'oak' | 'bush' | 'hedge' | 'cactus'` (`Tree.ts:3`)
3. Biome adjacency graph in `Biome Transitions.md` = `BiomeSystem.ts:11-17`
4. Biome duration 3000–8000 px (`BiomeSystem.ts:24, :39`)
5. City DNA ranges (density 0.4–0.9, greenery 0.1–0.8, building height 0.8–1.2) — `CityGenerator.ts:37-39`
6. PRNG = Mulberry32 + cyrb128 (`Random.ts`)
7. `scaleFactor = 1.6` (`Game.ts:25`)
8. Delta-time cap `0.1` s (`Game.ts:154`)
9. Layer count = 4, speed modifiers `0.2, 0.4, 0.6, 1.0`, z-indexes `0..3` (`Game.ts:110-115`)
10. Terminal command set: `help, seed, speed, pause, volume, mute, format, fullscreen, clear, reset, biome, generate` (12 commands, `Terminal.registerBuiltIns()`)
11. Tree-biome eligibility (cactus→desert only, pine→forest+tundra, sequoia→forest, oak→forest+plains, bush→forest+plains, hedge→plains+city) — `DEFAULT_TREE_CONFIG`

Cross-link these into [[entities/BiomeSystem]], [[entities/Tree]], [[entities/Random]], [[entities/Game]], [[entities/Layer]], [[entities/Terminal]], [[entities/TreeConfig]], [[entities/CityGenerator]].

## Gaps — present in code, absent in legacy wiki

These are the *real* gaps the new wiki must close:

1. **`Game.timeFormat`** triplet `'score' | '24h' | '12h'` and DOM update of `#ui-time-val`. Score = raw `cameraX` as integer. [[entities/Game]], Time Formats.
2. **`Game.isPreview` multi-instance pattern**: preview instance skips `SkySystem` entirely (`Game.ts:121`). [[entities/Game]], Config Mirroring.
3. **`Terminal.pendingResetTarget` flow** + actual `reset` subcommand list (`all, speed, volume, format, seed, generate`). [[entities/Terminal]], Reset Confirmation Pattern.
4. **`generate` command grammar** with `key:value` pairs, biome-aware `flowerChance` (cactus only), `biome` read-only. Per commit `9a7c5df`. [[systems/terminal]].
5. **`TreeConfigItem.enabled` + `biomes` filter** in `CityGenerator.pickTreeType()` (returns `null` → chunk treated as gap). [[entities/CityGenerator]], [[entities/TreeConfig]].
6. **`Ground` types** (`pavement | grass | water | dirt`) — `Ground.ts` never documented as own entity. [[entities/Ground]].
7. **`TextureGenerator`** (46 LOC) — mentioned in passing in `Building Configuration.md`, no page of its own. [[entities/TextureGenerator]].
8. **PR-preview workflow** (commit `f156f7c`) — third workflow file added; legacy doc only knows two. operations/build-and-deploy (not written).
9. **Vitest test suite** (also `f156f7c`) — not described in `Build and Deploy Pipeline.md`. operations/build-and-deploy (not written).

## Drift specifics — 4 UPDATE candidates

| File | Drift | Verify |
|---|---|---|
| `UI_and_Configuration.md` | Speed slider range "−10x to +20x" | `main.ts` slider logic — adv-speed-slider is `-10000..10000`, casual slider is log10 |
| `Procedural Generation of Buildings.md` | "50% chance cyan windows", "20% chance un-drawn" | `Building.ts:73-79` |
| `Terminal Grammar State Machine.md` | Missing `generate` grammar + `biome` read-only + cactus-only `flowerChance` | `Terminal.ts:413-528` and commit `9a7c5df` |
| `Build and Deploy Pipeline.md` | Missing `pr-preview.yml` + vitest | `.github/workflows/` and `vitest.config.ts` |

## Drift summary at the naming layer

**Zero drift at class/type names.** Every entity referenced in the legacy wiki still resolves to the same name in current `src/`:

- `Game`, `CityGenerator`, `BiomeSystem`, `SkySystem`, `Terminal`, `Layer`, `Renderable`, `CityEntity`, `Building`, `Tree`, `Ground`, `Landscape`, `TextureGenerator`, `Random`, `TreeConfig`, `DEFAULT_TREE_CONFIG`
- `BiomeType` and `TreeType` enums byte-exact

Drift is in **coverage** (gaps above), **specifics** (4 UPDATE candidates), and **structure** (flat-by-topic → hierarchical-by-kind). The architectural spine is stable.

## Cross-links

- [[maps/dependencies]] — current module graph (post-supersession reference)
- [[maps/complexity]] — current LOC + CC (post-supersession reference)
- [[entities/Game]], [[entities/CityGenerator]], [[entities/Terminal]], [[entities/SkySystem]], [[entities/BiomeSystem]], [[entities/Tree]], [[entities/TreeConfig]], [[entities/Random]], [[entities/Building]], [[entities/Landscape]], [[entities/Layer]], [[entities/Renderable]], [[entities/CityEntity]], [[entities/Ground]], [[entities/TextureGenerator]] — absorption targets
- [[systems/game-loop]], [[systems/sky]], [[systems/procgen]], [[systems/parallax-layers]], [[systems/entity-rendering]], [[systems/terminal]], [[systems/ui-shell]], [[systems/css-architecture]] — system-level absorption targets
- Determinism, [[concepts/chunking]], Time Formats, Reset Confirmation Pattern, Config Mirroring — concept-level absorption targets
- operations/build-and-deploy (not written) — needs UPDATE for PR-preview + vitest
- legacy-swarm-history (not written) (optional) — one-paragraph distil of `agents.md` if anyone cares
- [[log]] — append supersession line on cleanup
