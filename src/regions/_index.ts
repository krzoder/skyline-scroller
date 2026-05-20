/**
 * Biome registry. Each region is a declarative BiomeDefinition. To add a
 * new biome, extend the BiomeType union in `procgen/BiomeSystem.ts` and
 * add an entry to REGIONS below - no engine changes needed.
 */

import type { BiomeType } from '../procgen/BiomeSystem';
import type { TreeType } from '../procgen/entities/Tree';
import type { BuildingMaterial, RoofType } from '../procgen/entities/Building';
import type { GroundType } from '../procgen/entities/Ground';

export interface BiomeDefinition {
    id: BiomeType;
    label: string;
    transitionsTo: BiomeType[];
    backgroundGround: GroundType;
    trees: TreeType[];
    materials: BuildingMaterial[];
    roofs: RoofType[];
    paletteHue: { min: number; max: number } | null;
    paletteSaturation: number;
    paletteLightness: number;
    duration: { min: number; max: number };
}

const DEFAULT_DURATION = { min: 3000, max: 8000 };

export const REGIONS: Record<BiomeType, BiomeDefinition> = {
    forest: {
        id: 'forest',
        label: 'Forest',
        transitionsTo: ['tundra', 'plains'],
        backgroundGround: 'grass',
        trees: ['sequoia', 'pine', 'oak', 'bush'],
        materials: ['wood', 'stone'],
        roofs: ['gabled'],
        paletteHue: { min: 90, max: 150 },
        paletteSaturation: 50,
        paletteLightness: 50,
        duration: DEFAULT_DURATION,
    },
    desert: {
        id: 'desert',
        label: 'Desert',
        transitionsTo: ['plains', 'city'],
        backgroundGround: 'dirt',
        trees: ['cactus'],
        materials: ['stone', 'plaster'],
        roofs: ['flat', 'dome'],
        paletteHue: { min: 30, max: 60 },
        paletteSaturation: 40,
        paletteLightness: 70,
        duration: DEFAULT_DURATION,
    },
    tundra: {
        id: 'tundra',
        label: 'Tundra',
        transitionsTo: ['forest', 'plains'],
        backgroundGround: 'dirt',
        trees: ['pine'],
        materials: ['stone'],
        roofs: ['gabled'],
        paletteHue: { min: 180, max: 240 },
        paletteSaturation: 30,
        paletteLightness: 80,
        duration: DEFAULT_DURATION,
    },
    plains: {
        id: 'plains',
        label: 'Plains',
        transitionsTo: ['forest', 'desert', 'city'],
        backgroundGround: 'dirt',
        trees: ['oak', 'bush', 'hedge'],
        materials: ['brick', 'stone'],
        roofs: ['flat', 'crenelated'],
        paletteHue: null,
        paletteSaturation: 50,
        paletteLightness: 50,
        duration: DEFAULT_DURATION,
    },
    city: {
        id: 'city',
        label: 'City',
        transitionsTo: ['plains', 'desert'],
        backgroundGround: 'pavement',
        trees: ['hedge'],
        materials: ['brick', 'stone'],
        roofs: ['flat', 'crenelated'],
        paletteHue: null,
        paletteSaturation: 50,
        paletteLightness: 50,
        duration: DEFAULT_DURATION,
    },
};

export const ALL_BIOMES: BiomeType[] = Object.keys(REGIONS) as BiomeType[];

export function getRegion(biome: BiomeType): BiomeDefinition {
    return REGIONS[biome];
}
