import type { Renderable } from './Renderable';

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
        // Pad the canvas to prevent clipping
        this.cacheCanvas.width = this.width + (padding * 2);
        this.cacheCanvas.height = this.height + (padding * 2);

        const ctx = this.cacheCanvas.getContext('2d')!;

        // Translate context to account for padding
        ctx.translate(padding, padding);

        this.drawToCache(ctx);
    }

    protected abstract drawToCache(ctx: CanvasRenderingContext2D): void;

    draw(ctx: CanvasRenderingContext2D, offsetX: number): void {
        const screenX = this.x - offsetX;
        // Draw centered relative to the padding?
        // The entity's logical (x, y) is bottom-center or bottom-left?
        // In current rendering, x is left, y is bottom.
        // We drew texture at (x, y - height).
        // With padding, the texture is larger.
        // If padding is 10, the "content" starts at 10,10.
        // We want the "content" bottom-left to align with (x, y).
        // Content height is this.height.
        // Cache height is height + 2*padding.
        // So we want to draw at y - height - padding?

        // Let's rely on the fact that drawToCache draws from (0,0) to (width, height) *inside* the translated context.
        // So the "pixels" of the object are at Padding, Padding.
        // We want those pixels to appear at ScreenX, Y - Height.
        // So we draw the canvas at ScreenX - Padding, Y - Height - Padding.

        const padding = (this.cacheCanvas.width - this.width) / 2;

        ctx.drawImage(
            this.cacheCanvas,
            screenX - padding,
            this.y - this.height - padding
        );
    }

    isVisible(viewX: number, viewWidth: number): boolean {
        // Simple bounds check
        return (this.x + this.width > viewX && this.x < viewX + viewWidth);
    }
}
