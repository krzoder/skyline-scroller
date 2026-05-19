import type { BiomeDefinition } from './types';

export const desert: BiomeDefinition = {
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
    duration: { min: 3000, max: 8000 },
};
