/**
 * Declarative biome definition. New biomes are added by dropping a file
 * in `src/regions/` and registering it in `_index.ts`. No engine changes
 * required — the data-driven `BiomeSystem` consumes the registry.
 */

import type { BiomeType } from '../procgen/BiomeSystem';
import type { TreeType } from '../engine/Tree';
import type { BuildingMaterial, RoofType } from '../engine/Building';
import type { GroundType } from '../engine/Ground';

export interface BiomeDefinition {
    id: BiomeType;
    label: string;
    /** Biomes reachable from this one (climate adjacency). */
    transitionsTo: BiomeType[];
    /** Default ground type for background layers. */
    backgroundGround: GroundType;
    /** Tree species enabled in this biome. */
    trees: TreeType[];
    /** Allowed building materials, weighted by listing order (head first). */
    materials: BuildingMaterial[];
    /** Allowed roof types. */
    roofs: RoofType[];
    /**
     * HSL ranges for procedural building colour. `null` falls back to engine default.
     */
    paletteHue: { min: number; max: number } | null;
    paletteSaturation: number;
    paletteLightness: number;
    /** In-pixel-of-travel range for how long this biome stays active before switching. */
    duration: { min: number; max: number };
}
