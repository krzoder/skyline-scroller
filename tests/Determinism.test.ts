/**
 * Determinism integration test.
 *
 * Acceptance criterion for DEC-01: same seed -> same RNG stream
 * across all procgen sub-systems. Two BiomeSystems forked the same way
 * must produce identical biome sequences.
 */

import { describe, it, expect } from 'vitest';
import { Random } from '../src/utils/Random';
import { BiomeSystem } from '../src/procgen/BiomeSystem';

describe('Determinism contract', () => {
    it('two BiomeSystems with the same forked stream produce identical biome sequences', () => {
        const rootA = new Random('test-seed-42');
        const rootB = new Random('test-seed-42');

        const a = new BiomeSystem(rootA.fork('biome'), 'test-seed-42');
        const b = new BiomeSystem(rootB.fork('biome'), 'test-seed-42');

        const seqA: string[] = [a.getCurrentBiome()];
        const seqB: string[] = [b.getCurrentBiome()];

        // Drive through 50 large dx steps. With duration in [3000,8000) px,
        // 50 * 1000 = 50000 px is enough to trigger several transitions.
        for (let i = 0; i < 50; i++) {
            seqA.push(a.update(1000));
            seqB.push(b.update(1000));
        }

        expect(seqA).toEqual(seqB);
    });

    it('Random.fork with different labels yields independent biome sequences', () => {
        const root = new Random('shared-seed');
        const a = new BiomeSystem(root.fork('biome'), 'shared-seed');
        // Same seed - initial biome from seed-hash matches; fork-label difference
        // causes the rng streams (and therefore the transitions) to diverge.
        const b = new BiomeSystem(root.fork('different-label'), 'shared-seed');

        const seqA: string[] = [];
        const seqB: string[] = [];
        for (let i = 0; i < 30; i++) {
            seqA.push(a.update(500));
            seqB.push(b.update(500));
        }

        // Streams must diverge somewhere — guard against the previously
        // confirmed bug where city RNG and biome RNG had identical sequences.
        expect(seqA).not.toEqual(seqB);
    });

    it('initial biome comes from seed string, not from rng draw (#51)', () => {
        // Different fork labels (=> different rng streams) but same seed string
        // must yield the same initial biome, because the seed-hash determines
        // it directly and the rng is only spent for parity / subsequent draws.
        const root = new Random('any-source');
        const a = new BiomeSystem(root.fork('A'), 'forest-seed');
        const b = new BiomeSystem(root.fork('B'), 'forest-seed');
        expect(a.getCurrentBiome()).toBe(b.getCurrentBiome());
    });

    it('different seed strings produce varied initial biomes', () => {
        const seeds = ['forest', 'desert', 'tundra', 'plains', 'city', 'xyz', 'abc', '42'];
        const initials = seeds.map(s => new BiomeSystem(new Random(s).fork('biome'), s).getCurrentBiome());
        const unique = new Set(initials);
        // Statistical sanity: at least 2 distinct biomes across 8 seeds.
        expect(unique.size).toBeGreaterThan(1);
    });

    it('forceBiome respects determinism — switchBiome still uses the seeded RNG', () => {
        const root = new Random('forced');
        const a = new BiomeSystem(root.fork('biome'), 'forced');
        const b = new BiomeSystem(root.fork('biome'), 'forced');

        a.forceBiome('forest');
        b.forceBiome('forest');

        // Drive both past duration and confirm same next biome.
        let nextA = '';
        let nextB = '';
        for (let i = 0; i < 20; i++) {
            nextA = a.update(1000);
            nextB = b.update(1000);
        }
        expect(nextA).toBe(nextB);
    });
});
