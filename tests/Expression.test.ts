import { describe, it, expect } from 'vitest';
import { evalExpression, ExpressionError } from '../src/utils/Expression';

describe('evalExpression', () => {
  describe('basic arithmetic', () => {
    it.each([
      ['1 + 2', 3],
      ['5 - 3', 2],
      ['4 * 6', 24],
      ['10 / 4', 2.5],
      ['0.5 + 0.25', 0.75],
      ['1.5 * 2', 3],
      ['1e3', 1000],
      ['2.5e-2', 0.025],
      ['1 + 2 * 3', 7],
      ['(1 + 2) * 3', 9],
      ['2 + 3 * 4 - 1', 13],
      ['-5', -5],
      ['-(1 + 2)', -3],
      ['5 - -3', 8],
      ['--5', 5],
      ['+5', 5],
      ['+(1 + 2)', 3],
      ['1/2', 0.5],
    ])('%s -> %s', (input, expected) => {
      expect(evalExpression(input)).toBe(expected);
    });

    it('1/3 (approximate)', () => {
      expect(evalExpression('1/3')).toBeCloseTo(0.3333, 3);
    });
  });

  describe('constants', () => {
    it.each([
      ['π', Math.PI],
      ['pi', Math.PI],
      ['e', Math.E],
    ])('%s -> %s', (input, expected) => {
      expect(evalExpression(input)).toBe(expected);
    });

    it.each([
      ['2*π', 2 * Math.PI],
      ['e*2', 2 * Math.E],
    ])('%s (approximate)', (input, expected) => {
      expect(evalExpression(input)).toBeCloseTo(expected, 10);
    });
  });

  describe('safety - rejects code-exec attempts', () => {
    it.each([
      ['arrow function IIFE', '(()=>1)()'],
      ['infinite loop syntax', '(()=>{while(1);})()'],
      ['member access', 'Math.PI'],
      ['identifier alert', 'alert'],
      ['identifier x', 'x + 1'],
      ['function call sin', 'sin(1)'],
      ['empty input', ''],
      ['whitespace input', '   '],
      ['unclosed paren', '(1 + 2'],
      ['extra closing paren', '1 + 2)'],
    ])('rejects: %s', (_label, input) => {
      expect(() => evalExpression(input)).toThrow(ExpressionError);
    });
  });
});
