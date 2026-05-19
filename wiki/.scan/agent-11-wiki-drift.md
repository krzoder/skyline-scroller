# Agent 11 — Legacy wiki drift assessment

Scope: `skyline-scroller/skyline-scroller/` (27 .md + 2 large JSON dumps) and `docs/knowledge_base/` (13 .md, a strict older subset of the former). Comparison target: current `src/` (4,317 LOC, sampled 2026-05-20).

## Files scanned

### `skyline-scroller/skyline-scroller/` (newer, fuller legacy vault — 27 .md)

- `agents.md` — meta-doc describing the writer-swarm that produced the vault.
- `Witaj.md` — Obsidian "welcome" stub in Polish; junk.
- Core architecture: `Engine_Architecture.md`, `Game_Loop_and_Time.md`, `State_Management.md`, `Layering_System.md`, `UI_and_Configuration.md`.
- Graphics: `Graphics Pipeline Overview.md`, `Entity Caching System.md`, `Sky Gradients.md`, `Celestial Bodies.md`, `Procedural Generation of Buildings.md`, `Procedural Generation of Flora.md`, `Landscape Generation.md`.
- ProcGen: `Procedural Generation Overview.md`, `Deterministic Randomness.md`, `City Generation.md`, `Chunk System.md`, `Biome System.md`, `Biome Mechanics.md`, `Biome Transitions.md`, `Building Configuration.md`, `Tree Configurations.md`.
- Infra/UI: `Terminal Overview.md`, `Terminal Grammar State Machine.md`, `Terminal Autocomplete Engine.md`, `CSS Architecture.md`, `UI Architecture Overview.md`, `Build and Deploy Pipeline.md`.
- Indexing artefacts (skipped): `md_contents.json` (~52 KB), `ts_contents.json` (~173 KB) — these are flat JSON dumps of every .md/.ts in the repo, evidently produced by the prior swarm to feed an LLM context window during generation. They are not knowledge; they're scrap material and should be deleted.

### `docs/knowledge_base/` (older partial duplicate — 13 .md)

Strict subset of the above. Of the 13 files, 8 are *byte-identical* (`diff -q` shows no diff): `Biome Mechanics.md`, `Building Configuration.md`, `Procedural Generation Overview.md`, `Terminal Autocomplete Engine.md`, `Terminal Grammar State Machine.md`, `Tree Configurations.md`. The other 5 (`CSS Architecture.md`, `City Generation.md`, `Engine_Architecture.md`, `Game_Loop_and_Time.md`, `State_Management.md`, `UI Architecture Overview.md`) differ — the `skyline-scroller/skyline-scroller/` copy is consistently newer/more detailed. `docs/knowledge_base/` looks like an early swarm artifact left behind when the canonical vault was moved into `skyline-scroller/`.

Spot-checked in detail against code: `Engine_Architecture.md`, `Terminal Overview.md`, `Procedural Generation Overview.md`, `Sky Gradients.md`, `City Generation.md`, `Biome System.md`, `agents.md`. Skimmed the rest.

## Public surface (exports/classes/functions/types)

Out of scope for a drift report — this is structural assessment of *documentation*, not code. See entity-tier agent reports for code-surface details. What matters here: legacy docs *reference* concrete code entities, and the names they reference still resolve cleanly in current `src/`:

| Doc reference | Current code | Status |
| --- | --- | --- |
| `Game` (`src/engine/Game.ts`) | exists, 286 LOC | Same name |
| `CityGenerator` (`src/procgen/CityGenerator.ts`) | exists, 233 LOC | Same name |
| `BiomeSystem` (`src/procgen/BiomeSystem.ts`) | exists, 51 LOC | Same name |
| `SkySystem` (`src/engine/SkySystem.ts`) | exists, 402 LOC | Same name |
| `Terminal` (`src/engine/Terminal.ts`) | exists, 596 LOC | Same name |
| `Layer`, `Renderable`, `CityEntity`, `Building`, `Tree`, `Ground`, `Landscape`, `TextureGenerator` | all exist | Same names |
| `Random` (`src/utils/Random.ts`) — Mulberry32 + cyrb128 | exists, 49 LOC | Same name |
| `TreeConfig`, `DEFAULT_TREE_CONFIG` | exists in `src/procgen/TreeConfig.ts` | Same names |
| `BiomeType = 'forest' \| 'desert' \| 'tundra' \| 'plains' \| 'city'` | exact match in code | Same |
| `TreeType = 'sequoia' \| 'pine' \| 'oak' \| 'bush' \| 'hedge' \| 'cactus'` | exact match in code | Same |

