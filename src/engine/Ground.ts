import type { Renderable } from './Renderable';

export type GroundType = 'grass' | 'pavement' | 'water' | 'dirt';

export class Ground implements Renderable {
    x: number;
    y: number; // Top Y (Visual ground level)
    width: number;
    height: number; // Extends downwards
    type: GroundType;

    constructor(x: number, width: number, type: GroundType) {
        this.x = x;
        this.width = width;
        this.type = type;
        this.y = 0; // Relative to layer 0
        this.height = 100; // Arbitrary depth below screen
    }

    draw(ctx: CanvasRenderingContext2D, offsetX: number): void {
        const screenX = this.x - offsetX;

        // Draw Ground
        switch (this.type) {
            case 'grass':
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(screenX, this.y, this.width, this.height);
                // Texture
                ctx.fillStyle = '#388E3C';
                ctx.fillRect(screenX, this.y, this.width, 5); // darker top
                break;
            case 'pavement':
                ctx.fillStyle = '#9E9E9E';
                ctx.fillRect(screenX, this.y, this.width, this.height);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(screenX + 5, this.y + 10, this.width - 10, 2); // Street marking
                break;
            case 'water':
                ctx.fillStyle = '#2196F3';
                ctx.fillRect(screenX, this.y + 5, this.width, this.height - 5); // Recessed
                ctx.fillStyle = '#BBDEFB'; // simple reflection/foam
                ctx.fillRect(screenX, this.y + 5, this.width, 2);
                // Reflections handled elsewhere or simple effect
                break;
            case 'dirt':
                ctx.fillStyle = '#795548';
                ctx.fillRect(screenX, this.y, this.width, this.height);
                break;
        }
    }

    isVisible(_viewX: number, _viewWidth: number): boolean {
        return true;
    }
}
