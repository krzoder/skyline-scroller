---
id: DEC-01
title: Unified RNG via Random.fork()
status: proposed
deciders: [assistant, codex]
date: 2026-05-20
tags: [decision, determinism, rng, procgen]
supersedes: []
superseded-by: []
related: ["[[entities/Random]]", "[[concepts/determinism]]"]
---

# DEC-01 — Unified RNG via `Random.fork()`

> [!summary]
> Replace every `Math.random()` and every duplicated `new Random(seed)` site with **child streams forked from a single root `Random`** so that a given user seed reproduces the exact same scene across reloads.

## Problem

The procedural pipeline claims to be seed-driven, but several subsystems still pull entropy from `Math.random()` (`Game.initNoise`, `Landscape.generateShape`/`decorate`, `Building` window lights, `Tree` cactus-flower side) and `SkySystem` is seeded from `Date.now()`. Worse, `CityGenerator` and `BiomeSystem` each construct `new Random(seed)` from the same string, so they run **identical PRNG streams in lock-step** — any reordering of calls in one silently shifts output in the other. A user pasting a seed today gets a different city tomorrow; two seemingly-independent subsystems are accidentally coupled; and the `Random.nextInt(5, 5) === 5` half-open contract is violated. This blocks shareable seeds, deterministic snapshot tests, and regression debugging. See [[concepts/determinism]] for the broader contract.

## Constraints

- **Per-seed reproducibility across reloads** — given identical user seed, every pixel of generated content must match across runs.
- **Decoupled sub-streams** — drawing N values from one subsystem must not perturb any other subsystem's stream.
- **Cheap** — no measurable cost at construction or per-call vs. current Mulberry32 (~5 ns/call).
- **No third-party deps** — vault is plain TS, keep it that way.
- **Preserve the public API of `Random`** — `nextFloat`, `nextInt`, `nextRange`, string-or-number seed constructor must keep working unchanged. Existing callers see only an additive `fork()` method.
- **No global mutable singleton** — pass the RNG explicitly; no `import { rng } from ...`.

## Options considered

### Option A — Salt-and-fork (concat seed string)
Each subsystem does `new Random(seed + ':noise')`, `new Random(seed + ':biome')`, etc.

- Pros: trivial, no API change.
- Cons: cyrb128 collisions are realistic across short labels; every site must remember to salt; easy to forget and reintroduce coupling. Adds string concat at every construction site.

### Option B — Single global `Random` passed around
Construct one `Random(seed)` in `Game`, thread it as a parameter through every constructor.

- Pros: smallest surface; one stream of truth.
- Cons: **fails the decoupling constraint** — adding a `nextFloat()` call anywhere shifts every downstream draw. Snapshot tests would be brittle. This is the failure mode we have today; just renamed.

### Option C — Splitmix64-style sub-streams via `fork(label)` *(chosen)*
A root `Random` derives child streams by hashing `parentSeed XOR cyrb128(label)`. Each subsystem owns its own independent stream, but the whole tree is reproducible from one root seed.

- Pros: subsystems are independent (drawing in noise doesn't shift biome); single mental model (`rootRng.fork('noise')`); pure addition to `Random`; matches established patterns (numpy `SeedSequence`, JAX `split`, Rust `rand`'s `SeedableRng::from_rng`). Labels are stable strings that read like documentation.
- Cons: one new method on `Random`; developers must remember to fork instead of reusing parent. Mitigated by code review and the migration table below.

**Decision: Option C.** It is the only option satisfying both reproducibility *and* decoupling at low cost.

## Decision

Introduce `Random.fork(label: string): Random` that derives a child stream by hashing `parentSeed XOR cyrb128(label)`. Every subsystem owns a forked child stream; no subsystem calls `Math.random()` or `Date.now()` for procgen.

```ts
public fork(label: string): Random {
    // Mix parent state with label hash so siblings with different labels diverge.
    const labelHash = this.cyrb128(label);
    const childSeed = (this.state ^ labelHash) >>> 0;
    return new Random(childSeed);
}
```

Also fix `nextInt`: when `min === max` return `min` instead of producing `min` from a half-open range that has measure zero (current code already returns `min` by accident, but the invariant is undocumented — make it explicit and guarded).

## Migration table

