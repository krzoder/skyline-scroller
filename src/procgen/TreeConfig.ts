import type { TreeType } from './entities/Tree';
import type { BiomeType } from './BiomeSystem';
import { ALL_BIOMES } from '../regions/_index';

export interface TreeConfigItem {
    enabled: boolean;
    biomes: BiomeType[];
    minHeight: number;
    maxHeight: number;
    flowerChance: number; // 0 to 1; currently only Cactus uses non-zero
}

export type TreeConfig = Record<TreeType, TreeConfigItem>;

export const DEFAULT_TREE_CONFIG: TreeConfig = {
    'sequoia': {
        enabled: true,
        biomes: ['forest'],
        minHeight: 240,
        maxHeight: 340,
        flowerChance: 0
    },
    'pine': {
        enabled: true,
        biomes: ['forest', 'tundra'],
        minHeight: 140,
        maxHeight: 200,
        flowerChance: 0
    },
    'oak': {
        enabled: true,
        biomes: ['forest', 'plains'],
        minHeight: 110,
        maxHeight: 150,
        flowerChance: 0
    },
    'bush': {
        enabled: true,
        biomes: ['forest', 'plains'],
        minHeight: 30,
        maxHeight: 50,
        flowerChance: 0
    },
    'cactus': {
        enabled: true,
        biomes: ['desert'],
        minHeight: 60,
        maxHeight: 100,
        flowerChance: 0.05
    },
    'hedge': {
        enabled: true,
        biomes: ['plains', 'city'],
        minHeight: 30,
        maxHeight: 40,
        flowerChance: 0
    }
};

/** Returns a human-readable problem, or null when the entry is safe to generate from. */
export function validateTreeItem(item: TreeConfigItem): string | null {
    if (!Number.isInteger(item.minHeight) || !Number.isInteger(item.maxHeight)) {
        return 'minHeight and maxHeight must be whole numbers.';
    }
    // A zero-height tree has no canvas to draw into.
    if (item.minHeight < 1) return `minHeight (${item.minHeight}) must be at least 1.`;
    if (item.minHeight > item.maxHeight) {
        return `minHeight (${item.minHeight}) cannot exceed maxHeight (${item.maxHeight}).`;
    }
    if (!Number.isFinite(item.flowerChance) || item.flowerChance < 0 || item.flowerChance > 1) {
        return `flowerChance (${item.flowerChance}) must be between 0 and 1.`;
    }
    if (item.biomes.length === 0) return 'biomes cannot be empty.';
    return null;
}

export interface TreeTokenParse {
    patch: Partial<TreeConfigItem>;
    /** One `key:value` entry per applied token, for echoing back to the user. */
    summary: string[];
    errors: string[];
}

/**
 * Parses the terminal syntax `true | false | minHeight:N | maxHeight:N | flowerChance:F | biomes:a,b`.
 * All-or-nothing: the caller must not apply `patch` when `errors` is non-empty.
 */
export function parseTreeTokens(tokens: string[]): TreeTokenParse {
    const patch: Partial<TreeConfigItem> = {};
    const summary: string[] = [];
    const errors: string[] = [];

    for (const token of tokens) {
        const lower = token.toLowerCase();
        if (lower === 'true' || lower === 'false') {
            patch.enabled = lower === 'true';
            summary.push(`enabled:${lower}`);
            continue;
        }

        const colon = token.indexOf(':');
        if (colon === -1) {
            errors.push(`Unknown token: ${token}. Use key:value syntax (e.g. minHeight:50).`);
            continue;
        }

        const key = token.slice(0, colon);
        const val = token.slice(colon + 1).trim();
        if (val === '') {
            errors.push(`Missing value for ${key}.`);
            continue;
        }

        if (key === 'minHeight' || key === 'maxHeight') {
            const n = Number(val);
            if (!Number.isInteger(n)) {
                errors.push(`Invalid ${key}: '${val}' (expected a whole number).`);
                continue;
            }
            patch[key] = n;
        } else if (key === 'flowerChance') {
            const n = Number(val);
            if (!Number.isFinite(n)) {
                errors.push(`Invalid flowerChance: '${val}' (expected a number between 0 and 1).`);
                continue;
            }
            patch.flowerChance = n;
        } else if (key === 'biomes') {
            const list = val.split(',').map(b => b.trim().toLowerCase()).filter(Boolean);
            const bad = list.filter(b => !(ALL_BIOMES as readonly string[]).includes(b));
            if (bad.length > 0) {
                errors.push(`Unknown biome(s): ${bad.join(', ')}.`);
                continue;
            }
            patch.biomes = list as BiomeType[];
        } else {
            errors.push(`Unknown configuration key: ${key}.`);
            continue;
        }
        summary.push(`${key}:${val}`);
    }

    return { patch, summary, errors };
}