/**
 * Tunable constants centralized in one place. Numbers that affect visual
 * output (and therefore the determinism contract) live here so they can
 * be reviewed/changed in one diff instead of scattered across files.
 *
 * Adding a knob: declare an `export const`, import it where it's used,
 * delete the local literal. Determinism is preserved as long as the
 * numeric value stays the same.
 */

// Animation and timing
export const BIOME_DURATION_MIN = 3000;  // pixels of travel before earliest biome switch
export const BIOME_DURATION_MAX = 8000;  // pixels of travel before latest biome switch
export const CAMERA_SPEED_PX_PER_S = 100;

// Procedural generation
export const FEATURE_HEIGHT_MIN = 100;  // building / landscape base height range
export const FEATURE_HEIGHT_MAX = 300;
export const FILLER_WIDTH_MIN = 20;     // when no feature placed, leave a gap of this width
export const FILLER_WIDTH_MAX = 100;

// Rendering
export const LAYER_PRUNE_BUFFER = 2000; // pixels behind camera before entities are pruned
export const GROUND_HEIGHT_PX = 80;     // logical pixels from canvas bottom reserved for ground
