/**
 * Tiny pure-math helpers shared across engine + UI. Zero dependencies,
 * zero side effects. Add only utilities whose pattern repeats 3+ times.
 */

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}
