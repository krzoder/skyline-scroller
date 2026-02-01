import { Random } from '../utils/Random';

export class SkySystem {
    private time: number = 0; // 0 to 24
    private speed: number = 0.1; // 5x Slower
    private canvas: HTMLCanvasElement;

    // Gradient Keyframes - Rapid Transition around 6 and 18
    private keyframes = [
        { t: 0, top: "#020024", bot: "#090979" },    // Deep Night
        { t: 5.0, top: "#020024", bot: "#090979" },  // Night until last moment
        { t: 5.5, top: "#40405c", bot: "#603040" },  // Dawn Rapid
        { t: 6.0, top: "#87ceeb", bot: "#ff7f50" },  // Sunrise Peak (Flip)
        { t: 6.5, top: "#4facfe", bot: "#00f2fe" },  // Full Day Quickly
        { t: 12, top: "#1a73e8", bot: "#4facfe" },   // Noon
        { t: 17.5, top: "#4facfe", bot: "#00f2fe" }, // Day until last moment
        { t: 18.0, top: "#fd746c", bot: "#ff9966" }, // Sunset Peak (Flip)
        { t: 18.5, top: "#40405c", bot: "#603040" }, // Dusk Rapid
        { t: 19.0, top: "#020024", bot: "#090979" }, // Night Rapid
        { t: 24, top: "#020024", bot: "#090979" }    // Wrap
    ];

