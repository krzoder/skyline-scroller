import { Random } from '../utils/Random';
import { REGIONS, ALL_BIOMES } from '../regions/_index';
import { BIOME_DURATION_MIN, BIOME_DURATION_MAX } from '../config';

export type BiomeType = 'forest' | 'desert' | 'tundra' | 'plains' | 'city';

// Initial-biome index derived from the seed string (#51) so it stays
// stable across fork-order churn upstream.
function pickInitialBiomeIndex(seed: string | number): number {
    const s = typeof seed === 'string' ? seed : seed.toString();
    let acc = 0;
    for (let i = 0; i < s.length; i++) acc = (acc + s.charCodeAt(i)) >>> 0;
    return acc % ALL_BIOMES.length;
}

export class BiomeSystem {
    private rng: Random;
    private currentBiome: BiomeType;
    private durationRemaining: number;

    constructor(rng: Random, seed: string | number) {
        this.rng = rng;
        // Discard the original nextInt that the pre-fix code spent picking
        // the initial biome - the seed hash replaces it but the rng stream
        // must advance the same number of steps or downstream determinism
        // shifts.
        this.rng.nextInt(0, ALL_BIOMES.length);
        this.currentBiome = ALL_BIOMES[pickInitialBiomeIndex(seed)];
        this.durationRemaining = this.rng.nextInt(BIOME_DURATION_MIN, BIOME_DURATION_MAX);
    }

    public update(dx: number): BiomeType {
        this.durationRemaining -= dx;
        if (this.durationRemaining <= 0) {
            this.switchBiome();
        }
        return this.currentBiome;
    }

    private switchBiome() {
        const options = REGIONS[this.currentBiome].transitionsTo;
        this.currentBiome = options[this.rng.nextInt(0, options.length)];
        this.durationRemaining = this.rng.nextInt(BIOME_DURATION_MIN, BIOME_DURATION_MAX);
    }

    public getCurrentBiome(): BiomeType {
        return this.currentBiome;
    }

    public forceBiome(b: BiomeType) {
        this.currentBiome = b;
        this.durationRemaining = BIOME_DURATION_MAX;
    }
}
