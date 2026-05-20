/**
 * Biome registry. Each `Region` is a declarative `BiomeDefinition`.
 * To add a new biome:
 *   1. Add `MyBiome` to the `BiomeType` union in `procgen/BiomeSystem.ts`.
 *   2. Create `src/regions/myBiome.ts` exporting a `BiomeDefinition`.
 *   3. Import and add it to `REGIONS` below.
 * No other engine code needs to change.
 */

import type { BiomeType } from '../procgen/BiomeSystem';
import type { BiomeDefinition } from './types';
import { forest } from './forest';
import { desert } from './desert';
import { tundra } from './tundra';
import { plains } from './plains';
import { city } from './city';

export const REGIONS: Record<BiomeType, BiomeDefinition> = {
    forest,
    desert,
    tundra,
    plains,
    city,
};

export const ALL_BIOMES: BiomeType[] = Object.keys(REGIONS) as BiomeType[];

export function getRegion(biome: BiomeType): BiomeDefinition {
    return REGIONS[biome];
}
