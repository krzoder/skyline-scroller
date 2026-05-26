import { CityEntity } from './CityEntity';
import { Random } from '../../utils/Random';

export type TreeType = 'sequoia' | 'pine' | 'oak' | 'bush' | 'hedge' | 'cactus';

interface TreeSpec {
    width: number;
    padding: number;
    drawTo: (ctx: CanvasRenderingContext2D, tree: Tree) => void;
    setup?: (tree: Tree, rng: Random, flowerChance: number) => void;
}

export class Tree extends CityEntity {
    type: TreeType;
    hasFlower: boolean = false;
    flowerPos: 'left' | 'right' = 'left';

    constructor(x: number, type: TreeType, height: number, flowerChance: number = 0, rng?: Random) {
        const spec = TREE_SPECS[type];
        super(x, spec.width, height);
        this.type = type;

        const r = rng ?? new Random(`tree:${x}:${type}`);
        spec.setup?.(this, r, flowerChance);

        this.initCache(spec.padding);
    }

    protected drawToCache(ctx: CanvasRenderingContext2D): void {
        TREE_SPECS[this.type].drawTo(ctx, this);
    }
}

function drawSequoia(ctx: CanvasRenderingContext2D, t: Tree) {
    ctx.fillStyle = '#6D4C41';
    const trunkW = t.width * 0.4;
    const trunkStart = t.height * 0.2;
    ctx.fillRect((t.width - trunkW) / 2, trunkStart, trunkW, t.height - trunkStart);

    ctx.fillStyle = '#2E7D32';
    const layers = 8;
    for (let i = 0; i < layers; i++) {
        const progress = i / (layers - 1);
        const y = (t.height * 0.1) + (progress * (t.height * 0.7));
        const layerWidth = t.width * (0.3 + (progress * 0.9));
        ctx.beginPath();
        const h = t.height * 0.15;
        ctx.ellipse(t.width / 2, y, layerWidth / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPine(ctx: CanvasRenderingContext2D, t: Tree) {
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(t.width * 0.4, t.height * 0.3, t.width * 0.2, t.height * 0.7);

    ctx.fillStyle = '#1B5E20';
    const tiers = 4;
    const tierHeight = (t.height * 0.85) / tiers;

    for (let i = 0; i < tiers; i++) {
        const y = i * (tierHeight * 0.8);
        const w = t.width * (0.4 + (i * 0.2));

        ctx.beginPath();
        ctx.moveTo(t.width / 2, y);
        ctx.lineTo(t.width / 2 - w / 2, y + tierHeight);
        ctx.lineTo(t.width / 2 - w / 4, y + tierHeight - 5);
        ctx.lineTo(t.width / 2, y + tierHeight + 5);
        ctx.lineTo(t.width / 2 + w / 4, y + tierHeight - 5);
        ctx.lineTo(t.width / 2 + w / 2, y + tierHeight);
        ctx.fill();
    }
}

function drawOak(ctx: CanvasRenderingContext2D, t: Tree) {
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(t.width * 0.4, t.height * 0.6, t.width * 0.2, t.height * 0.4);

    ctx.fillStyle = '#43A047';
    const crownCenterY = t.height * 0.35;
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
            t.width / 2 + (p.x * t.width),
            crownCenterY + (p.y * t.height),
            t.width * p.r,
            0, Math.PI * 2
        );
        ctx.fill();
    });
}

function drawBush(ctx: CanvasRenderingContext2D, t: Tree) {
    ctx.fillStyle = '#7CB342';
    ctx.beginPath();
    ctx.arc(t.width / 2, t.height, t.width / 2, Math.PI, 0);
    ctx.arc(t.width * 0.3, t.height * 0.8, t.width * 0.3, Math.PI, 0);
    ctx.arc(t.width * 0.7, t.height * 0.8, t.width * 0.3, Math.PI, 0);
    ctx.fill();
}

function drawCactus(ctx: CanvasRenderingContext2D, t: Tree) {
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(t.width * 0.4, t.height * 0.2, t.width * 0.2, t.height * 0.8);
    ctx.fillRect(t.width * 0.1, t.height * 0.4, t.width * 0.3, t.height * 0.12);
    ctx.fillRect(t.width * 0.1, t.height * 0.25, t.width * 0.12, t.height * 0.25);
    ctx.fillRect(t.width * 0.6, t.height * 0.5, t.width * 0.25, t.height * 0.12);
    ctx.fillRect(t.width * 0.75, t.height * 0.35, t.width * 0.1, t.height * 0.25);

    if (t.hasFlower) {
        const fx = t.flowerPos === 'left'
            ? t.width * 0.1 + (t.width * 0.12 * 0.5)
            : t.width * 0.75 + (t.width * 0.1 * 0.5);
        const fy = t.flowerPos === 'left' ? t.height * 0.25 : t.height * 0.35;

        ctx.fillStyle = '#E91E63';
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawHedge(ctx: CanvasRenderingContext2D, t: Tree) {
    ctx.fillStyle = '#558B2F';
    ctx.beginPath();
    ctx.roundRect(0, 0, t.width, t.height, 10);
    ctx.fill();

    ctx.strokeStyle = '#33691E';
    ctx.lineWidth = 2;
    ctx.stroke();
}

const TREE_SPECS: Record<TreeType, TreeSpec> = {
    sequoia: { width: 70, padding: 0, drawTo: drawSequoia },
    pine: { width: 60, padding: 0, drawTo: drawPine },
    oak: { width: 90, padding: 30, drawTo: drawOak },
    bush: { width: 40, padding: 0, drawTo: drawBush },
    hedge: { width: 60, padding: 0, drawTo: drawHedge },
    cactus: {
        width: 40,
        padding: 0,
        drawTo: drawCactus,
        setup: (tree, rng, flowerChance) => {
            if (rng.nextFloat() < flowerChance) {
                tree.hasFlower = true;
                tree.flowerPos = rng.nextFloat() < 0.5 ? 'left' : 'right';
            }
        },
    },
};
