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

    // Rain particle pool: [x, y, vx, vy, length] x N. Flat Float32Array
    // avoids per-particle object allocation.
    private rain = new Float32Array(RAIN_COUNT * 5);
    private rainInitialized = false;

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
        const rainIntensity = this.intensityFor('rain');
        if (rainIntensity > 0) this.drawRain(ctx, w, h, rainIntensity);
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
