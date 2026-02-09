import type { TreeType } from '../engine/Tree';
import type { BiomeType } from './BiomeSystem';

export interface TreeConfigItem {
    enabled: boolean;
    biomes: BiomeType[]; // Which biomes this tree CAN appear in
    minHeight: number;
    maxHeight: number;
    flowerChance: number; // 0 to 1 (Only used for Cactus currently, but good to have generic)
}

export type TreeConfig = Record<TreeType, TreeConfigItem>;

export const DEFAULT_TREE_CONFIG: TreeConfig = {
    'sequoia': {
        enabled: true,
        biomes: ['forest'],
        minHeight: 240,
        maxHeight: 340,
        flowerChance: 0
    },
    'pine': {
        enabled: true,
        biomes: ['forest', 'tundra'],
        minHeight: 140,
        maxHeight: 200,
        flowerChance: 0
    },
    'oak': {
        enabled: true,
        biomes: ['forest', 'plains'],
        minHeight: 110,
        maxHeight: 150,
        flowerChance: 0
    },
    'bush': {
        enabled: true,
        biomes: ['forest', 'plains'], // Bushes are generic
        minHeight: 30,
        maxHeight: 50,
        flowerChance: 0
    },
    'cactus': {
        enabled: true,
        biomes: ['desert'],
        minHeight: 60,
        maxHeight: 100,
        flowerChance: 0.05
    },
    'hedge': {
        enabled: true,
        biomes: ['plains', 'city'],
        minHeight: 30,
        maxHeight: 40,
        flowerChance: 0
    }
};

// Start with a copy of defaults
export let currentTreeConfig: TreeConfig = JSON.parse(JSON.stringify(DEFAULT_TREE_CONFIG));

export const resetTreeConfigToDefault = (type?: TreeType) => {
    if (type) {
        currentTreeConfig[type] = JSON.parse(JSON.stringify(DEFAULT_TREE_CONFIG[type]));
    } else {
        currentTreeConfig = JSON.parse(JSON.stringify(DEFAULT_TREE_CONFIG));
    }
};
