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

  describe('nextInt edge cases', () => {
    it('returns min when min === max (no infinite loop, no NaN)', () => {
      const rng = new Random(1);
      expect(rng.nextInt(5, 5)).toBe(5);
    });

    it('returns min when max < min (clamped, not crashed)', () => {
      const rng = new Random(1);
      expect(rng.nextInt(10, 3)).toBe(10);
    });
  });

  describe('fork(label)', () => {
    it('returns a Random instance', () => {
      const parent = new Random(42);
      const child = parent.fork('test');
      expect(child).toBeInstanceOf(Random);
    });

    it('same label on same parent state yields same child stream', () => {
      const parentA = new Random(42);
      const parentB = new Random(42);
      const childA = parentA.fork('foo');
      const childB = parentB.fork('foo');
      const seqA = Array.from({ length: 10 }, () => childA.nextFloat());
      const seqB = Array.from({ length: 10 }, () => childB.nextFloat());
      expect(seqA).toEqual(seqB);
    });

    it('different labels yield independent streams', () => {
      const parent = new Random(42);
      const childFoo = parent.fork('foo');
      const childBar = parent.fork('bar');
      const seqFoo = Array.from({ length: 10 }, () => childFoo.nextFloat());
      const seqBar = Array.from({ length: 10 }, () => childBar.nextFloat());
      expect(seqFoo).not.toEqual(seqBar);
    });

    it('does not advance the parent state', () => {
      const parent1 = new Random(42);
      const parent2 = new Random(42);
      parent1.fork('whatever');
      // parent1 should still produce the same sequence as a fresh seed-42 stream
      const seq1 = Array.from({ length: 5 }, () => parent1.nextFloat());
      const seq2 = Array.from({ length: 5 }, () => parent2.nextFloat());
      expect(seq1).toEqual(seq2);
    });

    it('child stream is independent of subsequent parent draws', () => {
      const parent = new Random(42);
      const child = parent.fork('child');
      const childSeq = Array.from({ length: 5 }, () => child.nextFloat());
      // advance parent
      for (let i = 0; i < 100; i++) parent.nextFloat();
      // child sequence already captured — must be unaffected
      const child2 = new Random(42).fork('child');
      const child2Seq = Array.from({ length: 5 }, () => child2.nextFloat());
      expect(childSeq).toEqual(child2Seq);
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
