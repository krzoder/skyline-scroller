import type { BiomeDefinition } from './types';

export const forest: BiomeDefinition = {
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
    duration: { min: 3000, max: 8000 },
};
