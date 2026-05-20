import { describe, it, expect } from 'vitest';
import { REGIONS, ALL_BIOMES, getRegion } from '../src/regions/_index';
import type { BiomeType } from '../src/procgen/BiomeSystem';

describe('regions registry', () => {
    it('contains all 5 biomes', () => {
        expect(ALL_BIOMES.sort()).toEqual(['city', 'desert', 'forest', 'plains', 'tundra']);
    });

    it('every region.id matches its key', () => {
        for (const [key, def] of Object.entries(REGIONS)) {
            expect(def.id).toBe(key);
        }
    });

    it('every transitionsTo entry points to a known biome', () => {
        for (const def of Object.values(REGIONS)) {
            for (const target of def.transitionsTo) {
                expect(ALL_BIOMES).toContain(target);
            }
        }
    });

    it('transitions are symmetric where they should be', () => {
        // forest <-> tundra
        expect(getRegion('forest').transitionsTo).toContain('tundra');
        expect(getRegion('tundra').transitionsTo).toContain('forest');
        // plains <-> city
        expect(getRegion('plains').transitionsTo).toContain('city');
        expect(getRegion('city').transitionsTo).toContain('plains');
    });

    it('every region declares at least one tree species', () => {
        for (const def of Object.values(REGIONS)) {
            expect(def.trees.length).toBeGreaterThan(0);
        }
    });

    it('getRegion returns the same instance as the registry', () => {
        const allTypes: BiomeType[] = ['forest', 'desert', 'tundra', 'plains', 'city'];
        for (const t of allTypes) {
            expect(getRegion(t)).toBe(REGIONS[t]);
        }
    });
});
