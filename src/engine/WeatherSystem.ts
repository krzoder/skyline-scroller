/**
 * Deterministic weather state machine. Five states, smooth blend between
 * transitions. Render is a no-op for 'clear'; per-state effect modules
 * will plug into draw() in subsequent stages.
 */

import type { Random } from '../utils/Random';
import type { BiomeType } from '../procgen/BiomeSystem';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'sandstorm';

const RAIN_COUNT = 280;
const RAIN_SPEED_MIN = 600;
const RAIN_SPEED_MAX = 950;
const RAIN_LENGTH_MIN = 8;
const RAIN_LENGTH_MAX = 14;

const SNOW_COUNT = 200;
const SNOW_SPEED_MIN = 30;
const SNOW_SPEED_MAX = 80;

const SAND_COUNT = 220;
const SAND_SPEED_MIN = 700;
const SAND_SPEED_MAX = 1100;

interface BiomeWeatherWeights {
    clear: number;
    rain: number;
    snow: number;
    fog: number;
    sandstorm: number;
}

const DEFAULT_WEIGHTS: Record<BiomeType, BiomeWeatherWeights> = {
    forest: { clear: 0.60, rain: 0.25, snow: 0.05, fog: 0.10, sandstorm: 0.00 },
    desert: { clear: 0.65, rain: 0.02, snow: 0.00, fog: 0.03, sandstorm: 0.30 },
    tundra: { clear: 0.40, rain: 0.05, snow: 0.45, fog: 0.10, sandstorm: 0.00 },
    plains: { clear: 0.70, rain: 0.15, snow: 0.05, fog: 0.10, sandstorm: 0.00 },
    city:   { clear: 0.55, rain: 0.25, snow: 0.05, fog: 0.15, sandstorm: 0.00 },
};

const TRANSITION_SEC = 20;
const MIN_DWELL_SEC = 30;
const MAX_DWELL_SEC = 90;

export class WeatherSystem {
    private rng: Random;
    public current: WeatherType = 'clear';
    public target: WeatherType = 'clear';
    public blend: number = 1;
    private dwellRemaining: number;
    private currentBiome: BiomeType = 'plains';

    // Pools: [x, y, vx, vy, phase] per particle. Flat Float32Arrays
    // avoid per-particle object allocation in the hot path.
    private rain = new Float32Array(RAIN_COUNT * 5);
    private rainInitialized = false;
    private snow = new Float32Array(SNOW_COUNT * 5);
    private snowInitialized = false;
    private sand = new Float32Array(SAND_COUNT * 5);
    private sandInitialized = false;

    constructor(rng: Random) {
        this.rng = rng;
        this.dwellRemaining = MIN_DWELL_SEC + this.rng.nextFloat() * (MAX_DWELL_SEC - MIN_DWELL_SEC);
    }

    public setBiome(biome: BiomeType): void {
        this.currentBiome = biome;
    }

