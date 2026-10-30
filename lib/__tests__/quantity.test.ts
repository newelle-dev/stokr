import { describe, expect, it } from 'vitest';
import { assertIntegerQuantity, parseQuantityInput } from '../quantity';

describe('quantity utilities', () => {
  describe('assertIntegerQuantity', () => {
    it('allows valid integers and throws on floats', () => {
      expect(() => assertIntegerQuantity(10)).not.toThrow();
      expect(() => assertIntegerQuantity(0)).not.toThrow();
      expect(() => assertIntegerQuantity(-5)).not.toThrow();
      expect(() => assertIntegerQuantity(10.5)).toThrow(TypeError);
      expect(() => assertIntegerQuantity(0.1)).toThrow(TypeError);
    });
  });

  describe('parseQuantityInput', () => {
    it('parses positive integers with default options (min: 1, max: 100,000, allowZero: false)', () => {
      expect(parseQuantityInput('1')).toEqual({ success: true, quantity: 1 });
      expect(parseQuantityInput('50')).toEqual({ success: true, quantity: 50 });
      expect(parseQuantityInput('+10')).toEqual({ success: true, quantity: 10 });
      expect(parseQuantityInput('100000')).toEqual({ success: true, quantity: 100000 });
      expect(parseQuantityInput(25)).toEqual({ success: true, quantity: 25 });
    });

    it('rejects decimal numbers with descriptive error', () => {
      const res = parseQuantityInput('1.5');
      expect(res).toEqual({ success: false, error: 'Quantity must be a whole number.' });

      const res2 = parseQuantityInput('2.0');
      expect(res2).toEqual({ success: false, error: 'Quantity must be a whole number.' });
    });

    it('rejects scientific notation', () => {
      expect(parseQuantityInput('1e3')).toEqual({
        success: false,
        error: 'Quantity must be a valid whole integer.',
      });
    });

    it('rejects zero by default and allows zero when allowZero is true', () => {
      expect(parseQuantityInput('0')).toEqual({
        success: false,
        error: 'Quantity cannot be 0.',
      });

      expect(parseQuantityInput('0', { allowZero: true, min: 0 })).toEqual({
        success: true,
        quantity: 0,
      });
    });

    it('rejects negative numbers when min is positive', () => {
      expect(parseQuantityInput('-5')).toEqual({
        success: false,
        error: 'Quantity cannot be less than 1.',
      });
    });

    it('supports signed adjustments when min is negative', () => {
      const options = { min: -100000, max: 100000, allowZero: false, fieldName: 'Adjustment quantity' };
      expect(parseQuantityInput('-5', options)).toEqual({ success: true, quantity: -5 });
      expect(parseQuantityInput('+12', options)).toEqual({ success: true, quantity: 12 });
      expect(parseQuantityInput('0', options)).toEqual({
        success: false,
        error: 'Adjustment quantity cannot be 0.',
      });
    });

    it('enforces maximum bound', () => {
      expect(parseQuantityInput('100001')).toEqual({
        success: false,
        error: 'Quantity cannot be greater than 100,000.',
      });
    });

    it('rejects empty, null, and non-numeric strings', () => {
      expect(parseQuantityInput('')).toEqual({ success: false, error: 'Quantity is required.' });
      expect(parseQuantityInput('   ')).toEqual({ success: false, error: 'Quantity is required.' });
      expect(parseQuantityInput(null)).toEqual({ success: false, error: 'Quantity is required.' });
      expect(parseQuantityInput(undefined)).toEqual({ success: false, error: 'Quantity is required.' });
      expect(parseQuantityInput('abc')).toEqual({
        success: false,
        error: 'Quantity must be a valid whole integer.',
      });
      expect(parseQuantityInput('10 items')).toEqual({
        success: false,
        error: 'Quantity must be a valid whole integer.',
      });
    });
  });
});
