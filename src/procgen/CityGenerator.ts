import { deepClone } from '../utils/deepClone';
import { Building, type BuildingMaterial, type RoofType } from './entities/Building';
import { Layer } from '../engine/Layer';
import { Random } from '../utils/Random';
import { Tree, type TreeType } from './entities/Tree';
import { BiomeSystem, type BiomeType } from './BiomeSystem';
import { Ground, type GroundType } from './entities/Ground';
import { Landscape } from './entities/Landscape';
import { DEFAULT_TREE_CONFIG, type TreeConfig } from './TreeConfig';

interface CityDNA {
    density: number;    // 0.1 (sparse) to 1.0 (packed)
    greenery: number;   // 0.0 to 1.0 (tree frequency)
    buildingHeight: number; // Scale
}

export class CityGenerator {
    private rng: Random;
    private lastX: number[];
    private biomeSystem: BiomeSystem;
    private dna: CityDNA;
    public config: TreeConfig;

    constructor(seed: number | string, layerCount: number, config?: TreeConfig, rng?: Random) {
        // Caller can pass a forked stream; otherwise we mint a root for backward compat.
        const root = rng ?? new Random(seed);
        this.rng = root;
        this.lastX = new Array(layerCount).fill(0);
        // BiomeSystem gets its own forked sub-stream so its draws don't correlate with city geometry.
        this.biomeSystem = new BiomeSystem(root.fork('biome'));

        if (config) {
            this.config = deepClone(config);
        } else {
            this.config = deepClone(DEFAULT_TREE_CONFIG);
        }

        this.dna = {
            density: this.rng.nextRange(0.4, 0.9),
            greenery: this.rng.nextRange(0.1, 0.8),
            buildingHeight: this.rng.nextRange(0.8, 1.2)
        };
    }

    public generate(layers: Layer[], cameraX: number, viewportWidth: number, dx: number = 1) {
        // dx is camera-pixel delta this frame (real pixels of travel).
        const currentBiome = this.biomeSystem.update(dx);

        layers.forEach((layer, index) => {
            const limitX = (cameraX * layer.speedModifier) + viewportWidth + 500;

            while (this.lastX[index] < limitX) {
                this.addChunk(layer, index, currentBiome);
            }
        });
    }

    public forceBiome(b: BiomeType) {
        this.biomeSystem.forceBiome(b);
    }

    public getCurrentBiome(): BiomeType {
        return this.biomeSystem.getCurrentBiome();
    }

    private addChunk(layer: Layer, layerIndex: number, biome: BiomeType) {
        const x = this.lastX[layerIndex];
        let chunkWidth = 0;

        let groundType: GroundType = 'grass';
        if (layerIndex === 3) {
            const r = this.rng.nextFloat();
            if (r < 0.6) groundType = 'pavement';
            else if (r < 0.8) groundType = 'grass';
            else groundType = 'water';
        } else {
            if (biome === 'desert') groundType = 'dirt';
            else if (biome === 'forest') groundType = 'grass';
            else if (biome === 'city') groundType = 'pavement';
            else groundType = 'dirt';
        }

        let feature: 'building' | 'tree' | 'landscape' | 'none' = 'none';

        if (layerIndex <= 1) {
            feature = 'landscape';
        } else {
            if (groundType !== 'water') {
                const roll = this.rng.nextFloat();
                if (roll < this.dna.density) {
                    feature = 'building';
                } else if (this.rng.nextFloat() < this.dna.greenery) {
                    feature = 'tree';
                }
            }
        }

        let featureWidth = 0;
        let obj: any = null;

        if (feature === 'landscape') {
            featureWidth = this.rng.nextInt(200, 500);
            const h = this.rng.nextInt(100, 300);
            obj = new Landscape(x, featureWidth, h, biome, this.rng);

        } else if (feature === 'building') {
            const minW = 60;
            const maxW = 120 + (layerIndex * 20);
            featureWidth = this.rng.nextInt(minW, maxW);
            const h = this.rng.nextInt(100, 300) * this.dna.buildingHeight;

            const mat = this.pickMaterial(biome);
            const roof = this.pickRoof(biome);
            const color = this.pickColor(biome);

            obj = new Building(x, featureWidth, h, mat, roof, color.base, color.roof, this.rng);

        } else if (feature === 'tree') {
            const treeType = this.pickTreeType(biome);
            if (treeType) {
                const config = this.config[treeType];
                const height = this.rng.nextInt(config.minHeight, config.maxHeight);
                const flowerChance = config.flowerChance;

                obj = new Tree(x, treeType, height, flowerChance, this.rng);
                featureWidth = obj.width + this.rng.nextInt(10, 30);
            } else {
                obj = null;
                featureWidth = this.rng.nextInt(20, 100);
            }
        } else {
            featureWidth = this.rng.nextInt(20, 100);
        }

        if (groundType === 'water') {
            featureWidth = Math.max(featureWidth, 100);
            obj = null;
        }

        chunkWidth = featureWidth;

        const ground = new Ground(x, chunkWidth, groundType);
        layer.add(ground);

        if (obj) {
            layer.add(obj);
        }

        this.lastX[layerIndex] += chunkWidth - 1; // Overlap by 1px to hide seams
    }

    private pickTreeType(biome: BiomeType): TreeType | null {
        const availableTypes: TreeType[] = [];

        for (const type of Object.keys(this.config) as TreeType[]) {
            const config = this.config[type];
            if (config.enabled && config.biomes.includes(biome)) {
                availableTypes.push(type);
            }
        }

        if (availableTypes.length === 0) return null;

        return availableTypes[this.rng.nextInt(0, availableTypes.length)];
    }

    private pickMaterial(biome: BiomeType): BuildingMaterial {
        const r = this.rng.nextFloat();
        if (biome === 'desert') return r > 0.5 ? 'stone' : 'plaster';
        if (biome === 'forest') return r > 0.5 ? 'wood' : 'stone';
        if (biome === 'city') return r > 0.3 ? 'brick' : 'stone';
        return 'brick';
    }

    private pickRoof(biome: BiomeType): RoofType {
        const r = this.rng.nextFloat();
        if (biome === 'desert') return r > 0.4 ? 'flat' : 'dome';
        if (biome === 'tundra') return 'gabled'; // Shed snow
        if (biome === 'forest') return 'gabled';
        return r > 0.5 ? 'flat' : 'crenelated';
    }

    private pickColor(biome: BiomeType): { base: string, roof: string } {
        let h = this.rng.nextInt(0, 360);
        let s = 50;
        let l = 50;

        if (biome === 'desert') {
            h = this.rng.nextInt(30, 60);
            s = 40;
            l = 70;
        } else if (biome === 'tundra') {
            h = this.rng.nextInt(180, 240);
            s = 30;
            l = 80;
        } else if (biome === 'forest') {
            h = this.rng.nextInt(90, 150);
        }

        return { base: `hsl(${h}, ${s}%, ${l}%)`, roof: `hsl(${h}, ${s}%, ${l - 20}%)` };
    }
}
