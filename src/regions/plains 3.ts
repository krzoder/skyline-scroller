import type { BiomeDefinition } from './types';

export const plains: BiomeDefinition = {
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
    duration: { min: 3000, max: 8000 },
};
