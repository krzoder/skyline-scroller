import type { Renderable } from './Renderable';
import { createBrickPattern, createWoodPattern } from './TextureGenerator';
import { Random } from '../utils/Random';

export type BuildingMaterial = 'wood' | 'brick' | 'stone' | 'plaster';
export type RoofType = 'flat' | 'gabled' | 'dome' | 'crenelated';

export class Building implements Renderable {
    x: number;
    y: number; // Bottom Y (usually matches layer ground)
    width: number;
    height: number;

    material: BuildingMaterial;
    roofType: RoofType;
    baseColor: string;
    roofColor: string;

    private cacheCanvas: HTMLCanvasElement;
    private rng: Random;

    constructor(x: number, width: number, height: number, material: BuildingMaterial, roofType: RoofType, baseColor: string, roofColor: string, rng?: Random) {
        this.x = x;
        this.width = width;
        this.height = height;
        this.material = material;
        this.roofType = roofType;
        this.baseColor = baseColor;
        this.roofColor = roofColor;
        this.y = 0;
        this.rng = rng ?? new Random(`building:${x}:${material}`);

        this.cacheCanvas = this.generateTexture();
    }

    private generateTexture(): HTMLCanvasElement {
        const roofHeight = 30; // Max roof height; reserved at top of canvas
        const totalHeight = this.height + roofHeight;

        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d')!;

        const bodyTopY = roofHeight;

        if (this.material === 'brick') {
            const tex = createBrickPattern(this.width, this.height, this.baseColor);
            ctx.drawImage(tex, 0, bodyTopY);
        } else if (this.material === 'wood') {
            const tex = createWoodPattern(this.width, this.height, this.baseColor, this.rng);
            ctx.drawImage(tex, 0, bodyTopY);
        } else {
            // Plain/Stone
            ctx.fillStyle = this.baseColor;
            ctx.fillRect(0, bodyTopY, this.width, this.height);

            if (this.material === 'stone') {
                ctx.fillStyle = "rgba(0,0,0,0.1)";
                for (let i = 0; i < 50; i++) {
                    ctx.fillRect(this.rng.nextFloat() * this.width, bodyTopY + this.rng.nextFloat() * this.height, 2, 2);
                }
            }
        }

        const winW = 6;
        const winH = 10;
        const gapX = 10;
        const gapY = 20;

        ctx.fillStyle = "#FDF5E6"; // Warm light
        if (this.rng.nextFloat() > 0.5) ctx.fillStyle = "#87CEEB"; // Day reflection

        for (let wy = bodyTopY + 20; wy < totalHeight - 20; wy += gapY) {
            for (let wx = 10; wx < this.width - 10; wx += gapX) {
                if (this.rng.nextFloat() > 0.2) {
                    ctx.fillRect(wx, wy, winW, winH);
                }
            }
        }

        ctx.fillStyle = this.roofColor;
        if (this.roofType === 'flat') {
            ctx.fillRect(0, bodyTopY - 5, this.width, 5); // Simple cornice
        } else if (this.roofType === 'gabled') {
            ctx.beginPath();
            ctx.moveTo(0, bodyTopY);
            ctx.lineTo(this.width / 2, 0); // Peak
            ctx.lineTo(this.width, bodyTopY);
            ctx.fill();
        } else if (this.roofType === 'dome') {
            ctx.beginPath();
            ctx.arc(this.width / 2, bodyTopY, this.width / 2, Math.PI, 0);
            ctx.fill();
        } else if (this.roofType === 'crenelated') {
            ctx.fillRect(0, bodyTopY, this.width, 10); // Base parapet
            // Merlons
            for (let i = 0; i < this.width; i += 10) {
                if ((i / 10) % 2 === 0) ctx.fillRect(i, bodyTopY - 10, 10, 10);
            }
        }

        return canvas;
    }

    draw(ctx: CanvasRenderingContext2D, offsetX: number): void {
        const screenX = this.x - offsetX;
        ctx.drawImage(this.cacheCanvas, screenX, this.y - this.cacheCanvas.height);
    }

    isVisible(_viewX: number, _viewWidth: number): boolean {
        return true;
    }
}
