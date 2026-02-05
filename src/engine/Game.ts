import { Layer } from './Layer';
import { CityGenerator } from '../procgen/CityGenerator';

import { SkySystem } from './SkySystem';

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lastTime: number = 0;
    private isRunning: boolean = false;

    private cameraX: number = 0;
    private cameraSpeed: number = 100; // Pixels per second

    private layers: Layer[] = [];
    private generator: CityGenerator | null = null;
    private sky: SkySystem | null = null;
    private seed: string = "default";
    private noisePattern: CanvasPattern | null = null;

    private readonly scaleFactor = 1.6;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        if (!this.ctx) {
            throw new Error("Could not get 2D context");
        }

        // Initialize Logic
        this.initNoise();
        this.reset();

        // Bind resize
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    private initNoise() {
        const w = 256;
        const h = 256;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const idata = ctx.createImageData(w, h);
        const data = idata.data;

        for (let i = 0; i < data.length; i += 4) {
            const val = Math.floor(Math.random() * 255);
            data[i] = val;     // R
            data[i + 1] = val; // G
            data[i + 2] = val; // B
            data[i + 3] = 8;   // ~3% opacity
        }
        ctx.putImageData(idata, 0, 0);

        this.noisePattern = this.ctx.createPattern(canvas, 'repeat');
    }

    public setSeed(seed: string) {
        this.seed = seed;
        this.reset();
    }

    private reset() {
        this.cameraX = 0;
        // Layer Params: speedModifier, zIndex, yOffset
        // We want the background to be "higher" on screen (hill effect).
        // Ground is at bottom.
        // If yOffset is positive, we translate(0, -yOffset), so it moves UP.

        this.layers = [
            new Layer(0.2, 0, 190, 1.3), // Background (Highest up)
            new Layer(0.4, 1, 100), // Mid-Back
            new Layer(0.6, 2, 50),  // Mid-Fore
            new Layer(1.0, 3, 0)    // Foreground (Ground level)
        ];
        this.generator = new CityGenerator(this.seed, this.layers.length);
        this.sky = new SkySystem(this.canvas);
    }

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        console.log("Game started at", this.lastTime);
        requestAnimationFrame((t) => this.loop(t));
    }

    private loop(time: number) {
        if (!this.isRunning) return;

        try {
            const deltaTime = (time - this.lastTime) / 1000;
            this.lastTime = time;

            // Cap dt to prevent huge jumps if tab was inactive
            const safeDt = Math.min(deltaTime, 0.1);

            this.update(safeDt);
            this.render();
        } catch (e) {
            console.error("Game Loop Error:", e);
            this.isRunning = false;
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    private update(dt: number) {
        this.cameraX += this.cameraSpeed * dt;

        const logicalW = this.canvas.width / this.scaleFactor;

        this.sky?.update(dt, logicalW);

        // Generate new buildings if needed
        if (this.generator) {
            this.generator.generate(this.layers, this.cameraX, logicalW);
        }

        // Prune old
        this.layers.forEach(l => l.prune(this.cameraX));

        // Update Debug UI
        const uiSeedVal = document.getElementById('ui-seed-val');
        const uiTimeVal = document.getElementById('ui-time-val');

        if (uiSeedVal && uiSeedVal.innerText !== this.seed) {
            uiSeedVal.innerText = this.seed;
        }
        if (uiTimeVal) {
            uiTimeVal.innerText = Math.floor(this.cameraX).toString();
        }
    }

    private render() {
        const logicalW = this.canvas.width / this.scaleFactor;
        const logicalH = this.canvas.height / this.scaleFactor;

        this.ctx.save();
        this.ctx.scale(this.scaleFactor, this.scaleFactor);

        // Clear screen
        // Draw Sky first
        if (this.sky) {
            this.sky.draw(this.ctx, logicalW, logicalH);
        } else {
            this.ctx.fillStyle = "#000";
            this.ctx.fillRect(0, 0, logicalW, logicalH);
        }

        const groundY = logicalH - 80; // Lift baseline so we see the ground/road

        this.ctx.save();
        this.ctx.translate(0, groundY);

        this.layers.forEach(layer => {
            layer.draw(this.ctx, this.cameraX, logicalW, logicalH);
        });

        this.ctx.restore();

        // Draw Solid Earth below groundY to hide sky
        this.ctx.fillStyle = "#2e2e2e"; // Dark earth color
        this.ctx.fillRect(0, groundY, logicalW, 80);

        // 3. Ambient Light Overlay (Global Filter - Multiply)
        if (this.sky) {
            const ambient = this.sky.getAmbientColor();

            // Multiply blending for smooth lighting
            this.ctx.globalCompositeOperation = 'multiply';
            this.ctx.fillStyle = ambient;
            this.ctx.fillRect(0, 0, logicalW, logicalH);

            // Reset composite operation
            this.ctx.globalCompositeOperation = 'source-over';
        }

        // 4. Noise Dithering (Fixes banding)
        if (this.noisePattern) {
            this.ctx.fillStyle = this.noisePattern;
            this.ctx.fillRect(0, 0, logicalW, logicalH);
        }

        this.ctx.restore(); // Restore scale
    }
}
