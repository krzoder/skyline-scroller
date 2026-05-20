import type { BiomeDefinition } from './types';

export const tundra: BiomeDefinition = {
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
    duration: { min: 3000, max: 8000 },
};
