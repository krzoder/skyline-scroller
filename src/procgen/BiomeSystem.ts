import { Random } from '../utils/Random';

export type BiomeType = 'forest' | 'desert' | 'tundra' | 'plains' | 'city';

export class BiomeSystem {
    private rng: Random;
    private currentBiome: BiomeType;
    private durationRemaining: number;

    // Adjacency Graph
    private transitions: Record<BiomeType, BiomeType[]> = {
        'tundra': ['forest', 'plains'], // Cold -> Temperate
        'forest': ['tundra', 'plains'],
        'plains': ['forest', 'desert', 'city'],
        'city': ['plains', 'desert'],
        'desert': ['plains', 'city'] // Hot -> Temperate
    };

    constructor(rng: Random) {
        this.rng = rng;
        const allBiomes: BiomeType[] = ['forest', 'desert', 'tundra', 'plains', 'city'];
        this.currentBiome = allBiomes[this.rng.nextInt(0, allBiomes.length)];
        this.durationRemaining = this.rng.nextInt(3000, 8000); // pixels
    }

    public update(dx: number): BiomeType {
        this.durationRemaining -= dx;
        if (this.durationRemaining <= 0) {
            this.switchBiome();
        }
        return this.currentBiome;
    }

    private switchBiome() {
        const options = this.transitions[this.currentBiome];
        this.currentBiome = options[this.rng.nextInt(0, options.length)];
        this.durationRemaining = this.rng.nextInt(3000, 8000);
    }

    public getCurrentBiome(): BiomeType {
        return this.currentBiome;
    }

    public forceBiome(b: BiomeType) {
        this.currentBiome = b;
        this.durationRemaining = 8000;
    }
}
