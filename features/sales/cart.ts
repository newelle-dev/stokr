/**
 * The sale being built on the sell screen. Pure logic, no React, so the limits and totals are unit tested.
 * Limits match recordSaleInputSchema: at most 50 different products, at most 1,000 of each.
 */

export const MAX_LINES = 50;
export const MAX_QUANTITY_PER_LINE = 1000;

export type CartLine = {
  productId: string;
  name: string;
  priceCentavos: number;
  quantity: number;
};

export type CartAction =
  | { type: 'add'; productId: string; name: string; priceCentavos: number }
  | { type: 'set'; productId: string; quantity: number }
  | { type: 'clear' };

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const exists = lines.some((l) => l.productId === action.productId);
      if (!exists) {
        if (lines.length >= MAX_LINES) return lines;
        return [
          ...lines,
          { productId: action.productId, name: action.name, priceCentavos: action.priceCentavos, quantity: 1 },
        ];
      }
      return lines.map((l) =>
        l.productId === action.productId
          ? { ...l, quantity: Math.min(l.quantity + 1, MAX_QUANTITY_PER_LINE) }
          : l
      );
    }
    case 'set': {
      if (action.quantity < 1) return lines.filter((l) => l.productId !== action.productId);
      const quantity = Math.min(Math.floor(action.quantity), MAX_QUANTITY_PER_LINE);
      return lines.map((l) => (l.productId === action.productId ? { ...l, quantity } : l));
    }
    case 'clear':
      return [];
  }
}

export function cartTotalCentavos(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCentavos * l.quantity, 0);
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
