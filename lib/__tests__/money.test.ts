import { describe, expect, it } from 'vitest';
import {
  addMoney,
  assertIntegerCentavos,
  formatMoney,
  multiplyMoney,
  parsePesosToCentavos,
  subtractMoney,
} from '../money';

describe('money utilities', () => {
  describe('assertIntegerCentavos', () => {
    it('allows valid integers and throws on floats', () => {
      expect(() => assertIntegerCentavos(100)).not.toThrow();
      expect(() => assertIntegerCentavos(0)).not.toThrow();
      expect(() => assertIntegerCentavos(10.5)).toThrow(TypeError);
    });
  });

  describe('formatMoney', () => {
    it('formats whole pesos correctly', () => {
      expect(formatMoney(100000)).toBe('₱1,000.00');
      expect(formatMoney(0)).toBe('₱0.00');
      expect(formatMoney(50)).toBe('₱0.50');
    });

    it('formats thousands with commas', () => {
      expect(formatMoney(123450)).toBe('₱1,234.50');
      expect(formatMoney(100000000)).toBe('₱1,000,000.00');
    });

    it('formats negative amounts correctly', () => {
      expect(formatMoney(-50000)).toBe('-₱500.00');
      expect(formatMoney(-75)).toBe('-₱0.75');
    });

    it('throws when given non-integer centavos', () => {
      expect(() => formatMoney(12.34)).toThrow(TypeError);
    });
  });

  describe('parsePesosToCentavos', () => {
    it('converts floating point string/number correctly without rounding artifacts', () => {
      expect(parsePesosToCentavos(19.99)).toBe(1999);
      expect(parsePesosToCentavos('1234.50')).toBe(123450);
      expect(parsePesosToCentavos('0')).toBe(0);
      expect(parsePesosToCentavos(0.1)).toBe(10);
    });

    it('throws on invalid input', () => {
      expect(() => parsePesosToCentavos('abc')).toThrow();
      expect(() => parsePesosToCentavos(Number.NaN)).toThrow();
    });
  });

  describe('arithmetic operations', () => {
    it('adds multiple centavo values', () => {
      expect(addMoney(1000, 2500, 500)).toBe(4000);
      expect(addMoney()).toBe(0);
    });

    it('subtracts centavo values', () => {
      expect(subtractMoney(5000, 1500)).toBe(3500);
    });

    it('multiplies integer centavos by integer quantity', () => {
      expect(multiplyMoney(25000, 3)).toBe(75000);
      expect(() => multiplyMoney(25000, 1.5)).toThrow(TypeError);
    });

    it('throws error if non-integers are passed to arithmetic', () => {
      expect(() => addMoney(10.5, 20)).toThrow(TypeError);
      expect(() => subtractMoney(100, 20.2)).toThrow(TypeError);
    });
  });
});
