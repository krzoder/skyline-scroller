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
        // Parallax adjusted cameraX for this layer
        // Effectively, if speedModifier is 0.5, the layer moves at half speed.
        // The "world" coordinate system for the layer is independent? 
        // Usually parallax is implemented as: screenX = (worldX - cameraX) * parallaxFactor
        // But for infinite scrolling, we often treat each layer as having its own "head" pointer.

        // Let's stick to: ScreenX = (ObjectX - CameraX * SpeedModifier)

        const layerViewX = cameraX * this.speedModifier;

        this.objects = this.objects.filter(obj => {
            return obj.x + obj.width > layerViewX - buffer;
        });
    }

    public draw(ctx: CanvasRenderingContext2D, cameraX: number, screenWidth: number, _screenHeight: number) {
        const layerViewX = cameraX * this.speedModifier;

        // Optimization: only draw visible
        // We assume objects are somewhat sorted or we iterate all
        // Standard parallax:

        // Save context to apply offset? Or pass offset to object.
        // Passing offset is flexible.

        // If we translate the context:
        // ctx.translate(-layerViewX, 0); 
        // But then we need to know screen Y maybe?

        // Apply Y offset contextually
        ctx.save();
        ctx.translate(0, -this.yOffset);

        // Apply Scaling
        if (this.scale !== 1.0) {
            ctx.scale(this.scale, this.scale);
        }

        this.objects.forEach(obj => {
            // Check visibility
            // Object is visible if (obj.x - layerViewX) < screenWidth AND (obj.x + width - layerViewX) > 0

            const screenX = obj.x - layerViewX;

            if (screenX * this.scale < screenWidth && (screenX + obj.width) * this.scale > 0) {
                obj.draw(ctx, layerViewX);
            }
        });

        ctx.restore();
    }
}

