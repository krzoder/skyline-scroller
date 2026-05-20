import { CityEntity } from './CityEntity';
import type { BiomeType } from '../BiomeSystem';
import { Random } from '../../utils/Random';

export class Landscape extends CityEntity {
    biome: BiomeType;
    points: { x: number, y: number }[];
    private rng: Random;

    constructor(x: number, width: number, height: number, biome: BiomeType, rng?: Random) {
        super(x, width, height);
        this.biome = biome;
        // Per-instance seeded stream — deterministic when caller passes one.
        this.rng = rng ?? new Random(`landscape:${x}:${biome}`);
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
            // City: silhouette of distant buildings
            const steps = 5;
            const stepW = this.width / steps;
            for (let i = 0; i < steps; i++) {
                const h = 50 + this.rng.nextFloat() * (this.height - 50);
                pts.push({ x: i * stepW, y: -h });
                pts.push({ x: (i + 1) * stepW, y: -h });
            }
            pts.push({ x: this.width, y: 0 });
        }
        return pts;
    }

    protected drawToCache(ctx: CanvasRenderingContext2D): void {
        // Shape points use y=0 as base, negative y going up. Cache draws content
        // so its baseline lands at this.height; decorations live above that.
        const baselineY = this.height;

        ctx.fillStyle = this.getColor();
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, baselineY + this.points[0].y);

        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, baselineY + this.points[i].y);
        }
        // Close shape far below the canvas so the fill always reaches the bottom.
        ctx.lineTo(this.width, this.height * 2);
        ctx.lineTo(0, this.height * 2);
        ctx.fill();

        this.decorate(ctx, baselineY);
    }

    private decorate(ctx: CanvasRenderingContext2D, baselineY: number) {
        if (this.biome === 'city') return; // Smooth silhouette

        const count = Math.floor(this.width / 40);
        ctx.fillStyle = this.getDecorColor();

        for (let i = 0; i < count; i++) {
            const r = this.rng.nextFloat();
            const px = (i / count) * this.width + (r * 20);

            // Approximate decoration height via linear interp around the peak,
            // rather than raycasting against the actual polyline.
            let py = 0;
            let peakRatio = 0.5;

            if (this.biome === 'desert') peakRatio = 0.4;

            const peakX = this.width * peakRatio;

            if (px < peakX) {
                const t = px / peakX;
                py = -this.height * t;
            } else {
                const t = (px - peakX) / (this.width - peakX);
                py = -this.height * (1 - t);
            }

            const drawX = px;
            const drawY = baselineY + py;

            if (this.biome === 'forest') {
                ctx.beginPath();
                ctx.moveTo(drawX, drawY);
                ctx.lineTo(drawX - 5, drawY + 15);
                ctx.lineTo(drawX + 5, drawY + 15);
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(drawX, drawY - 10);
                ctx.lineTo(drawX - 8, drawY + 20);
                ctx.lineTo(drawX + 8, drawY + 20);
                ctx.fill();
            }
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

        // Extend ground colour downwards indefinitely so lifted layers (yOffset)
        // don't expose the area below the small hill silhouettes.
        const screenX = this.x - offsetX;

        ctx.fillStyle = this.getColor();
        // 1px X overlap on each side prevents seams between adjacent landscapes.
        ctx.fillRect(screenX - 1, this.y, this.width + 2, 2000);
    }
}
