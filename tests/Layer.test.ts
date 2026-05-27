import { describe, it, expect, vi } from 'vitest';
import { Layer } from '../src/engine/Layer';
import type { Renderable } from '../src/engine/Renderable';

function makeObj(x: number, width: number): Renderable {
    return {
        x,
        y: 0,
        width,
        height: 100,
        draw: vi.fn(),
    } as Renderable;
}

describe('Layer.prune', () => {
    it('removes objects whose right edge is behind cameraX - buffer', () => {
        const layer = new Layer(1.0, 0); // speedModifier = 1
        layer.add(makeObj(100, 50));   // right edge = 150
        layer.add(makeObj(500, 50));   // right edge = 550
        layer.prune(2200, 2000);        // cutoff at 200
        // first object's right edge (150) < cutoff (200) -> pruned
        expect(layer.objects.length).toBe(1);
        expect(layer.objects[0].x).toBe(500);
    });

    it('retains an object whose right edge sits exactly at the cutoff', () => {
        const layer = new Layer(1.0, 0);
        layer.add(makeObj(50, 50));   // right edge at 100
        layer.prune(2100, 2000);       // cutoff at 100
        // filter uses > not >=; 100 > 100 is false -> pruned
        expect(layer.objects.length).toBe(0);
    });

    it('keeps every object when buffer dwarfs cameraX', () => {
        const layer = new Layer(1.0, 0);
        layer.add(makeObj(0, 10));
        layer.add(makeObj(10, 10));
        layer.add(makeObj(20, 10));
        layer.prune(500, 5000);
        expect(layer.objects.length).toBe(3);
    });

    it('speedModifier scales layerViewX', () => {
        const layer = new Layer(0.5, 0); // half-speed parallax
        layer.add(makeObj(0, 50));    // right edge = 50
        // layerViewX = cameraX * 0.5 = 1000. cutoff = 1000 - 100 = 900.
        // object's right edge (50) < cutoff (900) -> pruned
        layer.prune(2000, 100);
        expect(layer.objects.length).toBe(0);
    });
});
