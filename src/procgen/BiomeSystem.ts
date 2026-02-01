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

    constructor(seed: number | string) {
        this.rng = new Random(seed);
        // Start random
        const allBiomes: BiomeType[] = ['forest', 'desert', 'tundra', 'plains', 'city'];
        this.currentBiome = allBiomes[this.rng.nextInt(0, allBiomes.length)];
        this.durationRemaining = this.rng.nextInt(3000, 8000); // Pixels
        console.log(`Initial Biome: ${this.currentBiome}`);
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
        this.durationRemaining = this.rng.nextInt(3000, 8000); // Random duration
        console.log(`Biome switched to: ${this.currentBiome}`);
    }

    public getCurrentBiome(): BiomeType {
        return this.currentBiome;
    }
}