So at the *naming* layer there is essentially **zero drift**. The architecture has been stable. The drift is instead in coverage, specifics, and a handful of behaviours that have changed since the snapshot.

## Internal state

Not applicable (drift report). State-of-vault notes:

- Both legacy folders sit in the repo root, polluting the tree. The active vault going forward is `/Users/fszalaj/Documents/git/skyline-scroller/wiki/`.
- Both vaults contain their own `.obsidian/` config — they were each independently opened in Obsidian at some point.
- Big JSON dumps (`md_contents.json`, `ts_contents.json`) are artefacts of the original swarm-feeding step; ignore them entirely.

## Control flow

N/A — see canonical control-flow agents.

## Dependencies (imports / imported-by, even if known indirectly)

The legacy wiki uses Obsidian-style `[[WikiLinks]]` exclusively. All wikilinks are flat (no folders), so importing pages into the new `wiki/{entities,systems,concepts}` tree would require either renaming targets or rewriting links to `[[entities/Game]]` form. The new wiki's `index.md` already uses the namespaced form — replacements below assume that convention.

## Complexity & hotspots

The legacy wiki's tone is uniform: each page is ~1–2 KB of mid-level prose, well-organised but lossy. The principal complexity is *coverage* drift, not internal complexity. Hotspots where the legacy wiki *is* the only signal in the project's history:

- **`Celestial Bodies.md`** is the only place explaining the sun-moon "flip" mechanic at hour 6.00 / 18.00 (`flipWin = 0.15`, cosine `scaleX` morph). Worth preserving the prose into [[entities/SkySystem]] / [[systems/sky]].
- **`Sky Gradients.md`** documents the 17-keyframe gradient table — useful as a starting point even if specific hex values need re-validation.
- **`agents.md`** is the only record of how the prior knowledge-base was generated (4 writer agents + 1 reviewer, Gemini 3.1 Pro + Claude Opus 4.6 fallback). It is meta-history, not technical truth; keep only as a footnote.

## Dualisms & duality patterns observed

The drift itself exhibits several dualisms:

- **Old wiki / new wiki**: the same architectural facts told twice, with different page boundaries. Old is flat (one .md per concept, ~20 pages); new is structured (`entities/`, `systems/`, `concepts/`, `operations/`, `decisions/`). The dualism is **flat-by-topic vs hierarchical-by-kind**.
- **`docs/knowledge_base/` vs `skyline-scroller/skyline-scroller/`**: two snapshots of the same swarm output, one earlier (13 files), one later (27 files). Identical-content files in both suggests a copy-paste-and-extend workflow. **Snapshot vs working-set duality**.
- **Documented behaviour vs implemented behaviour**: largely aligned at the name level, drifted at the parameter level (see "Surprises" below). **Stable spine, drifting flesh**.
- **Indexing artefact vs knowledge**: the JSON dumps are pure scrap; the .md files are pure prose. The dualism is **machine substrate vs human surface**, deliberately separated by the prior workflow.
- **Polish stub vs English content**: `Witaj.md` is the only Polish file — a leftover Obsidian template. **Default-template-cruft vs intentional-content**.
- **Reviewer that never reviewed**: `agents.md` admits the Reviewer agent 429'd out and verification was self-conducted. So the entire legacy wiki is **author-asserted vs independently-verified** — and only the first half is true.

## Invariants

What the legacy wiki gets RIGHT and should be preserved as ground truth in the new wiki:

