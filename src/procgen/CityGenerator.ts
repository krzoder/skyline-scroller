import { Building, type BuildingMaterial, type RoofType } from '../engine/Building';
import { Layer } from '../engine/Layer';
import { Random } from '../utils/Random';
import { Tree, type TreeType } from '../engine/Tree';
import { BiomeSystem, type BiomeType } from './BiomeSystem';
import { Ground, type GroundType } from '../engine/Ground';
import { Landscape } from '../engine/Landscape';
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
    public config: TreeConfig; // Instance config

    constructor(seed: number | string, layerCount: number, config?: TreeConfig) {
        this.rng = new Random(seed);
        this.lastX = new Array(layerCount).fill(0);
        this.biomeSystem = new BiomeSystem(seed);

        // Load config (passed or default)
        if (config) {
            this.config = JSON.parse(JSON.stringify(config));
        } else {
            this.config = JSON.parse(JSON.stringify(DEFAULT_TREE_CONFIG));
        }

        // Generate DNA
        this.dna = {
            density: this.rng.nextRange(0.4, 0.9),
            greenery: this.rng.nextRange(0.1, 0.8),
            buildingHeight: this.rng.nextRange(0.8, 1.2)
        };

        console.log("City DNA:", this.dna);
    }

    public generate(layers: Layer[], cameraX: number, viewportWidth: number) {
        // Update Biome (Background driven)
        // We assume the background layer (index 0) drives the biome?
        // Or just global camera movement.
        const currentBiome = this.biomeSystem.update(1); // Simple tick, or pass actual delta if stored

        layers.forEach((layer, index) => {
            const limitX = (cameraX * layer.speedModifier) + viewportWidth + 500;

            while (this.lastX[index] < limitX) {
                this.addChunk(layer, index, currentBiome);
            }
        });
    }

    private addChunk(layer: Layer, layerIndex: number, biome: BiomeType) {
        // A "Chunk" is a segment of ground + feature (Building OR Tree OR Empty)
        const x = this.lastX[layerIndex];
        let chunkWidth = 0;

        // 1. Determine Ground Type
        // Foreground (last layer) gets diverse ground. Backgrounds simplify.
        let groundType: GroundType = 'grass';
        if (layerIndex === 3) { // Front
            // Logic to transition?
            // If previous was Water and now Not Water -> Shore?
            // If previous was Not Water and now Water -> Shore?
            // We need state per layer.

            const r = this.rng.nextFloat();
            // Simple random clumps
            if (r < 0.6) groundType = 'pavement';
            else if (r < 0.8) groundType = 'grass';
            else groundType = 'water';

            // NOTE: Ideally we check `layer.lastGroundType` or similar if we wanted logical continuity.
            // For now, let's keep it random but maybe add 'sand' if we can.
            // Actually, let's stick to simple types for PoC, maybe 'dirt' acts as shore?
        } else {
            // Background biomes
            if (biome === 'desert') groundType = 'dirt'; // Sand-ish
            else if (biome === 'forest') groundType = 'grass';
            else if (biome === 'city') groundType = 'pavement';
            else groundType = 'dirt'; // Default
        }

        // 2. Determine Feature
        let feature: 'building' | 'tree' | 'landscape' | 'none' = 'none';

        if (layerIndex <= 1) {
            // Background Layers: Mostly Landscapes
            // Using noise or Random for continuity could be better but random chunks work for PoC
            feature = 'landscape';
        } else {
            // Foreground
            if (groundType !== 'water') {
                const roll = this.rng.nextFloat();
                if (roll < this.dna.density) {
                    feature = 'building';
                } else if (this.rng.nextFloat() < this.dna.greenery) {
                    feature = 'tree';
                }
            }
        }

        // 3. Generate Objects
        let featureWidth = 0;
        let obj: any = null;

        if (feature === 'landscape') {
            featureWidth = this.rng.nextInt(200, 500);
            const h = this.rng.nextInt(100, 300);
            obj = new Landscape(x, featureWidth, h, biome);

        } else if (feature === 'building') {
            const minW = 60;
            const maxW = 120 + (layerIndex * 20);
            featureWidth = this.rng.nextInt(minW, maxW);
            const h = this.rng.nextInt(100, 300) * this.dna.buildingHeight;

            const mat = this.pickMaterial(biome);
            const roof = this.pickRoof(biome);
            const color = this.pickColor(biome);

            obj = new Building(x, featureWidth, h, mat, roof, color.base, color.roof);

        } else if (feature === 'tree') {
            // Pick tree type based on Biome and Config
            const treeType = this.pickTreeType(biome);
            if (treeType) {
                const config = this.config[treeType];
                const height = this.rng.nextInt(config.minHeight, config.maxHeight);
                const flowerChance = config.flowerChance;

                obj = new Tree(x, treeType, height, flowerChance);
                featureWidth = obj.width + this.rng.nextInt(10, 30); // Breathing room
            } else {
                // No valid tree for this biome? Treat as empty
                obj = null;
                featureWidth = this.rng.nextInt(20, 100);
            }
        } else {
            // Empty / Gap
            featureWidth = this.rng.nextInt(20, 100);
        }

        // Enforce water width if water
        if (groundType === 'water') {
            featureWidth = Math.max(featureWidth, 100); // Minimum river width
            obj = null; // No object on water
        }

        chunkWidth = featureWidth;

        // Add Ground
        const ground = new Ground(x, chunkWidth, groundType);
        layer.add(ground);

        // Add Feature (if any)
        if (obj) {
            layer.add(obj);
        }

        this.lastX[layerIndex] += chunkWidth - 1; // Overlap by 1px
    }

    private pickTreeType(biome: BiomeType): TreeType | null {
        // Filter enabled trees for this biome
        const availableTypes: TreeType[] = [];

        for (const type of Object.keys(this.config) as TreeType[]) {
            const config = this.config[type];
            if (config.enabled && config.biomes.includes(biome)) {
                availableTypes.push(type);
            }
        }

        if (availableTypes.length === 0) return null;

        // Weighting? For now uniform random from available
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
        // HSL gen
        let h = this.rng.nextInt(0, 360);
        let s = 50;
        let l = 50;

        // Biome influence
        if (biome === 'desert') {
            h = this.rng.nextInt(30, 60); // Orange/Yellow
            s = 40;
            l = 70;
        } else if (biome === 'tundra') {
            h = this.rng.nextInt(180, 240); // Cyan/Blue
            s = 30;
            l = 80;
        } else if (biome === 'forest') {
            h = this.rng.nextInt(90, 150); // Green-ish
        }

        return { base: `hsl(${h}, ${s}%, ${l}%)`, roof: `hsl(${h}, ${s}%, ${l - 20}%)` };
    }
}
