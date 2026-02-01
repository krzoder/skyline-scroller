export class TextureGenerator {
    static createBrickPattern(width: number, height: number, color: string): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Background color
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);

        // Brick details
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

    static createWoodPattern(width: number, height: number, color: string): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);

        // Wood grain lines
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 2;
        for (let y = 0; y < height; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(width / 3, y + Math.random() * 5, width / 3 * 2, y - Math.random() * 5, width, y);
            ctx.stroke();
        }
        return canvas;
    }
}
