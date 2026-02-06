import { CityEntity } from './CityEntity';

export type TreeType = 'sequoia' | 'pine' | 'oak' | 'bush' | 'hedge' | 'cactus';

export class Tree extends CityEntity {
    type: TreeType;
    hasFlower: boolean = false;
    flowerPos: 'left' | 'right' | 'top' = 'top';

    constructor(x: number, type: TreeType) {
        // 1. Determine dimensions first
        let w = 0;
        let h = 0;
        let padding = 0; // Default padding

        if (type === 'sequoia') {
            w = 70;
            h = 240 + Math.random() * 100;
        } else if (type === 'pine') {
            w = 60;
            h = 140 + Math.random() * 60;
        } else if (type === 'oak') {
            w = 90;
            h = 110 + Math.random() * 40;
            padding = 30; // Extra space for foliage
        } else if (type === 'bush') {
            w = 40;
            h = 30 + Math.random() * 20;
        } else if (type === 'cactus') {
            w = 40;
            h = 60 + Math.random() * 40;
        } else { // hedge
            w = 60;
            h = 40;
        }

        super(x, w, h);
        this.type = type;

        if (this.type === 'cactus' && Math.random() < 0.15) { // Increased chance slightly for visibility
            this.hasFlower = true;
            const r = Math.random();
            if (r < 0.33) this.flowerPos = 'left';
            else if (r < 0.66) this.flowerPos = 'right';
            else this.flowerPos = 'top';
        }

        this.initCache(padding);
    }

    protected drawToCache(ctx: CanvasRenderingContext2D): void {
        if (this.type === 'sequoia') {
            this.drawSequoia(ctx);
        } else if (this.type === 'pine') {
            this.drawPine(ctx);
        } else if (this.type === 'oak') {
            this.drawOak(ctx);
        } else if (this.type === 'bush') {
            this.drawBush(ctx);
        } else if (this.type === 'cactus') {
            this.drawCactus(ctx);
        } else {
            this.drawHedge(ctx);
        }
    }

    private drawSequoia(ctx: CanvasRenderingContext2D) {
        // Trunk
        ctx.fillStyle = '#6D4C41';
        const trunkW = this.width * 0.4;
        const trunkStart = this.height * 0.2;
        ctx.fillRect((this.width - trunkW) / 2, trunkStart, trunkW, this.height - trunkStart);

        // Foliage
        ctx.fillStyle = '#2E7D32';
        const layers = 8;
        for (let i = 0; i < layers; i++) {
            const progress = i / (layers - 1); // 0 (top) to 1 (bottom)
            const y = (this.height * 0.1) + (progress * (this.height * 0.7));
            const layerWidth = this.width * (0.3 + (progress * 0.9)); // 30% to 120% width
            ctx.beginPath();
            const h = this.height * 0.15;
            ctx.ellipse(this.width / 2, y, layerWidth / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawPine(ctx: CanvasRenderingContext2D) {
        // Trunk
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(this.width * 0.4, this.height * 0.3, this.width * 0.2, this.height * 0.7);

        // Jagged Triangles
        ctx.fillStyle = '#1B5E20';
        const tiers = 4;
        const tierHeight = (this.height * 0.85) / tiers;

        for (let i = 0; i < tiers; i++) {
            const y = i * (tierHeight * 0.8); // Overlap
            const w = this.width * (0.4 + (i * 0.2));

            ctx.beginPath();
            ctx.moveTo(this.width / 2, y);
            ctx.lineTo(this.width / 2 - w / 2, y + tierHeight);
            ctx.lineTo(this.width / 2 - w / 4, y + tierHeight - 5);
            ctx.lineTo(this.width / 2, y + tierHeight + 5);
            ctx.lineTo(this.width / 2 + w / 4, y + tierHeight - 5);
            ctx.lineTo(this.width / 2 + w / 2, y + tierHeight);
            ctx.fill();
        }
    }

    private drawOak(ctx: CanvasRenderingContext2D) {
        // Trunk
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(this.width * 0.4, this.height * 0.6, this.width * 0.2, this.height * 0.4);

        // Crown
        ctx.fillStyle = '#43A047';
        const crownCenterY = this.height * 0.35;
        const puffs = [
            { x: 0, y: -10, r: 0.5 },
            { x: -0.3, y: 0.1, r: 0.4 },
            { x: 0.3, y: 0.1, r: 0.4 },
            { x: -0.15, y: -0.2, r: 0.45 },
            { x: 0.15, y: -0.2, r: 0.45 },
        ];

        puffs.forEach(p => {
            ctx.beginPath();
            ctx.arc(
                this.width / 2 + (p.x * this.width),
                crownCenterY + (p.y * this.height),
                this.width * p.r,
                0, Math.PI * 2
            );
            ctx.fill();
        });
    }

    private drawBush(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#7CB342';
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height, this.width / 2, Math.PI, 0);
        ctx.arc(this.width * 0.3, this.height * 0.8, this.width * 0.3, Math.PI, 0);
        ctx.arc(this.width * 0.7, this.height * 0.8, this.width * 0.3, Math.PI, 0);
        ctx.fill();
    }

    private drawCactus(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#2E7D32'; // Green cactus
        // Main Stem
        ctx.fillRect(this.width * 0.4, this.height * 0.2, this.width * 0.2, this.height * 0.8);
        // Arms
        // Left
        ctx.fillRect(this.width * 0.1, this.height * 0.4, this.width * 0.3, this.height * 0.12);
        ctx.fillRect(this.width * 0.1, this.height * 0.25, this.width * 0.12, this.height * 0.25);
        // Right
        ctx.fillRect(this.width * 0.6, this.height * 0.5, this.width * 0.25, this.height * 0.12);
        ctx.fillRect(this.width * 0.75, this.height * 0.35, this.width * 0.1, this.height * 0.25);

        // Flower
        // Flower
        if (this.hasFlower) {
            let fx = this.width * 0.5;
            let fy = this.height * 0.2;

            if (this.flowerPos === 'left') {
                fx = this.width * 0.1 + (this.width * 0.12 * 0.5); // Center of left arm
                fy = this.height * 0.25; // Top of left arm
            } else if (this.flowerPos === 'right') {
                fx = this.width * 0.75 + (this.width * 0.1 * 0.5); // Center of right arm top
                fy = this.height * 0.35; // Top of right arm
            }

            // Draw Flower (Dumb but cute)
            const size = 5;
            ctx.fillStyle = '#E91E63'; // Pink

            // Petals
            ctx.beginPath();
            ctx.arc(fx - size, fy, size, 0, Math.PI * 2);
            ctx.arc(fx + size, fy, size, 0, Math.PI * 2);
            ctx.arc(fx, fy - size, size, 0, Math.PI * 2);
            ctx.arc(fx, fy + size, size, 0, Math.PI * 2);
            ctx.fill();

            // Center
            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath();
            ctx.arc(fx, fy, size * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawHedge(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#558B2F';
        ctx.beginPath();
        ctx.roundRect(0, 0, this.width, this.height, 10);
        ctx.fill();

        ctx.strokeStyle = '#33691E';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
