import { Random } from '../../utils/Random';

export function createBrickPattern(width: number, height: number, color: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(0,0,0,0.1)";
    const brickHeight = 10;
    const brickWidth = 20;

    for (let y = 0; y < height; y += brickHeight) {
        const offset = (y / brickHeight) % 2 === 0 ? 0 : brickWidth / 2;
        for (let x = -brickWidth; x < width; x += brickWidth) {
            ctx.fillRect(x + offset, y, brickWidth - 2, brickHeight - 2);
        }
    }
    return canvas;
}

export function createWoodPattern(width: number, height: number, color: string, rng?: Random): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    const r = rng ?? new Random(`wood:${width}:${height}:${color}`);

    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    for (let y = 0; y < height; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(width / 3, y + r.nextFloat() * 5, width / 3 * 2, y - r.nextFloat() * 5, width, y);
        ctx.stroke();
    }
    return canvas;
}