    public update(dt: number): void {
        if (this.blend < 1) {
            this.blend = Math.min(1, this.blend + dt / TRANSITION_SEC);
            if (this.blend >= 1) {
                this.current = this.target;
            }
        } else {
            this.dwellRemaining -= dt;
            if (this.dwellRemaining <= 0) {
                this.target = this.pickWeather();
                this.blend = this.target === this.current ? 1 : 0;
                this.dwellRemaining = MIN_DWELL_SEC + this.rng.nextFloat() * (MAX_DWELL_SEC - MIN_DWELL_SEC);
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        const rainI = this.intensityFor('rain');
        const snowI = this.intensityFor('snow');
        const fogI = this.intensityFor('fog');
        const sandI = this.intensityFor('sandstorm');
        if (fogI > 0) this.drawFog(ctx, w, h, fogI);
        if (sandI > 0) this.drawSandstorm(ctx, w, h, sandI);
        if (rainI > 0) this.drawRain(ctx, w, h, rainI);
        if (snowI > 0) this.drawSnow(ctx, w, h, snowI);
    }

    private intensityFor(type: WeatherType): number {
        if (this.current === type && this.target === type) return 1;
        if (this.current === type) return 1 - this.blend;
        if (this.target === type) return this.blend;
        return 0;
    }

    private initRain(w: number, h: number): void {
        for (let i = 0; i < RAIN_COUNT; i++) {
            const base = i * 5;
            this.rain[base + 0] = this.rng.nextFloat() * w;
            this.rain[base + 1] = this.rng.nextFloat() * h;
            this.rain[base + 2] = -40;
            this.rain[base + 3] = RAIN_SPEED_MIN + this.rng.nextFloat() * (RAIN_SPEED_MAX - RAIN_SPEED_MIN);
            this.rain[base + 4] = RAIN_LENGTH_MIN + this.rng.nextFloat() * (RAIN_LENGTH_MAX - RAIN_LENGTH_MIN);
        }
        this.rainInitialized = true;
    }

    private drawRain(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number): void {
        if (!this.rainInitialized) this.initRain(w, h);
        const dt = 1 / 60; // visual-only; intentionally non-deterministic per [[concepts/anti-ai-slop-checklist]]
        ctx.save();
        ctx.strokeStyle = 'rgba(180, 210, 230, 0.55)';
        ctx.lineWidth = 1;
        ctx.globalAlpha = intensity;
        ctx.beginPath();
        const count = Math.floor(RAIN_COUNT * intensity);
        for (let i = 0; i < count; i++) {
            const base = i * 5;
            let x = this.rain[base + 0];
            let y = this.rain[base + 1];
            const vx = this.rain[base + 2];
            const vy = this.rain[base + 3];
            const len = this.rain[base + 4];
            x += vx * dt;
            y += vy * dt;
            if (y > h) { y = -10; x = this.rng.nextFloat() * w; }
            if (x < -20) x += w + 40;
            this.rain[base + 0] = x;
            this.rain[base + 1] = y;
            ctx.moveTo(x, y);
            ctx.lineTo(x - vx * 0.02, y - len);
        }
        ctx.stroke();
        ctx.restore();
    }

    private initSnow(w: number, h: number): void {
        for (let i = 0; i < SNOW_COUNT; i++) {
            const base = i * 5;
            this.snow[base + 0] = this.rng.nextFloat() * w;
            this.snow[base + 1] = this.rng.nextFloat() * h;
            this.snow[base + 2] = -10 + this.rng.nextFloat() * 20;
            this.snow[base + 3] = SNOW_SPEED_MIN + this.rng.nextFloat() * (SNOW_SPEED_MAX - SNOW_SPEED_MIN);
            this.snow[base + 4] = this.rng.nextFloat() * Math.PI * 2;
        }
        this.snowInitialized = true;
    }

    private drawSnow(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number): void {
        if (!this.snowInitialized) this.initSnow(w, h);
        const dt = 1 / 60;
        ctx.save();
        ctx.fillStyle = 'rgba(240, 245, 250, 0.85)';
        ctx.globalAlpha = intensity;
        const count = Math.floor(SNOW_COUNT * intensity);
        for (let i = 0; i < count; i++) {
            const base = i * 5;
            let x = this.snow[base + 0];
            let y = this.snow[base + 1];
            const vx = this.snow[base + 2];
            const vy = this.snow[base + 3];
            const phase = this.snow[base + 4] + dt * 1.3;
            x += (vx + Math.sin(phase) * 12) * dt;
            y += vy * dt;
            if (y > h) { y = -5; x = this.rng.nextFloat() * w; }
            if (x < -10) x += w + 20;
            else if (x > w + 10) x -= w + 20;
            this.snow[base + 0] = x;
            this.snow[base + 1] = y;
            this.snow[base + 4] = phase;
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.restore();
    }

    private drawFog(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number): void {
        ctx.save();
        ctx.fillStyle = 'rgb(210, 215, 220)';
        ctx.globalAlpha = 0.35 * intensity;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    private initSand(w: number, h: number): void {
        for (let i = 0; i < SAND_COUNT; i++) {
            const base = i * 5;
            this.sand[base + 0] = this.rng.nextFloat() * w;
            this.sand[base + 1] = this.rng.nextFloat() * h;
            this.sand[base + 2] = SAND_SPEED_MIN + this.rng.nextFloat() * (SAND_SPEED_MAX - SAND_SPEED_MIN);
            this.sand[base + 3] = -30 + this.rng.nextFloat() * 60;
            this.sand[base + 4] = 6 + this.rng.nextFloat() * 14;
        }
        this.sandInitialized = true;
    }

    private drawSandstorm(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number): void {
        // Warm tint layer first - the world goes yellow.
        ctx.save();
        ctx.fillStyle = 'rgb(214, 175, 110)';
        ctx.globalAlpha = 0.45 * intensity;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        // Then the sand streaks driven horizontally.
        if (!this.sandInitialized) this.initSand(w, h);
        const dt = 1 / 60;
        ctx.save();
        ctx.strokeStyle = 'rgba(230, 200, 140, 0.7)';
        ctx.lineWidth = 1;
        ctx.globalAlpha = intensity;
        ctx.beginPath();
        const count = Math.floor(SAND_COUNT * intensity);
        for (let i = 0; i < count; i++) {
            const base = i * 5;
            let x = this.sand[base + 0];
            let y = this.sand[base + 1];
            const vx = this.sand[base + 2];
            const vy = this.sand[base + 3];
            const len = this.sand[base + 4];
            x += vx * dt;
            y += vy * dt;
            if (x > w + 20) { x = -10; y = this.rng.nextFloat() * h; }
            if (y < -10) y = h - 10; else if (y > h + 10) y = 10;
            this.sand[base + 0] = x;
            this.sand[base + 1] = y;
            ctx.moveTo(x, y);
            ctx.lineTo(x - len, y - vy * 0.005);
        }
        ctx.stroke();
        ctx.restore();
    }

    public getState(): { current: WeatherType; target: WeatherType; blend: number } {
        return { current: this.current, target: this.target, blend: this.blend };
    }

    public forceWeather(w: WeatherType): void {
        this.current = w;
        this.target = w;
        this.blend = 1;
        this.dwellRemaining = MIN_DWELL_SEC + this.rng.nextFloat() * (MAX_DWELL_SEC - MIN_DWELL_SEC);
    }

    private pickWeather(): WeatherType {
        const w = DEFAULT_WEIGHTS[this.currentBiome];
        const r = this.rng.nextFloat();
        let acc = 0;
        const order: WeatherType[] = ['clear', 'rain', 'snow', 'fog', 'sandstorm'];
        for (const t of order) {
            acc += w[t];
            if (r < acc) return t;
        }
        return 'clear';
    }
}
