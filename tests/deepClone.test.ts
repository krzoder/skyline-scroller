import { describe, it, expect } from 'vitest';
import { deepClone } from '../src/utils/deepClone';

describe('deepClone', () => {
  it('returns an equal but distinct object', () => {
    const src = { a: 1, b: { c: [2, 3] } };
    const out = deepClone(src);
    expect(out).toEqual(src);
    expect(out).not.toBe(src);
    expect(out.b).not.toBe(src.b);
    expect(out.b.c).not.toBe(src.b.c);
  });

  it('mutation of clone does not affect source', () => {
    const src = { nested: { value: 1 } };
    const out = deepClone(src);
    out.nested.value = 99;
    expect(src.nested.value).toBe(1);
  });

  it('handles arrays', () => {
    const src = [1, [2, 3], { x: 4 }];
    const out = deepClone(src);
    expect(out).toEqual(src);
    expect(out).not.toBe(src);
    expect(out[1]).not.toBe(src[1]);
  });

  it('handles primitives', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(null)).toBe(null);
    expect(deepClone(true)).toBe(true);
  });

  it('preserves Date instances (JSON impl would stringify these)', () => {
    const src = { when: new Date('2024-01-15T00:00:00Z') };
    const out = deepClone(src);
    expect(out.when).toBeInstanceOf(Date);
    expect(out.when.getTime()).toBe(src.when.getTime());
    expect(out.when).not.toBe(src.when);
  });

  it('preserves Map and Set (JSON impl would drop these to {})', () => {
    const src = {
      m: new Map<string, number>([['a', 1], ['b', 2]]),
      s: new Set<number>([1, 2, 3]),
    };
    const out = deepClone(src);
    expect(out.m).toBeInstanceOf(Map);
    expect(out.s).toBeInstanceOf(Set);
    expect(out.m.get('a')).toBe(1);
    expect(out.s.has(2)).toBe(true);
    expect(out.m).not.toBe(src.m);
  });

  it('preserves NaN and Infinity (JSON impl would coerce to null)', () => {
    const src = { nan: NaN, inf: Infinity, ninf: -Infinity };
    const out = deepClone(src);
    expect(out.nan).toBeNaN();
    expect(out.inf).toBe(Infinity);
    expect(out.ninf).toBe(-Infinity);
  });

  it('handles circular references (JSON impl would throw)', () => {
    type Node = { name: string; self?: Node };
    const src: Node = { name: 'root' };
    src.self = src;
    const out = deepClone(src);
    expect(out.name).toBe('root');
    expect(out.self).toBe(out);
    expect(out).not.toBe(src);
  });
});