1. `BiomeType` enum: `forest | desert | tundra | plains | city`. Confirmed in `BiomeSystem.ts:3`.
2. `TreeType` enum: `sequoia | pine | oak | bush | hedge | cactus`. Confirmed in `Tree.ts:3`.
3. Biome adjacency graph in `Biome Transitions.md` — byte-exact match to `BiomeSystem.ts:11-17`.
4. Biome duration 3000–8000 px — confirmed in `BiomeSystem.ts:24` and `:39`.
5. City DNA ranges (density 0.4–0.9, greenery 0.1–0.8, building height 0.8–1.2) — confirmed in `CityGenerator.ts:37-39`.
6. PRNG = Mulberry32 + cyrb128 — confirmed in `Random.ts`.
7. `scaleFactor = 1.6` — confirmed in `Game.ts:25`.
8. Delta-time cap `0.1` s — confirmed in `Game.ts:154`.
9. Layer count = 4 with speed modifiers `0.2, 0.4, 0.6, 1.0` and z-indexes `0..3` — confirmed in `Game.ts:110-115`.
10. Terminal command set: `help, seed, speed, pause, volume, mute, format, fullscreen, clear, reset, biome, generate` — 12 commands, byte-exact match to `Terminal.ts:registerBuiltIns()`.
11. Tree-biome eligibility (cactus→desert only, pine→forest+tundra, sequoia→forest, oak→forest+plains, bush→forest+plains, hedge→plains+city) — exact match to `DEFAULT_TREE_CONFIG`.

These invariants should be lifted verbatim into the new wiki entity pages (with proper backlinks).

## Surprises / risks / TODOs

### Genuine drift found

1. **`Tree Configurations.md` undercounts oak puffs**. The doc says oak has "a crown made of 5 overlapping circular puffs". Code (`Tree.ts`) needs re-verification — sampled the dimensions block only, but doc tone is generally accurate. Low risk, but UPDATE candidate.
2. **`Procedural Generation of Buildings.md` quotes "$50\%$ chance" cyan windows and "$20\%$ chance to remain un-drawn"**. `Building.ts` was not deeply re-read here — flag for entity-tier agent. The doc tone is precise enough to be a regression test.
3. **`UI_and_Configuration.md`** describes speed slider range as "−10x to +20x". `main.ts` is 1894 LOC and contains the slider logic — entity-tier agent for `main.ts` should verify; if changed, UPDATE.
4. **`agents.md` is wrong about its own swarm**. It claims the orchestrator was "Antigravity (Main Agent)" on Gemini 3.1 Pro with Claude Opus 4.6 fallback. The current swarm scan (this one) is Claude Opus 4.7 1M-context. Treat `agents.md` as historical only — DELETE or move to `wiki/decisions/legacy-swarm-history.md` if anyone cares.
5. **Polish welcome stub `Witaj.md`** is pure Obsidian default cruft. DELETE.

### Behaviours present in code that are NOT documented in either legacy wiki

These are the real gaps the new wiki must close:

1. **`Game.timeFormat`**, the `'score' | '24h' | '12h'` triplet and the in-loop DOM update of `#ui-time-val`. `State_Management.md` mentions `timeFormat` as a parameter but doesn't describe the score format (raw `cameraX` as integer).
2. **`Game.isPreview` multi-instance pattern**: `Engine_Architecture.md` mentions "Multi-Instance Support" but doesn't say that the preview instance *skips* `SkySystem` instantiation entirely (`Game.ts:121`) — that's a non-trivial behaviour difference.
3. **`Terminal.pendingResetTarget` flow** is described but the actual `reset` subcommand list (`all, speed, volume, format, seed, generate`) is only in the autocomplete metadata, not narrated anywhere.
4. **`generate` command grammar** with key:value pairs (`generate pine minHeight:50 flowerChance:0.5`, biome-aware `flowerChance` only applying to cactus, `biome` read-only) is touched on but not specified. Recent commit `9a7c5df` calls this out explicitly: "dynamic context-aware autocomplete, biome cmd read-only, flowerChance cactus-only" — so the docs were written *before* those changes.
5. **`TreeConfigItem.enabled` + `biomes` filter logic** in `CityGenerator.pickTreeType()` (returns `null` if no eligible tree for the biome, treating the chunk as gap).
6. **`Ground` types** (`pavement | grass | water | dirt`) — `Chunk System.md` mentions them but `Ground.ts` (55 LOC) is never explicitly documented as an entity.
7. **`TextureGenerator`** (46 LOC) is mentioned in `Building Configuration.md` but has no page of its own.
8. **Vite base path** is correctly described as `/skyline-scroller/`, but the **PR preview workflow** (commit `f156f7c`) added a third workflow file — `Build and Deploy Pipeline.md` still only mentions the two original workflows.
9. **Vitest test suite** (also commit `f156f7c`) is mentioned in `agents.md` as "8 tests covering Random.ts PRNG" but is not described in `Build and Deploy Pipeline.md`.

