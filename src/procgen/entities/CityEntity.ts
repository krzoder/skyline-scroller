import type { Renderable } from '../../engine/Renderable';

export abstract class CityEntity implements Renderable {
    x: number;
    y: number;
    width: number;
    height: number;
    protected cacheCanvas: HTMLCanvasElement;

    constructor(x: number, width: number, height: number) {
        this.x = x;
        this.width = width;
        this.height = height;
        this.y = 0; // Default baseline
        this.cacheCanvas = document.createElement('canvas'); // Placeholder
    }

    protected initCache(padding: number = 0) {
        this.cacheCanvas = document.createElement('canvas');
        // Pad the canvas to prevent clipping of decorations drawn outside the entity's logical bounds.
        this.cacheCanvas.width = this.width + (padding * 2);
        this.cacheCanvas.height = this.height + (padding * 2);

        const ctx = this.cacheCanvas.getContext('2d')!;
        ctx.translate(padding, padding);

        this.drawToCache(ctx);
    }

    protected abstract drawToCache(ctx: CanvasRenderingContext2D): void;

    draw(ctx: CanvasRenderingContext2D, offsetX: number): void {
        const screenX = this.x - offsetX;
        // Cache contains content at (padding, padding) with size (width, height).
        // We want content bottom-left at (screenX, this.y), so offset by -padding on both axes.
        const padding = (this.cacheCanvas.width - this.width) / 2;

        ctx.drawImage(
            this.cacheCanvas,
            screenX - padding,
            this.y - this.height - padding
        );
    }

    isVisible(viewX: number, viewWidth: number): boolean {
        return (this.x + this.width > viewX && this.x < viewX + viewWidth);
    }
}
