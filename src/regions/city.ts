import type { BiomeDefinition } from './types';

export const city: BiomeDefinition = {
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
    duration: { min: 3000, max: 8000 },
};
