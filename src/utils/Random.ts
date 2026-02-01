/**
 * A simple seeded random number generator (Mulberry32).
 */
export class Random {
    private state: number;

    constructor(seed: number | string) {
        if (typeof seed === 'string') {
            this.state = this.cyrb128(seed);
        } else {
            this.state = seed >>> 0;
        }
    }

    // Simple hashing function for string seeds
    private cyrb128(str: string): number {
        let h1 = 1779033703, h2 = 3144134277,
            h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < str.length; i++) {
            k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
    }

    // Returns a number between 0 and 1
    public nextFloat(): number {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // Returns an integer between min (inclusive) and max (exclusive)
    public nextInt(min: number, max: number): number {
        return Math.floor(this.nextFloat() * (max - min)) + min;
    }

    public nextRange(min: number, max: number): number {
        return this.nextFloat() * (max - min) + min;
    }
}
