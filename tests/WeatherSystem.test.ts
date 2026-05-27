import { describe, it, expect } from 'vitest';
import { Random } from '../src/utils/Random';
import { WeatherSystem } from '../src/engine/WeatherSystem';

describe('WeatherSystem', () => {
    it('starts in clear state with blend = 1', () => {
        const w = new WeatherSystem(new Random('w-seed').fork('weather'));
        const s = w.getState();
        expect(s.current).toBe('clear');
        expect(s.target).toBe('clear');
        expect(s.blend).toBe(1);
    });

    it('forceWeather sets current and target immediately', () => {
        const w = new WeatherSystem(new Random('w').fork('weather'));
        w.forceWeather('rain');
        const s = w.getState();
        expect(s.current).toBe('rain');
        expect(s.target).toBe('rain');
        expect(s.blend).toBe(1);
    });

    it('setBiome updates current biome without touching weather state', () => {
        const w = new WeatherSystem(new Random('w').fork('weather'));
        w.forceWeather('snow');
        w.setBiome('tundra');
        expect(w.getState().current).toBe('snow');
    });

    it('two systems with the same fork + biome produce identical rolls', () => {
        const a = new WeatherSystem(new Random('seed').fork('weather'));
        const b = new WeatherSystem(new Random('seed').fork('weather'));
        a.setBiome('forest');
        b.setBiome('forest');
        const ticks = 200;
        for (let i = 0; i < ticks; i++) {
            a.update(1);
            b.update(1);
        }
        expect(a.getState().current).toBe(b.getState().current);
        expect(a.getState().target).toBe(b.getState().target);
    });

    it('forceWeather wins over biome-driven rolls during the dwell window', () => {
        const w = new WeatherSystem(new Random('w').fork('weather'));
        w.setBiome('desert');
        w.forceWeather('rain');
        // Tick a couple of seconds; dwell remaining is reset by forceWeather
        for (let i = 0; i < 5; i++) w.update(1);
        expect(w.getState().current).toBe('rain');
    });
});
