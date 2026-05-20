---
name: Determinism
description: Seed → world contract — how a seeded PRNG promises a reproducible scene, and the documented places it leaks.
type: concept
---

# Determinism

## Definition

A `seed: string | number` is *meant* to fully determine the visible world. Macro features — skyline silhouette, biome run order, chunk widths, building placement, tree picks — are reproducible. Micro features — exact lit windows, stone-noise dots, cactus flower side, cloud layout, time of day at boot — are *not*. Determinism here is a **macro-level contract** with documented escape hatches for "decorative noise".

The contract is single-cell: the entire PRNG state is one `u32` ([[entities/Random]]), advanced by a Mulberry32 step. String seeds are hashed via a truncated `cyrb128` mixer; numeric seeds are masked with `>>> 0`.

## Where it lives

| Layer | Anchor | Notes |
|---|---|---|
| Primitive | `src/utils/Random.ts:4` | Mulberry32 PRNG + cyrb128 string hash, single u32 state |
| World layout | `src/procgen/CityGenerator.ts:24` (`new Random(seed)`) | Owns the canonical seed stream |
| Biome graph | `src/procgen/BiomeSystem.ts:20` (`new Random(seed)`) | **Same seed string** as CityGenerator — sibling-RNG correlation |
| Re-entry | `src/engine/Game.ts:86-89, 103` (`setSeed → reset`) | Every customisation path terminates here |
| User intake | `src/main.ts:235` (`Math.floor(Math.random()*100000).toString()`) | Initial seed is always a string |

The contract is **enforced** by the `tests/Random.test.ts` suite: same seed → same first draw, same sequence, both for string and numeric seeds.

## Why it matters

- **Shareable worlds.** A seed slug is the entire description of a city. Users can swap a string and "see that one cool skyline" again. The whole `seed`-command UX in [[entities/Terminal]] depends on this.
- **Reproducible bugs.** Visual glitches in procgen can be re-investigated by re-running the same seed. Without this, every bug report would be "saw a weird building, can't reproduce".
- **Cheap state.** One `u32` per generator instance; no save format, no replay buffer. The PRNG is the entire world description.
- **The customisation loop closes.** customisation flow depends on this: every user action either changes a parameter and reseeds, or is view-only. Without determinism, the "Apply" button has no fixed point — clicking it would produce different results each time even with no input change.
- **`btn-gen-apply` exploits "same seed → full reset".** Passing the *same* seed to `setSeed` still triggers a full `reset()`, so applying tweaked `treeConfig` works by reseeding with the unchanged seed. The deterministic-by-seed property makes this exploit safe.

## Counter-examples

These are intentional leaks — places where `Math.random()` or `Date.now()` are spliced into otherwise-pure procgen:

- `src/engine/Building.ts:62` — stone-noise dots use `Math.random()`.
- `src/engine/Building.ts:74` — window tint coin flip (warm vs day reflection).
- `src/engine/Building.ts:79` — per-window present/missing (80/20).
- `src/engine/TextureGenerator.ts:41` — wood-grain randomness.
- `src/engine/Landscape.ts:38,92` — city silhouette + decoration jitter.
- `src/engine/Tree.ts:34,37` — cactus flower roll (even though `flowerChance` is configured).
- `src/engine/Game.ts:75` — noise-dither fill.
- `src/engine/SkySystem.ts:42` — **whole subsystem** reseeds with `Date.now()`. Clouds and time-of-day are non-reproducible.

Additional asymmetries:

- **Sibling-RNG correlation**: `CityGenerator` and `BiomeSystem` both call `new Random(seed)` with the *same* seed string. Two independent instances seeded identically produce **identical sequences**, so a `biomeRng.nextFloat()` and a `cityRng.nextFloat()` at the same logical tick draw the same value. This is unintentional decorrelation loss. Fix in [[decisions/DEC-01-unified-rng]].
- **`cyrb128` returns 32 bits, not 128.** The mix function is real, but the final return XORs the four words. Collision surface is `2^32` not `2^128`. Harmless for procgen, dangerous if anyone trusts the name.
- **`new Random(0)` ≠ `new Random("")`.** Numeric path masks; string path hashes. Empty string runs the post-loop mix on un-touched SHA-IV constants and returns a non-zero state.
- **No `pick` / `weighted` / `bool` helpers.** The `Random` class is a minimal Mulberry32 wrapper — call sites reinvent these idioms inline (e.g. `arr[this.rng.nextInt(0, arr.length)]` appears repeatedly). Each reinvention is a chance to leak `Math.random()` instead.

## Invariants

1. `new Random(s).nextFloat()` is a pure function of `s` — same seed always yields the same first draw, and same sequence.
2. `seed → (CityDNA, biome run order, chunk sequence, building/tree placement)` is deterministic.
3. `seed → (window lit/unlit, stone-noise dots, cactus flower side, sky time-of-day, cloud layout)` is **not** deterministic — these are decorative-noise escape hatches.
4. `treeConfig` is always deep-cloned when crossing the Game ↔ Generator ↔ Preview boundary, otherwise mutations would leak across instances and break the "same seed → same picture" promise even at the macro level. See [[concepts/dualisms]] #121.
5. Mulberry32 has period `2^32` — well above the number of draws in any plausible session.
6. No global PRNG state — every `Random` instance is independent. There is no module-level singleton.

## Where the leaks aggregate

The leaks are not random — they cluster at the "decorative noise" boundary inside otherwise-pure engine modules. Architecturally, [[concepts/side-effect-surface]] places these inside modules that *should* be pure draw-to-context. The proposed fix in [[decisions/DEC-01-unified-rng]] is to add a `Random.fork(label)` method so every leak site can request a decorrelated sub-stream from the canonical seed — converting "leaks" into "branches" without sacrificing the macro contract.

## See also

- [[entities/Random]] — the primitive
- [[entities/Game]] — `setSeed → reset` re-entry point
- customisation flow — the loop that depends on this contract
- [[concepts/side-effect-surface]] — where the leaks live architecturally
- [[concepts/dualisms]] #13, #14, #15 — seeded/unseeded, deterministic/stochastic, string/numeric seed
- [[decisions/DEC-01-unified-rng]] — proposed `Random.fork()` to fix sibling correlation + decorative-noise leaks
