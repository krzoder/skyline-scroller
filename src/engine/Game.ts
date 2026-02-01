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

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        if (!this.ctx) {
            throw new Error("Could not get 2D context");
        }

        // Initialize Logic
        this.reset();

        // Bind resize
        window.addEventListener('resize', () => this.resize());
        this.resize();
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
            new Layer(0.2, 0, 150), // Background (Highest up)
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
        this.sky?.update(dt);

        // Generate new buildings if needed
        if (this.generator) {
            this.generator.generate(this.layers, this.cameraX, this.canvas.width);
        }

        // Prune old
        this.layers.forEach(l => l.prune(this.cameraX));

        // Update Debug UI
        const seedDisplay = document.getElementById('current-seed');
        if (seedDisplay) {
            // Show FPS/Time for debug
            seedDisplay.innerText = `${this.seed} | T: ${Math.floor(this.cameraX)}`;
        }
    }

    private render() {
        // Clear screen
        // Draw Sky first
        if (this.sky) {
            this.sky.draw(this.ctx);
        } else {
            this.ctx.fillStyle = "#000";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        const groundY = this.canvas.height - 80; // Lift baseline so we see the ground/road

        this.ctx.save();
        this.ctx.translate(0, groundY);

        this.layers.forEach(layer => {
            layer.draw(this.ctx, this.cameraX, this.canvas.width, this.canvas.height);
        });

        this.ctx.restore();

        // Draw Solid Earth below groundY to hide sky
        this.ctx.fillStyle = "#2e2e2e"; // Dark earth color
        this.ctx.fillRect(0, groundY, this.canvas.width, 80);
    }
}
