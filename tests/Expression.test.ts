import { describe, it, expect } from 'vitest';
import { evalExpression, ExpressionError } from '../src/utils/Expression';

describe('evalExpression', () => {
  describe('basic arithmetic', () => {
    it('integers', () => {
      expect(evalExpression('1 + 2')).toBe(3);
      expect(evalExpression('5 - 3')).toBe(2);
      expect(evalExpression('4 * 6')).toBe(24);
      expect(evalExpression('10 / 4')).toBe(2.5);
    });

    it('decimals', () => {
      expect(evalExpression('0.5 + 0.25')).toBe(0.75);
      expect(evalExpression('1.5 * 2')).toBe(3);
    });

    it('scientific notation', () => {
      expect(evalExpression('1e3')).toBe(1000);
      expect(evalExpression('2.5e-2')).toBe(0.025);
    });

    it('operator precedence', () => {
      expect(evalExpression('1 + 2 * 3')).toBe(7);
      expect(evalExpression('(1 + 2) * 3')).toBe(9);
      expect(evalExpression('2 + 3 * 4 - 1')).toBe(13);
    });

    it('unary minus', () => {
      expect(evalExpression('-5')).toBe(-5);
      expect(evalExpression('-(1 + 2)')).toBe(-3);
      expect(evalExpression('5 - -3')).toBe(8);
      expect(evalExpression('--5')).toBe(5);
    });

    it('unary plus', () => {
      expect(evalExpression('+5')).toBe(5);
      expect(evalExpression('+(1 + 2)')).toBe(3);
    });

    it('division', () => {
      expect(evalExpression('1/2')).toBe(0.5);
      expect(evalExpression('1/3')).toBeCloseTo(0.3333, 3);
    });
  });

  describe('constants', () => {
    it('π / pi', () => {
      expect(evalExpression('π')).toBe(Math.PI);
      expect(evalExpression('pi')).toBe(Math.PI);
      expect(evalExpression('2*π')).toBeCloseTo(2 * Math.PI, 10);
    });

    it('e', () => {
      expect(evalExpression('e')).toBe(Math.E);
      expect(evalExpression('e*2')).toBeCloseTo(2 * Math.E, 10);
    });
  });

  describe('safety — rejects code-exec attempts', () => {
    it('arrow function IIFE locks rejected', () => {
      expect(() => evalExpression('(()=>1)()')).toThrow(ExpressionError);
    });

    it('infinite loop syntax rejected', () => {
      expect(() => evalExpression('(()=>{while(1);})()')).toThrow(ExpressionError);
    });

    it('member access rejected', () => {
      expect(() => evalExpression('Math.PI')).toThrow(ExpressionError);
    });

    it('identifiers rejected', () => {
      expect(() => evalExpression('alert')).toThrow(ExpressionError);
      expect(() => evalExpression('x + 1')).toThrow(ExpressionError);
    });

    it('function calls rejected', () => {
      expect(() => evalExpression('sin(1)')).toThrow(ExpressionError);
    });

    it('empty input rejected', () => {
      expect(() => evalExpression('')).toThrow(ExpressionError);
      expect(() => evalExpression('   ')).toThrow(ExpressionError);
    });

    it('mismatched parens rejected', () => {
      expect(() => evalExpression('(1 + 2')).toThrow(ExpressionError);
      expect(() => evalExpression('1 + 2)')).toThrow(ExpressionError);
    });
  });
});
