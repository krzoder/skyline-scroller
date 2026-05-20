import { Random } from '../utils/Random';
import { REGIONS, ALL_BIOMES } from '../regions/_index';
import { BIOME_DURATION_MIN, BIOME_DURATION_MAX } from '../config';

export type BiomeType = 'forest' | 'desert' | 'tundra' | 'plains' | 'city';

export class BiomeSystem {
    private rng: Random;
    private currentBiome: BiomeType;
    private durationRemaining: number;

    constructor(rng: Random) {
        this.rng = rng;
        this.currentBiome = ALL_BIOMES[this.rng.nextInt(0, ALL_BIOMES.length)];
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
