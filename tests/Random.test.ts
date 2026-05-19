import { describe, it, expect } from 'vitest';
import { Random } from '../src/utils/Random';

describe('Random (Mulberry32 PRNG)', () => {
  describe('Deterministic seeding', () => {
    it('produces the same sequence for the same numeric seed', () => {
      const a = new Random(42);
      const b = new Random(42);
      const seqA = Array.from({ length: 10 }, () => a.nextFloat());
      const seqB = Array.from({ length: 10 }, () => b.nextFloat());
      expect(seqA).toEqual(seqB);
    });

    it('produces the same sequence for the same string seed', () => {
      const a = new Random('hello');
      const b = new Random('hello');
      const seqA = Array.from({ length: 10 }, () => a.nextFloat());
      const seqB = Array.from({ length: 10 }, () => b.nextFloat());
      expect(seqA).toEqual(seqB);
    });

    it('produces different sequences for different seeds', () => {
      const a = new Random(42);
      const b = new Random(99);
      const seqA = Array.from({ length: 5 }, () => a.nextFloat());
      const seqB = Array.from({ length: 5 }, () => b.nextFloat());
      expect(seqA).not.toEqual(seqB);
    });
  });

  describe('nextFloat()', () => {
    it('returns values between 0 (inclusive) and 1 (exclusive)', () => {
      const rng = new Random(12345);
      for (let i = 0; i < 1000; i++) {
        const val = rng.nextFloat();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('nextInt(min, max)', () => {
    it('returns integers within the specified range [min, max)', () => {
      const rng = new Random(777);
      for (let i = 0; i < 500; i++) {
        const val = rng.nextInt(5, 15);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThan(15);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('returns min when min === max - 1', () => {
      const rng = new Random(1);
      const val = rng.nextInt(3, 4);
      expect(val).toBe(3);
    });
  });

  describe('nextRange(min, max)', () => {
    it('returns floats within the specified range [min, max)', () => {
      const rng = new Random(555);
      for (let i = 0; i < 500; i++) {
        const val = rng.nextRange(2.5, 7.5);
        expect(val).toBeGreaterThanOrEqual(2.5);
        expect(val).toBeLessThan(7.5);
      }
    });
  });

  describe('Distribution quality', () => {
    it('produces roughly uniform distribution', () => {
      const rng = new Random(99999);
      const buckets = [0, 0, 0, 0, 0]; // 5 buckets for [0,0.2), [0.2,0.4), etc.
      const N = 5000;
      for (let i = 0; i < N; i++) {
        const val = rng.nextFloat();
        const bucket = Math.min(Math.floor(val * 5), 4);
        buckets[bucket]++;
      }
      const expected = N / 5;
      for (const count of buckets) {
        // Each bucket should be within 15% of the expected count
        expect(count).toBeGreaterThan(expected * 0.85);
        expect(count).toBeLessThan(expected * 1.15);
      }
    });
  });
});