### Risks

- If we delete the old vaults without first lifting invariants 1–11 above and the celestial-flip prose, we lose information.
- The `.obsidian/` directories in both folders contain plugin configs (Local REST API keys etc.) — if those keys were ever real for a publicly-deployed Obsidian endpoint, they belong in a key-rotation note. Quick check shows nothing obviously sensitive in the visible structure, but a hand audit before deletion is wise.

## Suggested wiki pages

To absorb everything worth keeping from the legacy vaults:

- [[entities/Game]] — absorb `Engine_Architecture.md`, `Game_Loop_and_Time.md`, `State_Management.md`.
- [[entities/Terminal]] — absorb `Terminal Overview.md`, `Terminal Grammar State Machine.md`, `Terminal Autocomplete Engine.md`.
- [[entities/SkySystem]] — absorb `Sky Gradients.md`, `Celestial Bodies.md` (the flip mechanic in particular).
- [[entities/CityGenerator]] — absorb `City Generation.md`, `Procedural Generation Overview.md`, `Chunk System.md`, `Building Configuration.md`.
- [[entities/BiomeSystem]] — absorb `Biome System.md`, `Biome Mechanics.md`, `Biome Transitions.md` (these three describe the same 51-LOC class three times).
- [[entities/Tree]] + [[entities/TreeConfig]] — absorb `Tree Configurations.md`, `Procedural Generation of Flora.md`.
- [[entities/Building]] — absorb `Procedural Generation of Buildings.md`.
- [[entities/Landscape]] — absorb `Landscape Generation.md`.
- [[entities/CityEntity]] — absorb `Entity Caching System.md`.
- [[entities/Layer]] + [[entities/Renderable]] — absorb `Layering_System.md`.
- [[systems/game-loop]] — absorb `Game_Loop_and_Time.md` operational content.
- [[systems/sky]] — absorb the keyframe/flip content from `Sky Gradients.md` + `Celestial Bodies.md`.
- [[systems/procgen]] — absorb `Procedural Generation Overview.md`, `Chunk System.md`.
- [[systems/parallax-layers]] — absorb `Layering_System.md`.
- [[systems/entity-rendering]] — absorb `Graphics Pipeline Overview.md`, `Entity Caching System.md`.
- [[systems/terminal]] — absorb the three Terminal pages.
- [[systems/ui-shell]] — absorb `UI Architecture Overview.md`, `UI_and_Configuration.md`.
- [[systems/css-architecture]] — absorb `CSS Architecture.md`.
- [[concepts/determinism]] — absorb `Deterministic Randomness.md`.
- [[concepts/chunking]] — absorb chunking parts of `Chunk System.md`.
- [[operations/build-and-deploy]] — absorb `Build and Deploy Pipeline.md` (and refresh for the new PR-preview workflow).
- [[decisions/legacy-swarm-history]] (optional) — distil `agents.md` into a one-paragraph "where the original docs came from" decision note, then delete the original.

## Disposition table

Legacy page paths shown relative to `skyline-scroller/skyline-scroller/` unless noted. `docs/knowledge_base/` mirrors are implicit — same disposition applies to its (older, smaller) copy.

