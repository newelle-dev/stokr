/**
 * Quantity utilities for Stokr.
 * Invariant: Stock quantities are handled strictly as whole integers.
 * No floating-point quantities anywhere in inventory math or data entry.
 */

export function assertIntegerQuantity(quantity: number): void {
  if (!Number.isInteger(quantity)) {
    throw new TypeError(`Expected integer quantity, received: ${quantity}`);
  }
}

export type ParseQuantityResult =
  | { success: true; quantity: number }
  | { success: false; error: string };

export interface ParseQuantityOptions {
  min?: number;
  max?: number;
  allowZero?: boolean;
  fieldName?: string;
}

/**
 * Strict parser for user-entered stock quantities.
 * Rules:
 * - Whole integers only (no decimals, no exponents, no comma formatting).
 * - Optional leading sign (+ or -) allowed when min < 0.
 * - Rejects non-numeric text, blank strings, and trailing characters.
 * - Checks configurable min, max, and allowZero bounds.
 * - Never silently defaults to 0.
 */
export function parseQuantityInput(
  rawInput: unknown,
  options?: ParseQuantityOptions
): ParseQuantityResult {
  const fieldName = options?.fieldName ?? 'Quantity';
  const min = options?.min ?? 1;
  const max = options?.max ?? 100000;
  const allowZero = options?.allowZero ?? false;

  if (rawInput === null || rawInput === undefined) {
    return { success: false, error: `${fieldName} is required.` };
  }

  const str = String(rawInput).trim();
  if (str === '') {
    return { success: false, error: `${fieldName} is required.` };
  }

  // Reject decimals immediately
  if (str.includes('.')) {
    return { success: false, error: `${fieldName} must be a whole number.` };
  }

  // Reject scientific notation
  if (/[eE]/.test(str)) {
    return { success: false, error: `${fieldName} must be a valid whole integer.` };
  }

  // Only digits, with optional leading + or -
  if (!/^[+-]?\d+$/.test(str)) {
    return { success: false, error: `${fieldName} must be a valid whole integer.` };
  }

  const parsed = parseInt(str, 10);
  if (!Number.isSafeInteger(parsed)) {
    return { success: false, error: `${fieldName} exceeds maximum allowable limit.` };
  }

  if (parsed === 0 && !allowZero) {
    return { success: false, error: `${fieldName} cannot be 0.` };
  }

  if (parsed < min) {
    return { success: false, error: `${fieldName} cannot be less than ${min}.` };
  }

  if (parsed > max) {
    return { success: false, error: `${fieldName} cannot be greater than ${max.toLocaleString('en-US')}.` };
  }

  return { success: true, quantity: parsed };
}
