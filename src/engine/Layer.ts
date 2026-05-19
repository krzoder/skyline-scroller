import type { Renderable } from './Renderable';

export class Layer {
    public objects: Renderable[] = [];
    public speedModifier: number;
    public zIndex: number;
    public yOffset: number;
    public scale: number;

    constructor(speedModifier: number, zIndex: number, yOffset: number = 0, scale: number = 1.0) {
        this.speedModifier = speedModifier;
        this.zIndex = zIndex;
        this.yOffset = yOffset;
        this.scale = scale;
    }

    public add(obj: Renderable) {
        this.objects.push(obj);
    }

    // Remove objects that are far behind the camera to save memory
    public prune(cameraX: number, buffer: number = 2000) {
        const layerViewX = cameraX * this.speedModifier;

        this.objects = this.objects.filter(obj => {
            return obj.x + obj.width > layerViewX - buffer;
        });
    }

    public draw(ctx: CanvasRenderingContext2D, cameraX: number, screenWidth: number, _screenHeight: number) {
        const layerViewX = cameraX * this.speedModifier;

        ctx.save();
        ctx.translate(0, -this.yOffset);

        if (this.scale !== 1.0) {
            ctx.scale(this.scale, this.scale);
        }

        this.objects.forEach(obj => {
            const screenX = obj.x - layerViewX;

            if (screenX * this.scale < screenWidth && (screenX + obj.width) * this.scale > 0) {
                obj.draw(ctx, layerViewX);
            }
        });

        ctx.restore();
    }
}