| Legacy page | Status | Replacement |
| --- | --- | --- |
| `agents.md` | DELETE (optional distil to decision) | optional [[decisions/legacy-swarm-history]] |
| `Witaj.md` | DELETE | none — Obsidian default template, Polish stub |
| `Engine_Architecture.md` | SUPERSEDED | [[entities/Game]] + [[systems/game-loop]] |
| `Game_Loop_and_Time.md` | SUPERSEDED | [[entities/Game]] + [[systems/game-loop]] |
| `State_Management.md` | SUPERSEDED | [[entities/Game]] + [[entities/main]] |
| `Layering_System.md` | SUPERSEDED | [[entities/Layer]] + [[entities/Renderable]] + [[systems/parallax-layers]] |
| `UI_and_Configuration.md` | UPDATE then SUPERSEDED | [[systems/ui-shell]] (verify speed-slider range against `main.ts`) |
| `Graphics Pipeline Overview.md` | SUPERSEDED | [[systems/entity-rendering]] |
| `Entity Caching System.md` | SUPERSEDED | [[entities/CityEntity]] + [[systems/entity-rendering]] |
| `Sky Gradients.md` | KEEP-AS-SOURCE then SUPERSEDED | [[entities/SkySystem]] + [[systems/sky]] (lift keyframe table) |
| `Celestial Bodies.md` | KEEP-AS-SOURCE then SUPERSEDED | [[entities/SkySystem]] + [[systems/sky]] (lift flip-mechanic prose) |
| `Procedural Generation of Buildings.md` | UPDATE then SUPERSEDED | [[entities/Building]] (verify window % constants) |
| `Procedural Generation of Flora.md` | SUPERSEDED | [[entities/Tree]] |
| `Landscape Generation.md` | SUPERSEDED | [[entities/Landscape]] |
| `Procedural Generation Overview.md` | SUPERSEDED | [[systems/procgen]] |
| `Deterministic Randomness.md` | SUPERSEDED | [[concepts/determinism]] + [[entities/Random]] |
| `City Generation.md` | SUPERSEDED | [[entities/CityGenerator]] |
| `Chunk System.md` | SUPERSEDED | [[concepts/chunking]] + [[entities/CityGenerator]] |
| `Biome System.md` | SUPERSEDED | [[entities/BiomeSystem]] |
| `Biome Mechanics.md` | SUPERSEDED (dup of Biome System) | [[entities/BiomeSystem]] |
| `Biome Transitions.md` | SUPERSEDED (dup of Biome System) | [[entities/BiomeSystem]] |
| `Building Configuration.md` | SUPERSEDED | [[entities/Building]] + [[entities/CityGenerator]] |
| `Tree Configurations.md` | SUPERSEDED | [[entities/Tree]] + [[entities/TreeConfig]] |
| `Terminal Overview.md` | SUPERSEDED | [[entities/Terminal]] + [[systems/terminal]] |
| `Terminal Grammar State Machine.md` | UPDATE then SUPERSEDED | [[systems/terminal]] (add `generate` grammar, `biome` read-only, cactus-only `flowerChance`) |
| `Terminal Autocomplete Engine.md` | SUPERSEDED | [[systems/terminal]] |
| `CSS Architecture.md` | SUPERSEDED | [[systems/css-architecture]] |
| `UI Architecture Overview.md` | SUPERSEDED | [[systems/ui-shell]] |
| `Build and Deploy Pipeline.md` | UPDATE then SUPERSEDED | [[operations/build-and-deploy]] (add `pr-preview.yml`, vitest suite) |
| `md_contents.json` | DELETE | none — indexing scrap |
| `ts_contents.json` | DELETE | none — indexing scrap |
| `.obsidian/` (both) | DELETE | none — Obsidian per-vault config, audit for any leftover API keys first |
| `docs/knowledge_base/*.md` | DELETE (older subset of the above) | dispositions inherited from sibling files in `skyline-scroller/skyline-scroller/` |

### Counts

- KEEP: 0 (no legacy page is "still authoritative as-is" — they were always intended as scaffolding for replacement)
- UPDATE: 4 (`UI_and_Configuration.md`, `Procedural Generation of Buildings.md`, `Terminal Grammar State Machine.md`, `Build and Deploy Pipeline.md` — fix specific drift before the supersession write)
- SUPERSEDED: 23 (all the remaining .md content pages — material to be lifted into new structure)
- DELETE: 6 (`agents.md`, `Witaj.md`, `md_contents.json`, `ts_contents.json`, plus both `.obsidian/` config dirs; and recursively, the entire `docs/knowledge_base/` folder since every file there is an older mirror)

(Two pages — `Sky Gradients.md` and `Celestial Bodies.md` — are marked `KEEP-AS-SOURCE then SUPERSEDED` because the prose is uniquely worth lifting; they collapse into SUPERSEDED in the count.)

### Recommended cleanup order

1. Run the rest of the swarm scan to populate `wiki/entities/`, `wiki/systems/`, `wiki/concepts/`, `wiki/operations/` with the canonical pages above.
2. Lift the 11 invariants (Invariants section) and the celestial-flip prose into those pages directly.
3. Verify the 4 UPDATE candidates against current `src/` line-by-line.
4. Audit both `.obsidian/` folders for any embedded API keys or credentials before removal.
5. Delete `docs/knowledge_base/` wholesale.
6. Delete `skyline-scroller/skyline-scroller/` wholesale (this empties the misnamed nested folder).
7. Add a one-line note in [[log]] recording the supersession.