    private clouds: {
        x: number,
        y: number,
        speed: number,
        type: 'cumulus' | 'cirrus' | 'stratus',
        scale: number,
        opacity: number,
        // Bounds for precise culling
        bounds: { minX: number, maxX: number },
        parts: { x: number, y: number, r: number, opacity?: number, w?: number, h?: number }[]
    }[] = [];
    private rng: Random;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.rng = new Random(Date.now());
        this.time = this.rng.nextRange(6, 18);
        this.initClouds();
    }

    private initClouds() {
        this.clouds = [];
        const count = 20;
        for (let i = 0; i < count; i++) {
            this.createCloud(true, i * (this.canvas.width / count));
        }
    }

    private createCloud(randomX: boolean = false, overrideX?: number) {
        const r = this.rng.nextFloat();
        let type: 'cumulus' | 'cirrus' | 'stratus' = 'cumulus';
        let y = this.rng.nextRange(50, 300);
        let speed = this.rng.nextRange(1, 4);
        let scale = this.rng.nextRange(0.8, 1.8);
        let opacity = 0.8;

        if (r < 0.3) {
            type = 'cirrus';
            y = this.rng.nextRange(20, 100);
            speed = this.rng.nextRange(0.5, 1.5);
            scale = this.rng.nextRange(1.2, 2.5);
            opacity = 0.5;
        } else if (r < 0.6) {
            type = 'stratus';
            y = this.rng.nextRange(150, 400);
            scale = this.rng.nextRange(1.5, 3.5);
            opacity = 0.6;
        }

        // Generate parts
        const parts = [];
        let minX = 0;
        let maxX = 0;

        if (type === 'cumulus') {
            const puffs = Math.floor(this.rng.nextRange(8, 15));
            for (let p = 0; p < puffs; p++) {
                const px = this.rng.nextRange(-60, 60);
                const py = this.rng.nextRange(-20, 30);
                const pr = this.rng.nextRange(20, 45);
                parts.push({ x: px, y: py, r: pr });

                // Track bounds (circle extents)
                minX = Math.min(minX, px - pr);
                maxX = Math.max(maxX, px + pr);
            }
        } else if (type === 'cirrus') {
            const strokes = Math.floor(this.rng.nextRange(5, 12));
            for (let s = 0; s < strokes; s++) {
                const w = this.rng.nextRange(60, 150);
                const px = this.rng.nextRange(-80, 80);
                parts.push({
                    x: px,
                    y: this.rng.nextRange(-15, 15),
                    r: 0,
                    w: w,
                    h: this.rng.nextRange(3, 8),
                    opacity: this.rng.nextRange(0.2, 0.5)
                });
                // Ellipse bounds approx
                minX = Math.min(minX, px - w); // w is radiusY? No, ctx.ellipse radiusX.
                maxX = Math.max(maxX, px + w);
            }
        } else { // Stratus
            const layers = Math.floor(this.rng.nextRange(3, 7));
            for (let l = 0; l < layers; l++) {
                const w = this.rng.nextRange(150, 300);
                const px = this.rng.nextRange(-100, 100);
                parts.push({
                    x: px,
                    y: this.rng.nextRange(-20, 20),
                    r: 0,
                    w: w,
                    h: this.rng.nextRange(15, 40),
                    opacity: this.rng.nextRange(0.2, 0.5)
                });
                // Rect bounds
                minX = Math.min(minX, px); // Rect draws from x? No, usually centered or corner. 
                // Context code: ctx.rect(p.x, p.y, p.w, p.h)
                // But in draw we do translate(cx, cy). So p.x is offset.
                // If rect is x,y,w,h relative to center:
                minX = Math.min(minX, px);
                maxX = Math.max(maxX, px + w);
            }
        }

        // Apply scale to bounds for global check
        // We do precise check in update, so we store local bounds.
        const bounds = { minX, maxX };

        // Initial Position
        let x;
        if (overrideX !== undefined) {
            x = overrideX + this.rng.nextRange(-100, 100);
        } else {
            // "From zero" logic:
            // Spawn just off-screen left.
            // Cloud max right edge is center + maxX * scale.
            // We want (x + maxX*scale) < 0.
            // So x < -(maxX * scale).
            x = randomX ? this.rng.nextRange(0, this.canvas.width) : -(maxX * scale) - 50;
        }

        this.clouds.push({ x, y, speed, type, scale, opacity, parts, bounds });
    }

    public update(dt: number) {
        this.time += this.speed * dt;
        if (this.time >= 24) this.time = 0;

        // Move clouds
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const c = this.clouds[i];
            c.x += c.speed * dt;

            // Dynamic Despawn Logic
            // Despawn when LEFTMOST pixel is off screen RIGHT?
            // "if it still has pixels on screen, it can't disappear"
            // So: minX pixel > canvas.width
            // Pixel pos = c.x + (c.bounds.minX * c.scale).

            const cloudMinPixel = c.x + (c.bounds.minX * c.scale);

            if (cloudMinPixel > this.canvas.width) {
                this.clouds.splice(i, 1);
                this.createCloud(false);
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        // 1. Interpolate Sky Color
        const { top, bot } = this.getSkyColors(this.time);

        const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0, top);
        grad.addColorStop(1, bot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Celestial Body
        this.drawCelestialBody(ctx);

        // Draw Clouds
        this.clouds.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.scale(c.scale, c.scale);
            if (c.type === 'cumulus') {
                ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity})`;
                c.parts.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else if (c.type === 'cirrus') {
                c.parts.forEach(p => {
                    ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y, p.w || 50, p.h || 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else if (c.type === 'stratus') {
                c.parts.forEach(p => {
                    ctx.fillStyle = `rgba(220, 220, 220, ${p.opacity || 0.4})`;
                    ctx.beginPath();
                    ctx.rect(p.x, p.y, p.w || 100, p.h || 20);
                    ctx.fill();
                });
            }
            ctx.restore();
        });
    }

    private getSkyColors(t: number) {
        let f1 = this.keyframes[0];
        let f2 = this.keyframes[1];

        for (let i = 0; i < this.keyframes.length - 1; i++) {
            if (t >= this.keyframes[i].t && t < this.keyframes[i + 1].t) {
                f1 = this.keyframes[i];
                f2 = this.keyframes[i + 1];
                break;
            }
        }

        const progress = (t - f1.t) / (f2.t - f1.t);
        return {
            top: this.lerpColor(f1.top, f2.top, progress),
            bot: this.lerpColor(f1.bot, f2.bot, progress)
        };
    }

    private lerpColor(c1: string, c2: string, t: number): string {
        const parse = (c: string) => {
            const hex = c.replace('#', '');
            return [
                parseInt(hex.substr(0, 2), 16),
                parseInt(hex.substr(2, 2), 16),
                parseInt(hex.substr(4, 2), 16)
            ];
        };
        const [r1, g1, b1] = parse(c1);
        const [r2, g2, b2] = parse(c2);

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return `rgb(${r}, ${g}, ${b})`;
    }

    private drawCelestialBody(ctx: CanvasRenderingContext2D) {
        // Pad logic: 0..24 maps to -150 to W+150 (Reduced buffer)
        const pad = 150;
        const totalW = this.canvas.width + (pad * 2);
        const x = -pad + (this.time / 24) * totalW;

        // Height Logic (Higher arc)
        const cy = 125 + Math.sin((this.time - 6) * Math.PI / 12) * -75;

        // ANIMATION
        // User: "Flip speed 3x FASTER".
        // Was 0.2. Now 0.06.
        const flipWin = 0.06;
        // Ray Window: Fade happens before flip.
        const rayWin = 1.0;

        let scaleX = 1;
        let drawSun = (this.time > 6 && this.time < 18);

        let currentCore = drawSun ? 40 : 30;
        let currentBloom = drawSun ? 1 : 0;

        // SUNSET (18:00) Logic
        if (this.time > 12 && this.time < 24) {
            // Sunset / Dusk Side
            // 1. Ray Fade Phase (Before Flip)
            // Range: [18 - rayWin, 18 - flipWin].
            const t = this.time;
            const flipStart = 18 - flipWin;
            const rayStart = 18 - rayWin;

            if (t >= rayStart && t < flipStart) {
                // Fading Rays (Bloom 1 -> 0)
                // Shrinking Core (40 -> 30)
                const p = (t - rayStart) / (flipStart - rayStart); // 0..1
                currentBloom = 1 - p;
                currentCore = 40 - (10 * p);
            } else if (t >= flipStart && t < 18 + flipWin) {
                // Flip Phase
                currentBloom = 0;
                currentCore = 30;

                // Calc Angle
                const p = (t - flipStart) / (flipWin * 2); // 0..1
                const angle = p * Math.PI;
                scaleX = Math.cos(angle);

                if (p >= 0.5) drawSun = false;
                else drawSun = true;
            } else if (t >= 18 + flipWin) {
                // Full Night
                drawSun = false;
                currentBloom = 0;
                currentCore = 30;
            }
        } else {
            // Sunrise Side (06:00)
            const t = this.time;
            const flipStart = 6 - flipWin;
            const flipEnd = 6 + flipWin;
            const rayEnd = 6 + rayWin;

            if (t < flipStart) {
                // Full Night
                drawSun = false;
            } else if (t >= flipStart && t < flipEnd) {
                // Flip Phase
                currentBloom = 0;
                currentCore = 30;
                const p = (t - flipStart) / (flipWin * 2);
                const angle = p * Math.PI;
                scaleX = Math.cos(angle);

                if (p < 0.5) drawSun = false;
                else drawSun = true;
            } else if (t >= flipEnd && t < rayEnd) {
                // Growing Phase
                drawSun = true;
                const p = (t - flipEnd) / (rayEnd - flipEnd); // 0..1
                currentBloom = p;
                currentCore = 30 + (10 * p);
            } else {
                // Full Day
                drawSun = true;
                currentBloom = 1;
                currentCore = 40;
            }
        }

        ctx.save();
        ctx.translate(x, cy);
        ctx.scale(Math.abs(scaleX), 1);

        if (drawSun) {
            // Draw Sun
            if (currentBloom > 0.01) {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * currentBloom})`;
                ctx.beginPath();
                ctx.arc(0, 0, 100, 0, Math.PI * 2);
                ctx.fill();
            }
            // Core
            ctx.fillStyle = "#FFD700";
            ctx.beginPath();
            ctx.arc(0, 0, currentCore, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw Moon
            ctx.fillStyle = "#FEFCD7";
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#E0E0E0";
            ctx.beginPath();
            ctx.arc(-10, -5, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
