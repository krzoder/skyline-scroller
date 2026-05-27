/**
 * Deterministic weather state machine. Five states, smooth blend between
 * transitions. Render is a no-op for 'clear'; per-state effect modules
 * will plug into draw() in subsequent stages.
 */

import type { Random } from '../utils/Random';
import type { BiomeType } from '../procgen/BiomeSystem';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'sandstorm';

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

    public draw(_ctx: CanvasRenderingContext2D, _w: number, _h: number): void {
        // No-op for 'clear'. Per-effect renderers (rain/snow/fog/sandstorm)
        // wire in here via subsequent stages.
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
