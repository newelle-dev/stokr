import { describe, expect, it } from 'vitest';
import { filterProducts } from '../product-filter';
import type { SellProduct } from '../queries';

const products: SellProduct[] = [
  { id: '1', name: 'Aegis Legend 2 Mod', category: 'device', priceCentavos: 280000 },
  { id: '2', name: 'Pastry Vapor Salt 30ml', category: 'liquid', priceCentavos: 35000 },
  { id: '3', name: 'Relx Pod Menthol Plus', category: 'cartridge', priceCentavos: 25000 },
  { id: '4', name: 'Organic Cotton Bacon Prime', category: 'other', priceCentavos: 20000 },
  { id: '5', name: 'Vapor Salt Mango', category: 'liquid', priceCentavos: 35000 },
];

describe('filterProducts', () => {
  it('shows everything with All and no search', () => {
    expect(filterProducts(products, 'all', '')).toHaveLength(5);
  });

  it('filters by category', () => {
    expect(filterProducts(products, 'liquid', '').map((p) => p.id)).toEqual(['2', '5']);
    expect(filterProducts(products, 'device', '').map((p) => p.id)).toEqual(['1']);
  });

  it('searches names without case sensitivity and ignores surrounding spaces', () => {
    expect(filterProducts(products, 'all', '  VAPOR ').map((p) => p.id)).toEqual(['2', '5']);
  });

  it('combines category and search: both must match', () => {
    expect(filterProducts(products, 'liquid', 'mango').map((p) => p.id)).toEqual(['5']);
    expect(filterProducts(products, 'device', 'mango')).toEqual([]);
  });

  it('returns nothing when no product matches', () => {
    expect(filterProducts(products, 'cartridge', 'aegis')).toEqual([]);
  });
});
