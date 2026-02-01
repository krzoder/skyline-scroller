import type { Renderable } from './Renderable';
import { TextureGenerator } from './TextureGenerator';

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

    constructor(x: number, width: number, height: number, material: BuildingMaterial, roofType: RoofType, baseColor: string, roofColor: string) {
        this.x = x;
        this.width = width;
        this.height = height;
        this.material = material;
        this.roofType = roofType;
        this.baseColor = baseColor;
        this.roofColor = roofColor;
        this.y = 0;

        this.cacheCanvas = this.generateTexture();
    }

    private generateTexture(): HTMLCanvasElement {
        // Total height = body + roof max height
        const roofHeight = 30; // Max roof height
        const totalHeight = this.height + roofHeight;

        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d')!;

        // Draw Body (from bottom up)
        const bodyTopY = roofHeight;

        // Draw Material
        if (this.material === 'brick') {
            const tex = TextureGenerator.createBrickPattern(this.width, this.height, this.baseColor);
            ctx.drawImage(tex, 0, bodyTopY);
        } else if (this.material === 'wood') {
            const tex = TextureGenerator.createWoodPattern(this.width, this.height, this.baseColor);
            ctx.drawImage(tex, 0, bodyTopY);
        } else {
            // Plain/Stone
            ctx.fillStyle = this.baseColor;
            ctx.fillRect(0, bodyTopY, this.width, this.height);

            if (this.material === 'stone') {
                // Noise
                ctx.fillStyle = "rgba(0,0,0,0.1)";
                for (let i = 0; i < 50; i++) {
                    ctx.fillRect(Math.random() * this.width, bodyTopY + Math.random() * this.height, 2, 2);
                }
            }
        }

        // Windows
        const winW = 6;
        const winH = 10;
        const gapX = 10;
        const gapY = 20;

        ctx.fillStyle = "#FDF5E6"; // Warm light
        if (Math.random() > 0.5) ctx.fillStyle = "#87CEEB"; // Day reflection?

        // Draw windows grid
        for (let wy = bodyTopY + 20; wy < totalHeight - 20; wy += gapY) {
            for (let wx = 10; wx < this.width - 10; wx += gapX) {
                if (Math.random() > 0.2) { // mostly present
                    ctx.fillRect(wx, wy, winW, winH);
                }
            }
        }

        // Draw Roof
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
        // The texture includes roof + body.
        // this.height is body height.
        // The drawImage should position the body bottom at this.y
        // The texture height is body + roofHeight.
        // So we draw at y - texture.height + offset?
        // Actually, let's look at generation: body starts at roofHeight. Body height is this.height.
        // So bottom of texture is roofHeight + this.height.
        // We want bottom of texture to be at this.y

        ctx.drawImage(this.cacheCanvas, screenX, this.y - this.cacheCanvas.height);
    }

    isVisible(_viewX: number, _viewWidth: number): boolean {
        return true;
    }
}
