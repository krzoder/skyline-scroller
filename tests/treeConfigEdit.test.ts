import { describe, it, expect } from 'vitest';
import { DEFAULT_TREE_CONFIG, parseTreeTokens, validateTreeItem, type TreeConfigItem } from '../src/procgen/TreeConfig';

const pine = (): TreeConfigItem => ({ ...DEFAULT_TREE_CONFIG.pine, biomes: [...DEFAULT_TREE_CONFIG.pine.biomes] });

describe('validateTreeItem', () => {
    it('accepts every default entry', () => {
        for (const item of Object.values(DEFAULT_TREE_CONFIG)) expect(validateTreeItem(item)).toBeNull();
    });

    it('rejects inverted, non-positive and non-integer heights', () => {
        expect(validateTreeItem({ ...pine(), minHeight: 300, maxHeight: 200 })).toMatch(/cannot exceed/);
        expect(validateTreeItem({ ...pine(), minHeight: 0 })).toMatch(/at least 1/);
        expect(validateTreeItem({ ...pine(), minHeight: 1.5 })).toMatch(/whole numbers/);
        expect(validateTreeItem({ ...pine(), minHeight: NaN })).toMatch(/whole numbers/);
    });

    it('rejects out-of-range flowerChance and empty biomes', () => {
        expect(validateTreeItem({ ...pine(), flowerChance: 1.5 })).toMatch(/between 0 and 1/);
        expect(validateTreeItem({ ...pine(), flowerChance: -0.1 })).toMatch(/between 0 and 1/);
        expect(validateTreeItem({ ...pine(), biomes: [] })).toMatch(/biomes/);
    });
});

describe('parseTreeTokens (terminal `generate` syntax)', () => {
    it('parses every supported token into a patch', () => {
        const { patch, summary, errors } = parseTreeTokens([
            'false', 'minHeight:50', 'maxHeight:150', 'flowerChance:0.25', 'biomes:forest,desert'
        ]);
        expect(errors).toEqual([]);
        expect(patch).toEqual({
            enabled: false, minHeight: 50, maxHeight: 150, flowerChance: 0.25, biomes: ['forest', 'desert']
        });
        expect(summary).toEqual([
            'enabled:false', 'minHeight:50', 'maxHeight:150', 'flowerChance:0.25', 'biomes:forest,desert'
        ]);
    });

    it('reports one error per bad token instead of silently applying anything', () => {
        const { errors } = parseTreeTokens([
            'minHeight:abc', 'flowerChance:x', 'biomes:forest,mars', 'colour:red', 'wat', 'maxHeight:'
        ]);
        expect(errors).toHaveLength(6);
        expect(errors[0]).toMatch(/minHeight/);
        expect(errors[2]).toMatch(/mars/);
        expect(errors[3]).toMatch(/Unknown configuration key/);
        expect(errors[4]).toMatch(/Unknown token/);
        expect(errors[5]).toMatch(/Missing value/);
    });

    it('is case-insensitive for true/false and biome names, strict for keys', () => {
        expect(parseTreeTokens(['TRUE']).patch.enabled).toBe(true);
        expect(parseTreeTokens(['biomes:Forest']).patch.biomes).toEqual(['forest']);
        expect(parseTreeTokens(['MinHeight:5']).errors).toHaveLength(1);
    });
});