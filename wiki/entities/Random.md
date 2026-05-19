---
name: Random
description: Seeded PRNG (Mulberry32 + cyrb128 string hash). The deterministic spine of the engine.
type: entity
source: src/utils/Random.ts
loc: 49
verified: codex 2026-05-20
---

# Random

## Role

Single-class deterministic RNG. Every reproducible aspect of the scene (skyline, biome run, chunk layout, tree species choice) is driven by an instance of `Random` seeded from a string.

## Algorithm

- **PRNG**: **Mulberry32** by Tommy Ettinger. Single 32-bit state, period 2³², Weyl increment `0x6D2B79F5` at `Random.ts:35`. Header comment confirms the algorithm.
- **String → state**: a *truncated* cyrb128 by Bryc (SHA-256 IVs as seed-state) at `Random.ts:16–31`. The four resulting hash words are XOR-collapsed to a single u32 — so the effective hash width is 32 bits despite the name `cyrb128`.

## Public surface

| Method | Behaviour |
|---|---|
| `constructor(seed: string \| number)` | Hashes string via cyrb128-then-XOR; numeric seed used directly. |
| `next(): number` | Advances state, returns u32. |
| `nextFloat(): number` | `[0, 1)` float. |
| `nextInt(min, max): number` | `[min, max)` half-open integer. **BUG**: returns `min` when `min === max` (violates contract). See [[decisions/DEC-01-unified-rng]]. |
| `pick<T>(arr: T[]): T` | Uniform element pick. |

## Confirmed defects (Codex 2026-05-20)

1. **`nextInt(min, max)` half-open violation** — `Random.ts:43` `Math.floor(this.nextFloat() * (max - min)) + min` returns `min` when bounds equal. Tests don't exercise this case.
2. **`cyrb128` misnomer** — returns u32, not 128 bits. Harmless for procgen, misleading if anyone trusts the name.
3. **No sub-stream forking** — every consumer creating their own `new Random(seed)` produces *identical* sequences (see `CityGenerator` + `BiomeSystem` correlation bug — [[entities/CityGenerator]]).

## Determinism contract

`Random` itself is fully deterministic. Determinism leaks elsewhere in the engine — **not** here. Sites that use `Math.random()` or `Date.now()` instead of `Random` are catalogued in [[concepts/determinism]] and fixed by [[decisions/DEC-01-unified-rng]].

## Dependencies

- **Imports**: none.
- **Imported by**: `BiomeSystem`, `CityGenerator`, `SkySystem` (everywhere via `new Random(seed)`).
- **Type-only by**: none — runtime import everywhere.

## Tests

`tests/Random.test.ts` asserts:
- Same seed → same sequence (reproducibility).
- `nextInt(0, 10)` stays in `[0, 10)`.
- `pick` returns a member of the input.

Not covered: `nextInt` with equal bounds; cross-instance independence; distribution uniformity over large N; the cyrb128 collision rate.

## See also

- [[concepts/determinism]] — the contract
- [[decisions/DEC-01-unified-rng]] — proposed `fork(label)` sub-stream API
- [[entities/CityGenerator]] — primary consumer
