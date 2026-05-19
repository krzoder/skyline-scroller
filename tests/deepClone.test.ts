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
});
