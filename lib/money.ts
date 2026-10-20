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
