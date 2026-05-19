---
name: Procedural Budgets
description: Bounded ranges for density, chunk widths, generation horizons, and DNA — the guardrails that prevent both empty deserts and walls of skyscrapers.
type: concept
---

# Procedural Budgets

## Definition

All density/quantity knobs in procgen are **bounded ranges**, mostly seed-driven via `CityDNA`. The system has no unbounded knobs — every "how much" question is clamped. The point is to enforce a constant performance ceiling *and* aesthetic guardrails (no empty deserts, no walls of skyscrapers, no infinite tree heights).

## Where it lives

| Budget | Range | Anchor |
|---|---|---|
| `dna.density` | 0.4–0.9 | `src/procgen/CityGenerator.ts:11, 37` |
| `dna.greenery` | 0.1–0.8 | `CityGenerator.ts:12, 38` |
| `dna.buildingHeight` | 0.8–1.2 | `CityGenerator.ts:13, 39` |
| Landscape chunk width | 200–500 px | `CityGenerator.addChunk` |
| Building chunk width | 60–120 + 20·layerIndex | `CityGenerator.ts:129` |
| Tree chunk width | `w + 10..30` | `CityGenerator.addChunk` |
| Gap width | 20–100 px | `CityGenerator.addChunk` |
| Water chunk min | ≥ 100 px | `CityGenerator.addChunk` |
| Tree height bounds | per type per `TreeConfig` | `src/procgen/TreeConfig.ts:14` |
| Cloud pool | 20 | `src/engine/SkySystem.ts:49` |
| Sky keyframes | 17 covering 24h | `SkySystem.ts:8-26` |
| Generation horizon | `cameraX*speedModifier + viewportWidth + 500` | `CityGenerator.ts:52` |
| Prune horizon | `layerViewX - 2000` | `src/engine/Layer.ts:22` |

## The DNA budget

`CityDNA` is constructed once per generator (i.e. per seed) and stays constant for the lifetime of a city. Three knobs:

| Knob | Range | What it biases |
|---|---|---|
| `density` | 0.4–0.9 | Probability that a chunk slot is filled by a building/tree vs left as `none` |
| `greenery` | 0.1–0.8 | Conditional probability that a filled slot becomes a tree (vs building) |
| `buildingHeight` | 0.8–1.2 | Global multiplier on per-building height range |

Note the skew: `density` is biased toward dense (range midpoint 0.65, not 0.5). Empty cities are rarer than crowded ones — a design choice baked into the bounds. See [[concepts/dualisms]] #42.

## Why it matters

- **Constant performance ceiling.** Because chunk widths are bounded above, the active-entity count per layer is bounded by `(generation_horizon + prune_horizon) / min_chunk_width`. Whatever the camera speed, the engine never has more than a fixed multiple of objects to draw or update.
- **Aesthetic guardrails.** A `density=0.0` city would scroll as empty space; a `density=1.0` city would be a wall. Clamping at `[0.4, 0.9]` keeps every seed visually viable.
- **Biome-realistic feature distribution.** [[concepts/chunking]] uses these budgets to pick chunk types; biome modulates the picks ([[entities/BiomeSystem]]) but cannot exceed the global caps.
- **Per-layer max width grows with `layerIndex`** (`maxW = 120 + layerIndex * 20`). Front-layer buildings are larger, encoding "closer = bigger" without changing the parallax math.

## Counter-examples

- **No hard cap on `Layer.objects.length`.** Memory is bounded only by `prune` running every frame. A pathological combination of fast camera, slow prune, and wide viewport could in principle grow the active set — but in practice the budgets above keep this bounded. There is no assertion enforcing it.
- **Cloud pool is fixed at 20**, not bounded by anything procgen-derived. Sky budget is decoupled from city budget.
- **Sky keyframes are 17 hand-chosen tuples**, not procedurally generated. The "budget" here is a designer-curated palette, not a sampled range.
- **`SkySystem.time` starting position** is uniform `[0, 24)` from `Date.now()`-seeded RNG — bounded by domain (sky-time wraps) but not by procgen budget.
- **`cameraSpeed = 100` px/s is hard-coded** with no setter — the world's forward speed is *not* a procgen budget, it's a constant.

## Invariants

- `dna.density ∈ [0.4, 0.9]`
- `dna.greenery ∈ [0.1, 0.8]`
- `dna.buildingHeight ∈ [0.8, 1.2]`
- Every chunk width is bounded above by the table values.
- Sky always has exactly 17 keyframes.
- Cloud pool always ~20 (despawn + respawn is 1-for-1, see [[concepts/control-flow]] §SM3).
- Generation horizon ≥ prune horizon (otherwise entities would be pruned before being seen).

## Why bounds, not raw knobs

A weaker design would expose `density`, `greenery`, `buildingHeight` to the user directly with no bounds. The current design picks each from a bounded range *seeded by the seed*. Three knock-on effects:

1. **The user never sees an unviable city.** Every seed produces something inside the aesthetic window. There is no "I tried 500 seeds and they all look the same" complaint — but also no "I rolled a degenerate seed".
2. **The procgen surface is small.** With DNA inside `CityGenerator`, the only user-facing knob in the customisation window is `treeConfig` (per-species enable/height). The wider knobs are intentionally hidden — see [[concepts/customisation-flow]].
3. **Performance is provably bounded.** Because chunk widths have a hard minimum, the active-set size has a hard maximum. No tuning knob can blow up the engine.

## Sky and procgen budgets are separate

[[entities/SkySystem]] runs on a totally separate budget envelope:

- Cloud pool fixed at 20.
- Sky keyframes fixed at 17.
- Cloud wind speed comes from a hard-coded range.
- `time` advances at `0.1 * dt` game-hours per real second — no procgen knob.

A desert at midnight has the same sky as a tundra at midnight. The biome system does not modulate the sky. This is a deliberate decoupling — see [[concepts/dualisms]] #93–97 for the sky-internal dualisms.

## See also

- [[concepts/chunking]] — consumes these budgets to size each chunk
- [[concepts/determinism]] — DNA values are seed-derived
- [[concepts/customisation-flow]] — `treeConfig` exposes per-species height bounds to the user
- [[entities/CityGenerator]] — owns the DNA
- [[entities/BiomeSystem]] — modulates picks within these budgets
- [[concepts/dualisms]] #42, #43, #44 — sparse/dense, low/high greenery, short/tall