| file:line | current | replacement |
|---|---|---|
| `Game.ts:75` (`initNoise`) | `Math.floor(Math.random() * 255)` | `noiseRng.nextInt(0, 256)` where `noiseRng = this.rootRng.fork('noise')` |
| `Game.ts:117` (`reset`) | `new CityGenerator(this.seed, …)` | `new CityGenerator(this.rootRng.fork('city'), …)` — accept `Random` instead of seed |
| `Game.ts` (new, in `reset`) | — | `this.rootRng = new Random(this.seed); this.sky = new SkySystem(canvas, this.rootRng.fork('sky'));` |
| `Landscape.ts:38` (`generateShape`, city silhouette) | `Math.random()` | `this.rng.nextFloat()` — constructor takes `rng: Random` forked as `'landscape:'+x` from CityGenerator's stream |
| `Landscape.ts:92` (`decorate`) | `Math.random()` | `this.rng.nextFloat()` (same forked stream) |
| `SkySystem.ts:42` | `new Random(Date.now())` | constructor parameter `rng: Random` (passed in from `Game` as `rootRng.fork('sky')`) |
| `CityGenerator.ts:24` | `this.rng = new Random(seed)` | constructor accepts `rng: Random`; `this.rng = rng` |
| `CityGenerator.ts:26` | `new BiomeSystem(seed)` | `new BiomeSystem(rng.fork('biome'))` — same seed string no longer means identical streams |
| `BiomeSystem.ts:20` | `this.rng = new Random(seed)` | constructor accepts `rng: Random`; `this.rng = rng` |
| `Building.ts:62` (stone noise) | `Math.random() * this.width`, `Math.random() * this.height` | `rng.nextRange(0, this.width)`, `rng.nextRange(0, this.height)` — constructor takes `rng: Random` forked per-building from CityGenerator |
| `Building.ts:74` (window tint) | `Math.random() > 0.5` | `rng.nextFloat() > 0.5` |
| `Building.ts:79` (window-present roll) | `Math.random() > 0.2` | `rng.nextFloat() > 0.2` |
| `Tree.ts:34` (cactus flower chance) | `Math.random() < flowerChance` | constructor takes `rng: Random`; `rng.nextFloat() < flowerChance` |
| `Tree.ts:37` (flower side) | `Math.random() < 0.5` | `rng.nextFloat() < 0.5` |
| `Random.ts:43` (`nextInt`) | `Math.floor(this.nextFloat() * (max - min)) + min` | guarded: `if (min === max) return min;` then existing formula |

`CityGenerator` becomes the parent of per-feature streams. Inside `addChunk` it should fork once per spawned object: `building.rng = this.rng.fork('building:'+this.lastX[index])` and likewise for trees and landscapes. Using `lastX` as the label gives positional reproducibility (the building at x=2340 always rolls the same windows).

## `nextInt(5,5)` resolution

**Fixed, not documented.** The half-open contract `[min, max)` is the standard in `Array.slice`, Python `range`, Rust `..`, and the existing test suite. Documenting `nextInt(n,n) === n` as expected would entrench an off-by-one trap. Add an explicit guard and an assertion test.

## Snippet — `src/utils/Random.ts` diff sketch

```diff
     // Returns an integer between min (inclusive) and max (exclusive)
     public nextInt(min: number, max: number): number {
+        if (min === max) return min;
+        if (min > max) throw new RangeError(`nextInt: min (${min}) > max (${max})`);
         return Math.floor(this.nextFloat() * (max - min)) + min;
     }

     public nextRange(min: number, max: number): number {
         return this.nextFloat() * (max - min) + min;
     }
+
+    /**
+     * Derive an independent child stream. Same parent state + same label
+     * => same child stream; different labels => independent streams.
+     */
+    public fork(label: string): Random {
+        const labelHash = this.cyrb128(label);
+        const childSeed = (this.state ^ labelHash) >>> 0;
+        return new Random(childSeed);
+    }
 }
```

## Snippet — `src/engine/Game.ts` diff sketch

```diff
 export class Game {
     // …
     private seed: string = "default";
+    private rootRng: Random = new Random("default");
     // …

     private initNoise() {
         const w = 256;
         const h = 256;
         // …
+        const noiseRng = this.rootRng.fork('noise');
         for (let i = 0; i < data.length; i += 4) {
-            const val = Math.floor(Math.random() * 255);
+            const val = noiseRng.nextInt(0, 256);
             data[i] = val;
             data[i + 1] = val;
             data[i + 2] = val;
             data[i + 3] = 8;
         }
         // …
     }

     private reset() {
         this.cameraX = 0;
+        this.rootRng = new Random(this.seed);
+        this.initNoise(); // re-bake noise pattern with new seed
         this.layers = [ /* … */ ];
-        this.generator = new CityGenerator(this.seed, this.layers.length, this.treeConfig);
+        this.generator = new CityGenerator(this.rootRng.fork('city'), this.layers.length, this.treeConfig);
+        this.sky = new SkySystem(this.canvas, this.rootRng.fork('sky'));
     }
 }
```

