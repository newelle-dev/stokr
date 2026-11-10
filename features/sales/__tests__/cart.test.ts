import { describe, expect, it } from 'vitest';
import { cartItemCount, cartReducer, cartTotalCentavos, MAX_LINES, type CartLine } from '../cart';

const relx = { productId: 'relx', name: 'Relx Pod', priceCentavos: 25000 };
const bacon = { productId: 'bacon', name: 'Bacon Prime', priceCentavos: 20000 };

describe('cartReducer', () => {
  it('adds a new product with quantity 1', () => {
    const lines = cartReducer([], { type: 'add', ...relx });
    expect(lines).toEqual([{ ...relx, quantity: 1 }]);
  });

  it('tapping the same product again adds one more', () => {
    let lines = cartReducer([], { type: 'add', ...relx });
    lines = cartReducer(lines, { type: 'add', ...relx });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(2);
  });

  it('caps a line at 1,000 units', () => {
    const lines = cartReducer([{ ...relx, quantity: 1000 }], { type: 'add', ...relx });
    expect(lines[0]?.quantity).toBe(1000);
  });

  it('setting quantity to 0 removes the line', () => {
    const start: CartLine[] = [{ ...relx, quantity: 3 }, { ...bacon, quantity: 1 }];
    const lines = cartReducer(start, { type: 'set', productId: 'relx', quantity: 0 });
    expect(lines.map((l) => l.productId)).toEqual(['bacon']);
  });

  it('ignores a 51st different product, since a sale holds at most 50 lines', () => {
    const full: CartLine[] = Array.from({ length: MAX_LINES }, (_, i) => ({
      productId: `p${i}`, name: `P${i}`, priceCentavos: 100, quantity: 1,
    }));
    expect(cartReducer(full, { type: 'add', ...relx })).toBe(full);
  });

  it('clear empties the cart', () => {
    expect(cartReducer([{ ...relx, quantity: 2 }], { type: 'clear' })).toEqual([]);
  });
});

describe('cart totals', () => {
  it('total is price times quantity, summed, in centavos', () => {
    const lines: CartLine[] = [{ ...relx, quantity: 2 }, { ...bacon, quantity: 1 }];
    expect(cartTotalCentavos(lines)).toBe(70000);
    expect(cartItemCount(lines)).toBe(3);
  });

  it('empty cart is zero', () => {
    expect(cartTotalCentavos([])).toBe(0);
    expect(cartItemCount([])).toBe(0);
  });
});
