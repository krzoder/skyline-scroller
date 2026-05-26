import { deepClone } from '../utils/deepClone';
import { Layer } from './Layer';
import { CityGenerator } from '../procgen/CityGenerator';
import type { TreeConfig } from '../procgen/TreeConfig';
import { DEFAULT_TREE_CONFIG } from '../procgen/TreeConfig';
import { Random } from '../utils/Random';
import { CAMERA_SPEED_PX_PER_S, GROUND_HEIGHT_PX } from '../config';

import { SkySystem } from './SkySystem';

export interface GameStateSnapshot {
    seed: string;
    cameraX: number;
    skyTime: number | null;
    timeFormat: 'score' | '24h' | '12h';
    biome: string | null;
}

export type TickListener = (snap: Readonly<GameStateSnapshot>) => void;

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lastTime: number = 0;
    private isRunning: boolean = false;

    private cameraX: number = 0;
    private cameraSpeed: number = CAMERA_SPEED_PX_PER_S;

    private layers: Layer[] = [];
    public generator: CityGenerator | null = null;
    private sky: SkySystem | null = null;
    private seed: string = "default";
    public treeConfig: TreeConfig; // Custom config

    private noisePattern: CanvasPattern | null = null;
    private rootRng: Random | null = null;
    private prevCameraX: number = 0;
    private rafId: number | null = null;
    private resizeHandler: (() => void) | null = null;

    private readonly scaleFactor = 1.6;
    public timeScale: number = 1.0;
    private volume: number = 1.0;
    private isMuted: boolean = false;
    private isPreview: boolean = false;
    public timeFormat: 'score' | '24h' | '12h' = '24h';

    // Reused single snapshot so per-frame fan-out to listeners costs no
    // allocation. Mutated in-place inside getStateSnapshot(); listeners get
    // a Readonly view and must not retain the reference across ticks.
    private readonly snapshot: GameStateSnapshot = {
        seed: '',
        cameraX: 0,
        skyTime: null,
        timeFormat: '24h',
        biome: null,
    };
    private tickListeners: TickListener[] = [];

    constructor(canvas: HTMLCanvasElement, isPreview: boolean = false) {
        this.canvas = canvas;
        this.isPreview = isPreview;
        this.ctx = canvas.getContext('2d')!;
        if (!this.ctx) {
            throw new Error("Could not get 2D context");
        }

        this.treeConfig = deepClone(DEFAULT_TREE_CONFIG);

        this.reset();

        if (!this.isPreview) {
            this.resizeHandler = () => this.resize();
            window.addEventListener('resize', this.resizeHandler);
        }
        this.resize();
    }

    public dispose() {
        if (!this.isRunning && this.rafId === null && this.resizeHandler === null && this.tickListeners.length === 0) return; // idempotent
        this.isRunning = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.resizeHandler !== null) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        this.tickListeners.length = 0;
    }

    private initNoise(rng: Random) {
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
            const val = rng.nextInt(0, 256);
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

    public getSeed(): string {
        return this.seed;
    }

    public getCameraX(): number {
        return this.cameraX;
    }

    public getDebugState(): Record<string, unknown> {
        return {
            seed: this.seed,
            cameraX: Math.round(this.cameraX * 100) / 100,
            timeScale: this.timeScale,
            skyTime: this.sky ? Math.round(this.sky.getTime() * 100) / 100 : null,
            currentBiome: this.generator?.getCurrentBiome() ?? null,
            timeFormat: this.timeFormat,
            volume: this.volume,
            isMuted: this.isMuted,
        };
    }

    public getStateSnapshot(): Readonly<GameStateSnapshot> {
        this.snapshot.seed = this.seed;
        this.snapshot.cameraX = this.cameraX;
        this.snapshot.skyTime = this.sky ? this.sky.getTime() : null;
        this.snapshot.timeFormat = this.timeFormat;
        this.snapshot.biome = this.generator?.getCurrentBiome() ?? null;
        return this.snapshot;
    }

    public onTick(cb: TickListener): () => void {
        this.tickListeners.push(cb);
        return () => {
            const i = this.tickListeners.indexOf(cb);
            if (i >= 0) this.tickListeners.splice(i, 1);
        };
    }

    public setCameraX(x: number) {
        this.cameraX = x;
    }

    private reset() {
        this.cameraX = 0;
        this.prevCameraX = 0;
        this.rootRng = new Random(this.seed);

        this.layers = [
            new Layer(0.2, 0, 190, 1.3), // Background (Highest up)
            new Layer(0.4, 1, 100), // Mid-Back
            new Layer(0.6, 2, 50),  // Mid-Fore
            new Layer(1.0, 3, 0)    // Foreground (Ground level)
        ];

        // Independent sub-streams keep procgen/sky/noise from correlating.
        this.initNoise(this.rootRng.fork('noise'));
        this.generator = new CityGenerator(this.seed, this.layers.length, this.treeConfig, this.rootRng.fork('city'));
        if (!this.isPreview) this.sky = new SkySystem(this.canvas, this.rootRng.fork('sky'));
    }

    public resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    private loop(time: number) {
        if (!this.isRunning) return;

        try {
            const deltaTime = (time - this.lastTime) / 1000;
            this.lastTime = time;

            // Cap dt to prevent huge jumps if tab was inactive
            const safeDt = Math.min(deltaTime, 0.1);

            this.update(safeDt * this.timeScale);
            this.render();
        } catch (e) {
            console.error("Game Loop Error:", e);
            this.isRunning = false;
            this.rafId = null;
            return;
        }

        this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    private update(dt: number) {
        this.cameraX += this.cameraSpeed * dt;

        const logicalW = this.canvas.width / this.scaleFactor;

        this.sky?.update(dt, logicalW);

        // Generate new buildings if needed; pass real camera-pixel delta so
        // BiomeSystem.durationRemaining can be measured in pixels, not frames.
        if (this.generator) {
            const dx = this.cameraX - this.prevCameraX;
            this.generator.generate(this.layers, this.cameraX, logicalW, dx);
            this.prevCameraX = this.cameraX;
        }

        this.layers.forEach(l => l.prune(this.cameraX));

        if (this.tickListeners.length > 0) {
            const snap = this.getStateSnapshot();
            // Snapshot the listener list so a self-unsubscribe inside a
            // callback can't shift the next listener out of this frame.
            const cbs = this.tickListeners.slice();
            for (let i = 0; i < cbs.length; i++) {
                cbs[i](snap);
            }
        }
    }

    private render() {
        const logicalW = this.canvas.width / this.scaleFactor;
        const logicalH = this.canvas.height / this.scaleFactor;

        this.ctx.save();
        this.ctx.scale(this.scaleFactor, this.scaleFactor);

        if (this.sky) {
            this.sky.draw(this.ctx, logicalW, logicalH);
        } else {
            this.ctx.fillStyle = "#000";
            this.ctx.fillRect(0, 0, logicalW, logicalH);
        }

        const groundY = logicalH - GROUND_HEIGHT_PX;

        this.ctx.save();
        this.ctx.translate(0, groundY);

        this.layers.forEach(layer => {
            layer.draw(this.ctx, this.cameraX, logicalW, logicalH, this.scaleFactor);
        });

        this.ctx.restore();

        // Solid earth below groundY hides sky pixels that would otherwise show through.
        this.ctx.fillStyle = "#2e2e2e";
        this.ctx.fillRect(0, groundY, logicalW, 80);

        // Ambient light overlay via multiply blending.
        if (this.sky) {
            const ambient = this.sky.getAmbientColor();

            this.ctx.globalCompositeOperation = 'multiply';
            this.ctx.fillStyle = ambient;
            this.ctx.fillRect(0, 0, logicalW, logicalH);

            this.ctx.globalCompositeOperation = 'source-over';
        }

        // Noise dithering fixes gradient banding.
        if (this.noisePattern) {
            this.ctx.fillStyle = this.noisePattern;
            this.ctx.fillRect(0, 0, logicalW, logicalH);
        }

        this.ctx.restore();
    }

    public setTimeScale(scale: number) {
        this.timeScale = scale;
    }

    public getVolume(): number {
        return this.volume;
    }

    public setVolume(vol: number) {
        this.volume = vol;
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    public setMuted(muted: boolean) {
        this.isMuted = muted;
    }
}
