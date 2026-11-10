/**
 * Turns a database error from record_sale into a message a shop worker can read.
 * Only messages the database raises on purpose are shown. Anything else is hidden.
 */

const KNOWN_SALE_ERRORS: { match: string; code: string; message: string }[] = [
  { match: 'Staff can only sell at their own branch', code: 'FORBIDDEN', message: 'You can only record sales at your own branch.' },
  { match: 'Branch not found or inactive', code: 'NOT_FOUND', message: 'That branch is not available.' },
  { match: 'Product not found or inactive', code: 'NOT_FOUND', message: 'A product in this sale is no longer available. Remove it and try again.' },
  { match: 'Invalid quantity', code: 'VALIDATION_ERROR', message: 'Each item must be between 1 and 1,000.' },
  { match: 'Invalid items', code: 'VALIDATION_ERROR', message: 'A sale needs 1 to 50 items.' },
  { match: 'Invalid payment method', code: 'VALIDATION_ERROR', message: 'Choose Cash or GCash.' },
  { match: 'Invalid request id', code: 'VALIDATION_ERROR', message: 'Something went wrong with this sale. Please try again.' },
  { match: 'Conflict: this request id was already used', code: 'CONFLICT', message: 'This sale was already recorded.' },
  { match: 'Active shop membership required', code: 'FORBIDDEN', message: 'Your account cannot record sales right now.' },
];

export function saleErrorFor(databaseMessage: string): { code: string; message: string } {
  const known = KNOWN_SALE_ERRORS.find((entry) => databaseMessage.includes(entry.match));
  if (known) return { code: known.code, message: known.message };
  return { code: 'DB_ERROR', message: 'Could not record the sale. Please try again.' };
}
