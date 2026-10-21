/**
 * Money utilities for Stokr.
 * Invariant: Money is stored and handled as whole integer centavos (1 PHP = 100 centavos).
 * No floating-point arithmetic for business money calculations.
 */

export function assertIntegerCentavos(centavos: number): void {
  if (!Number.isInteger(centavos)) {
    throw new TypeError(`Expected integer centavos, received: ${centavos}`);
  }
}

/**
 * Format integer centavos as Philippine Pesos (e.g. 123450 -> "₱1,234.50").
 */
export function formatMoney(centavos: number): string {
  assertIntegerCentavos(centavos);

  const isNegative = centavos < 0;
  const absCentavos = Math.abs(centavos);
  const pesos = Math.floor(absCentavos / 100);
  const remainder = absCentavos % 100;

  const formattedPesos = pesos.toLocaleString('en-PH');
  const formattedRemainder = remainder.toString().padStart(2, '0');

  const formatted = `₱${formattedPesos}.${formattedRemainder}`;
  return isNegative ? `-${formatted}` : formatted;
}

export type ParseMoneyResult =
  | { success: true; centavos: number }
  | { success: false; error: string };

/**
 * Strict parser for user-entered monetary amounts in Philippine Pesos.
 * Rules:
 * - Digits with at most 2 decimal places.
 * - Optional comma grouping (e.g. 1,234.50 or 1234.50).
 * - Optional leading peso sign (₱ or P).
 * - Returns an error message for invalid input, junk, negatives, or >2 decimal places.
 * - Never silently defaults to 0.
 */
export function parseMoneyInput(
  rawInput: string,
  options?: { minCentavos?: number; fieldName?: string }
): ParseMoneyResult {
  const minCentavos = options?.minCentavos ?? 0;
  const fieldName = options?.fieldName ?? 'Amount';

  if (!rawInput || typeof rawInput !== 'string') {
    return { success: false, error: `${fieldName} is required.` };
  }

  const trimmed = rawInput.trim();
  if (trimmed === '') {
    return { success: false, error: `${fieldName} is required.` };
  }

  if (trimmed.startsWith('-')) {
    return { success: false, error: `${fieldName} cannot be negative.` };
  }

  // Strip optional leading peso sign: ₱ or P
  const cleanStr = trimmed.replace(/^[₱pP]\s*/, '').trim();
  if (cleanStr === '') {
    return { success: false, error: `${fieldName} is required.` };
  }

  // Check for more than 2 decimal places
  if (/\.\d{3,}$/.test(cleanStr)) {
    return { success: false, error: `${fieldName} cannot have more than 2 decimal places.` };
  }

  // Validate format: digits with optional thousands commas, optional decimal with up to 2 digits
  const moneyRegex = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/;
  if (!moneyRegex.test(cleanStr)) {
    return {
      success: false,
      error: `Invalid ${fieldName.toLowerCase()} format. Enter a valid amount (e.g. 19.99 or 1,234.50).`,
    };
  }

  const normalized = cleanStr.replace(/,/g, '');
  const [pesosPart, centsPart = ''] = normalized.split('.');

  const pesos = parseInt(pesosPart, 10);
  if (!Number.isSafeInteger(pesos)) {
    return { success: false, error: `${fieldName} exceeds maximum allowable limit.` };
  }

  const paddedCents = centsPart.padEnd(2, '0');
  const cents = parseInt(paddedCents, 10);

  const totalCentavos = pesos * 100 + cents;
  if (!Number.isSafeInteger(totalCentavos)) {
    return { success: false, error: `${fieldName} exceeds maximum allowable limit.` };
  }

  if (totalCentavos < minCentavos) {
    if (minCentavos === 1) {
      return { success: false, error: `${fieldName} must be at least ₱0.01.` };
    }
    return { success: false, error: `${fieldName} cannot be less than ${formatMoney(minCentavos)}.` };
  }

  return { success: true, centavos: totalCentavos };
}

/**
 * Converts pesos to centavos safely from user input string or float.
 * Uses Math.round to avoid float imprecision (e.g., 19.99 * 100).
 */
export function parsePesosToCentavos(pesoAmount: number | string): number {
  const numericAmount = typeof pesoAmount === 'string' ? Number.parseFloat(pesoAmount) : pesoAmount;
  if (Number.isNaN(numericAmount) || !Number.isFinite(numericAmount)) {
    throw new Error(`Invalid monetary amount: ${pesoAmount}`);
  }
  return Math.round(numericAmount * 100);
}

/**
 * Converts integer centavos to decimal pesos (e.g., 123450 -> 1234.50).
 */
export function centavosToPesos(centavos: number): number {
  assertIntegerCentavos(centavos);
  return centavos / 100;
}

/**
 * Adds multiple centavo amounts together.
 */
export function addMoney(...amounts: number[]): number {
  return amounts.reduce((total, amount) => {
    assertIntegerCentavos(amount);
    return total + amount;
  }, 0);
}

/**
 * Subtracts centavo amounts (a - b).
 */
export function subtractMoney(a: number, b: number): number {
  assertIntegerCentavos(a);
  assertIntegerCentavos(b);
  return a - b;
}

/**
 * Multiplies unit price in centavos by an integer quantity.
 */
export function multiplyMoney(unitCentavos: number, quantity: number): number {
  assertIntegerCentavos(unitCentavos);
  if (!Number.isInteger(quantity)) {
    throw new TypeError(`Expected integer quantity, received: ${quantity}`);
  }
  return unitCentavos * quantity;
}
