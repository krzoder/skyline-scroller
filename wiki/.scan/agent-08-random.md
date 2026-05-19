# Agent 08 — Random (seeded PRNG)

## Files scanned

- `/Users/fszalaj/Documents/git/skyline-scroller/src/utils/Random.ts` (49 LOC)
- `/Users/fszalaj/Documents/git/skyline-scroller/tests/Random.test.ts` (89 LOC)

Cross-referenced (read-only, via grep) for usage context:
- `src/procgen/CityGenerator.ts`
- `src/procgen/BiomeSystem.ts`
- `src/engine/SkySystem.ts`
- `src/engine/Game.ts` (constructor wiring)
- `src/engine/Terminal.ts` (only references the word "seed" in command help text — no PRNG use)
- `src/main.ts` (no `new Random(...)` — only DOM `Randomize` buttons; PRNG ownership is delegated to the engine)

## Public surface (exports/classes/functions/types)

Single exported class `Random` from `src/utils/Random.ts`. No standalone functions, no enums, no type aliases exported.

### `class Random`

| Member | Signature | Behaviour |
|---|---|---|
| `constructor` | `(seed: number \| string)` | Initialises internal `state`. If `seed` is `string`, runs `cyrb128` to derive a 32-bit unsigned state. If `number`, coerces via `seed >>> 0` (unsigned 32-bit truncation). |
| `private cyrb128(str)` | `(str: string) => number` | String→u32 hash (see [Internal state](#internal-state)). Despite the name, it returns **one** u32 (only `h1^h2^h3^h4`), not the four-word output the original `cyrb128` produces. |
| `public nextFloat()` | `() => number` | Advances state by `0x6D2B79F5` and emits a float in `[0, 1)` (Mulberry32 step; divisor `4294967296` = `2**32`). |
| `public nextInt(min, max)` | `(min: number, max: number) => number` | Integer in `[min, max)` via `Math.floor(nextFloat() * (max - min)) + min`. |
| `public nextRange(min, max)` | `(min: number, max: number) => number` | Float in `[min, max)`. |

There is **no** `pick`, `weighted`, `bool`, `shuffle`, `gaussian`, or `range` helper — those idioms live ad-hoc at call sites (e.g. `arr[this.rng.nextInt(0, arr.length)]` in [[entities/CityGenerator]] and [[entities/BiomeSystem]]).

## Internal state

Single field: `private state: number` — one 32-bit unsigned integer, the entire PRNG state.

### Seed→state derivation (cyrb128, lines 16–31)

Despite being named `cyrb128`, the implementation collapses the canonical four-word output into a single u32. Exact code:

```ts
private cyrb128(str: string): number {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
}
```

The initial constants (`1779033703`, `3144134277`, `1013904242`, `2773480762`) are the SHA-256 fractional-bits IVs `H1..H4` — the standard cyrb128 seed pad lifted from Bryc's public-domain hash. The body is a faithful cyrb128 mix; the **deviation** is the return statement: real cyrb128 returns `[h1, h2, h3, h4]` (128 bits), this returns `h1 ^ h2 ^ h3 ^ h4 >>> 0` (32 bits collapsed via XOR). Effectively this is cyrb128's mix function used as a 32-bit string hash.

### PRNG step (Mulberry32, lines 34–39)

```ts
public nextFloat(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
```

This is **textbook Mulberry32** by Tommy Ettinger (constant `0x6D2B79F5` is the giveaway — it's the Weyl increment Mulberry32 uses). Period `2^32`, internal state 32 bits, passes gjrand's full BigCrush-lite battery — fine for game procgen, not fine for cryptography or simulation requiring large state. The header comment on line 2 correctly names it: `/** A simple seeded random number generator (Mulberry32). */`.

## Control flow

Pure forward-step PRNG, no branching in the hot path. The only conditional is the type discriminant in the constructor:

```
constructor(seed)
  └── typeof seed === 'string' ? cyrb128(seed) : seed >>> 0
```

`nextFloat()` is a pure state mutation (`this.state += 0x6D2B79F5`) followed by a fixed mixing pipeline. `nextInt` and `nextRange` are stateless wrappers over `nextFloat`.

## Dependencies (imports / imported-by, even if known indirectly)

**Imports**: none. Zero dependencies — pure TS, uses only `Math.imul`, `Math.floor`, `String.prototype.charCodeAt`. Tree-shake-friendly.

**Imported by** (verified via grep):

| File | Pattern | Lifecycle |
|---|---|---|
| `src/procgen/CityGenerator.ts` | `new Random(seed)` in ctor, kept as `private rng: Random` | per-Game instance, seed-derived |
| `src/procgen/BiomeSystem.ts` | `new Random(seed)` in ctor, kept as `private rng: Random` | per-Game instance, **same seed string as CityGenerator** (sibling RNG, see [Surprises](#surprises--risks--todos)) |
| `src/engine/SkySystem.ts` | `new Random(Date.now())` in ctor | **non-reproducible** — uses wall clock |
| `tests/Random.test.ts` | many `new Random(N)` | per-test instance |

Not imported by `Game.ts` directly; `Game.ts` only constructs `CityGenerator` / `SkySystem`, passing `this.seed` through.

## Complexity & hotspots

None worth flagging. `nextFloat` is ~6 arithmetic ops and one division — O(1) and trivially branch-predictable. `cyrb128` is O(n) in seed-string length, but seeds are short user-facing strings (city names, slugs) so amortised cost is invisible. No allocations on the hot path.

The only micro-concern is the `/ 4294967296` division at the end of `nextFloat` — every consumer that immediately re-multiplies (e.g. `nextInt` does `* (max-min)`, `nextRange` does `* (max-min) + min`) is wasting a div/mul pair. A `nextU32()` primitive would be cleaner but the perf delta is negligible for 60Hz rendering at the volumes used here.

## Dualisms & duality patterns observed

This file is a *dualism factory* — almost every design axis is a binary fork:

- **Seeded vs unseeded**: the class is seeded by construction, but `SkySystem` deliberately re-injects entropy via `new Random(Date.now())` — turning a deterministic primitive into a stochastic one. Constructor signature `number | string` is itself the seed-source dualism.
- **String-seed vs numeric-seed**: two completely different intake paths (`cyrb128` vs `>>> 0`) producing the same downstream type (`number` state). Numeric seeds bypass the hash, so `new Random(0)` and `new Random("")` are **not** equivalent — `cyrb128("")` returns the final XOR of the un-mutated SHA IV constants, not 0.
- **Stateful instance vs functional output**: `nextFloat` mutates `this.state` (stateful), but `nextInt`/`nextRange` are pure transforms of `nextFloat`'s value (functional adapters over a mutating core). Classic stateful-core + functional-shell pattern.
- **Integer output vs float output**: `nextInt` vs `nextFloat`/`nextRange`. `nextInt` is the only floor-truncating method; the others preserve full float entropy.
- **In-range vs unbounded**: `nextFloat` is bounded `[0,1)`, the other two are bounded `[min,max)`; there is no unbounded variant (no `nextU32`, no `nextGaussian`).
- **Inclusive-lower vs exclusive-upper**: all three numeric outputs are half-open intervals — consistent, but worth noting because the test at line 53 asserts `nextInt(3,4) === 3`, which only works because of the exclusivity convention.
- **Deterministic by construction vs non-deterministic by use**: the class is fully deterministic; the *codebase* breaks determinism only at `SkySystem.ts:42` via `Date.now()`. So clouds drift differently every page-load while the skyline is byte-identical for a given seed — an intentional dualism between "background atmosphere" (stochastic) and "world geometry" (deterministic).
- **Shared seed vs per-system seed**: `CityGenerator` constructs both its own `rng` and a child `BiomeSystem` with the **same seed string**. Two separate `Random` instances with identical seeds produce identical sequences, so the two systems are tightly coupled in their RNG draws — not independent streams. See [Surprises](#surprises--risks--todos).
- **One-shot hash vs streaming PRNG**: `cyrb128` is a *one-shot* hash (called once at construction); `nextFloat` is a *streaming* PRNG (called millions of times). Two different problem domains, both wedged into one class.

## Invariants

1. **Determinism**: `new Random(s).nextFloat()` is a pure function of `s` — same seed always yields the same first draw, and same sequence. Tests at lines 6–20 enforce this for both string and numeric seeds.
2. **Range bounds**: `nextFloat() ∈ [0, 1)`, `nextInt(a,b) ∈ [a, b) ∩ ℤ`, `nextRange(a,b) ∈ [a, b)`. Tests at 31–68 enforce all three.
3. **State width**: `this.state` is always a u32 (preserved by `>>> 0` in the constructor and by Mulberry32's `>>> 0` before division).
4. **No global state**: every `Random` instance is independent. There is no module-level singleton, no `Math.random` fallback.
5. **Integer purity**: `nextInt` always returns an integer (verified at test line 49).
6. **Period**: `>= 2^32` distinct outputs before recurrence (Mulberry32 has period `2^32`); not asserted by any test.

## Surprises / risks / TODOs

- **`cyrb128` returns 32 bits, not 128**. The hash uses cyrb128's mixing function but XORs the four hash words down to a single u32. Hash quality is still good for short strings, but the **collision surface is `2^32`**, not the `2^128` the function name implies. For procgen this is harmless; if anyone later relies on the seed-hash for anything security-adjacent (it shouldn't, but the misnomer invites it), they'll get a surprise.
- **Sibling-RNG correlation**: `CityGenerator` and `BiomeSystem` both call `new Random(seed)` with the *same* seed. Because Mulberry32 is deterministic, both instances produce **identical sequences**. Any call to `cityRng.nextFloat()` and `biomeRng.nextFloat()` at the same logical tick draws the same value. This is almost certainly unintentional decorrelation loss — the standard fix is `new Random(seed + ":biomes")` or to give `BiomeSystem` a sub-RNG derived from `cityRng`. See lines 24 and 26 of `CityGenerator.ts`.
- **`SkySystem` is non-reproducible**. `new Random(Date.now())` at `SkySystem.ts:42` means clouds/aurora/lightning never replay identically across page loads, even with a fixed scene seed. If anyone tries to record/replay or screenshot-diff scenes, this will surface. Quick fix: accept a seed param like every other system.
- **No `pick`/`weighted`/`bool`**. The call sites reinvent these inline (e.g. `availableTypes[this.rng.nextInt(0, availableTypes.length)]` appears repeatedly in `CityGenerator.ts`). A small extension to `Random` would deduplicate ~10 call sites.
- **Numeric-seed footgun**: `new Random(-1)` works (`-1 >>> 0 === 0xFFFFFFFF`), `new Random(1.5)` also works (truncates to 1), `new Random(NaN)` produces state 0. None of these are rejected or warned about. Test coverage doesn't exercise non-int numeric seeds.
- **Empty-string seed is *not* equivalent to numeric 0**. `new Random("")` runs the post-loop mixing on un-touched SHA IVs and returns a non-zero state. `new Random(0)` returns state 0. No test catches this asymmetry.
- **`Math.imul` assumption**: portable to all modern JS runtimes (ES2015+); not a real risk given the project ships ES modules to a browser via Vite.
- **Test gaps**: no test for the empty-string seed edge case, no test for collision behaviour between numeric and string seeds (`new Random(0)` vs `new Random("0")` produce different streams — surprising but probably correct), no test for period or low-bit independence, no test for `nextInt` when `min >= max` (returns `min` or undefined behaviour depending on rounding — currently returns `min` for `nextInt(5,5)` because `Math.floor(x*0)+5 === 5`, which silently violates the `< max` invariant the test asserts; the production tests don't catch this because they only test `min < max`).

## Suggested wiki pages

- [[concepts/Determinism]] — central design principle, with this file as the primary artefact and `SkySystem` as the documented escape hatch.
- [[concepts/Seeded PRNG]] — the Mulberry32 algorithm, link to Tommy Ettinger's original and Bryc's gist; explain why `0x6D2B79F5` shows up.
- [[concepts/Seed hashing]] — cover cyrb128 vs the truncated variant used here, plus the string↔number seed dualism.
- [[entities/Random]] — the class itself, public API table, dependency-graph.
- [[entities/CityGenerator]] / [[entities/BiomeSystem]] / [[entities/SkySystem]] — consumers; cross-link to [[entities/Random]] and note the sibling-RNG correlation issue.
- [[decisions/Why Mulberry32]] — speculative, but worth recording the trade (small state, single file, no deps, "good enough for procgen") vs alternatives (xoshiro128**, splitmix32, PCG).
- [[questions/Should BiomeSystem get a decorrelated sub-stream]] — open question pointing at the `seed`-reuse risk.
