import type { Renderable } from './Renderable';
import { LAYER_PRUNE_BUFFER } from '../config';

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
    public prune(cameraX: number, buffer: number = LAYER_PRUNE_BUFFER) {
        const layerViewX = cameraX * this.speedModifier;

        this.objects = this.objects.filter(obj => {
            return obj.x + obj.width > layerViewX - buffer;
        });
    }

    public draw(ctx: CanvasRenderingContext2D, cameraX: number, screenWidth: number, _screenHeight: number, scaleFactor: number = 1) {
        // Snap layerViewX to an integer device-pixel boundary. cameraX is a
        // float (time * speed); without snapping, the fractional part jitters
        // every frame, and Canvas2D rasterises adjacent draws onto different
        // device-pixel columns depending on whether their rounded edge crosses
        // .5 - producing the 1-px shimmer on biome/object borders. With snap,
        // every object in this layer shares the same offset and the whole
        // layer translates in integer device-pixel steps.
        const effectiveScale = scaleFactor * this.scale;
        const layerViewX = Math.round(cameraX * this.speedModifier * effectiveScale) / effectiveScale;

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