`CityGenerator` constructor signature changes from `(seed: number | string, layerCount, config?)` to `(rng: Random, layerCount, config?)`. `BiomeSystem` similarly takes a `Random`. `SkySystem` takes a `Random` as second parameter. Downstream `Building`, `Tree`, `Landscape` each gain an `rng: Random` constructor parameter forked from `CityGenerator.rng` at spawn site.

## Acceptance criteria

Add the following to `tests/Random.test.ts`:

```ts
describe('Random.fork()', () => {
    it('produces identical child streams for the same parent state + label', () => {
        const p1 = new Random('skyline');
        const p2 = new Random('skyline');
        const c1 = p1.fork('noise');
        const c2 = p2.fork('noise');
        const seqA = Array.from({ length: 20 }, () => c1.nextFloat());
        const seqB = Array.from({ length: 20 }, () => c2.nextFloat());
        expect(seqA).toEqual(seqB);
    });

    it('produces independent streams for different labels', () => {
        const p = new Random('skyline');
        const noise = p.fork('noise');
        const biome = p.fork('biome');
        const seqN = Array.from({ length: 20 }, () => noise.nextFloat());
        const seqB = Array.from({ length: 20 }, () => biome.nextFloat());
        expect(seqN).not.toEqual(seqB);
    });

    it('does not advance the parent stream when forking', () => {
        const p = new Random('skyline');
        const before = p.nextFloat();
        const p2 = new Random('skyline');
        p2.fork('noise'); // should not consume entropy
        p2.fork('biome');
        const after = p2.nextFloat();
        expect(after).toEqual(before);
    });

    it('child stream is independent of subsequent parent draws', () => {
        const p1 = new Random('skyline');
        const c1 = p1.fork('noise');
        const seq1 = Array.from({ length: 10 }, () => c1.nextFloat());

        const p2 = new Random('skyline');
        const c2 = p2.fork('noise');
        for (let i = 0; i < 50; i++) p2.nextFloat(); // perturb parent after fork
        const seq2 = Array.from({ length: 10 }, () => c2.nextFloat());

        expect(seq1).toEqual(seq2);
    });
});

describe('Random.nextInt() edge cases', () => {
    it('returns min when min === max', () => {
        const rng = new Random(1);
        expect(rng.nextInt(5, 5)).toBe(5);
        expect(rng.nextInt(0, 0)).toBe(0);
    });

    it('throws when min > max', () => {
        const rng = new Random(1);
        expect(() => rng.nextInt(10, 5)).toThrow(RangeError);
    });
});
```

Additionally, add an **end-to-end determinism test** (new file `tests/Determinism.test.ts`) that:

1. Constructs two `CityGenerator` instances with the same forked `Random`,
2. Calls `generate()` with identical layer/camera/viewport args,
3. Asserts that the resulting `layer.entities` arrays have equal `x`, `width`, type, and (for buildings) `material`, `roofType`, `baseColor`.

This protects the contract end-to-end and will catch any future regression that adds a stray `Math.random()`.

## Risks

None expected. The change is:

- **Additive** for `Random` (new `fork` method; guarded `nextInt` only adds a branch on the zero-range edge case).
- **Mechanical replacement** at call sites — every `Math.random()` becomes `rng.nextFloat()` with no behavior change beyond determinism.
- **Backwards-compatible at the user level** — same input seed string produces a fully deterministic (and *new*, since stream layout changed) scene. Old saved seeds will produce different scenes than before, but they were never reproducible in the first place, so users have no expectation to violate.

One subtlety: if any subsystem currently relies on `Math.random()` for *visual variety on reload with same seed* (it shouldn't, that's the bug), that variety disappears. Reviewed call sites — all are procgen, none are intentional non-determinism.

## See also

- [[entities/Random]] — the PRNG class itself
- [[concepts/determinism]] — overall determinism contract for the procgen pipeline
