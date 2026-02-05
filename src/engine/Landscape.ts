import { CityEntity } from './CityEntity';
import type { BiomeType } from '../procgen/BiomeSystem';

export class Landscape extends CityEntity {
    biome: BiomeType;
    points: { x: number, y: number }[];

    constructor(x: number, width: number, height: number, biome: BiomeType) {
        super(x, width, height);
        this.biome = biome;
        this.points = this.generateShape();

        // Pad for decorations (trees on top)
        this.initCache(50);
    }

    private generateShape() {
        const pts = [];
        pts.push({ x: 0, y: 0 });

        if (this.biome === 'forest' || this.biome === 'plains') {
            pts.push({ x: this.width * 0.5, y: -this.height });
            pts.push({ x: this.width, y: 0 });
        } else if (this.biome === 'desert') {
            pts.push({ x: this.width * 0.4, y: -this.height });
            pts.push({ x: this.width, y: 0 });
        } else if (this.biome === 'tundra') {
            const peak = -this.height;
            pts.push({ x: this.width * 0.3, y: peak });
            pts.push({ x: this.width * 0.5, y: peak * 0.5 });
            pts.push({ x: this.width * 0.8, y: peak * 0.9 });
            pts.push({ x: this.width, y: 0 });
        } else {
            // City: Silhouette of distant buildings
            const steps = 5;
            const stepW = this.width / steps;
            for (let i = 0; i < steps; i++) {
                const h = 50 + Math.random() * (this.height - 50);
                pts.push({ x: i * stepW, y: -h });
                pts.push({ x: (i + 1) * stepW, y: -h });
            }
            pts.push({ x: this.width, y: 0 });
        }
        return pts;
    }

    protected drawToCache(ctx: CanvasRenderingContext2D): void {
        // Draw the shape
        // Note: CityEntity translates by padding. 
        // Our shape points are relative to (0,0) baseline? 
        // Logic check: in generateShape, y goes negative (up).
        // Standard draw: ScreenY + point.y. ScreenY is this.y (bottom).
        // In Cache: we want (0, Height + Padding) to be the "baseline"?

        // Let's rely on standard CityEntity logic:
        // We draw at (x, y - height).
        // Shape goes from 0 to -height.
        // If we draw locally at (0, Height), then (0, 0) in shape is bottom left.
        // Actually CityEntity draws image at `y - height`.
        // So content at (0, 0) in cache appears at (x, y - height).
        // If we want the base to be at y, we need the base to be at Height in the cache?
        // Wait, CityEntity assumes the canvas contains the object.
        // If `this.height` is the peak, then cache height is roughly `this.height`.
        // We should draw the shape such that the bottom is at `this.height`.
        // Decoration ( trees) will be above that.

        const baselineY = this.height;

        ctx.fillStyle = this.getColor();
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, baselineY + this.points[0].y);

        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, baselineY + this.points[i].y);
        }
        // Valid Close (bottom right -> bottom left)
        ctx.lineTo(this.width, this.height * 2); // Way down?
        ctx.lineTo(0, this.height * 2);
        ctx.fill();

        // Decorations
        this.decorate(ctx, baselineY);
    }

    private decorate(ctx: CanvasRenderingContext2D, baselineY: number) {
        if (this.biome === 'city') return; // Smooth silhouette

        const count = Math.floor(this.width / 40);
        ctx.fillStyle = this.getDecorColor();

        for (let i = 0; i < count; i++) {
            const r = Math.random();
            const px = (i / count) * this.width + (r * 20);

            // Find Y on the curve? Approximation: Linear interp between points?
            // Or just simple raycast. 
            // Let's just place them randomly on the slope?
            // Hard to do precise "on the line" without math helper.
            // Simplification: Place at baselineY - interpolated height.

            // Interpolate height based on shape logic
            let py = 0;
            let peakRatio = 0.5; // Default (Forest/Plains)

            if (this.biome === 'desert') peakRatio = 0.4;
            // Tundra has complex shape, but for now we focus on fixing the Desert/General mismatch

            const peakX = this.width * peakRatio;

            if (px < peakX) {
                const t = px / peakX;
                py = -this.height * t;
            } else {
                const t = (px - peakX) / (this.width - peakX);
                py = -this.height * (1 - t);
            }

            // Draw Prop
            const drawX = px;
            const drawY = baselineY + py;

            if (this.biome === 'forest') {
                // Pine
                ctx.beginPath();
                ctx.moveTo(drawX, drawY);
                ctx.lineTo(drawX - 5, drawY + 15);
                ctx.lineTo(drawX + 5, drawY + 15);
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(drawX, drawY - 10); // Tree
                ctx.lineTo(drawX - 8, drawY + 20);
                ctx.lineTo(drawX + 8, drawY + 20);
                ctx.fill();
            }
            // Cacti moved to foreground trees
        }
    }

    private getDecorColor(): string {
        if (this.biome === 'forest') return '#1B5E20';
        return '#000';
    }

    private getColor(): string {
        switch (this.biome) {
            case 'forest': return '#388E3C';
            case 'desert': return '#FBC02D';
            case 'tundra': return '#ECEFF1';
            case 'plains': return '#8BC34A';
            case 'city': return '#37474F'; // Nice dark grey/blue
            default: return '#888';
        }
    }

    draw(ctx: CanvasRenderingContext2D, offsetX: number): void {
        super.draw(ctx, offsetX);

        // Fix Floating Artifacts:
        // When we lift layers (yOffset), the bottom of the shape might be exposed if the hill is small.
        // We need to extend the "ground" downwards indefinitely.

        // Calculate screen coordinates of the base
        const screenX = this.x - offsetX;

        // CityEntity draws the cached image such that 'this.y' is the baseline.
        // We want to fill from this.y downwards.
        // Since we are in a potentially scaled/translated context for the layer, 
        // we just draw at (x, y) with a large height.

        ctx.fillStyle = this.getColor();
        // Expand slightly X to match overlap logic
        ctx.fillRect(screenX - 1, this.y, this.width + 2, 2000);
    }
}
