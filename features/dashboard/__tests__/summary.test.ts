import { describe, expect, it } from 'vitest';
import { lowStock, salesPerStaff, summarizeSales, type ProductForStock, type SaleForSummary } from '../summary';

const sale = (o: Partial<SaleForSummary> = {}): SaleForSummary => ({
  status: 'completed',
  soldById: 'ana',
  soldByName: 'Ana',
  totalCentavos: 1000,
  totalCostCentavos: 500,
  ...o,
});

const prod = (o: Partial<ProductForStock> = {}): ProductForStock => ({
  productId: 'p1',
  name: 'Mango',
  threshold: 5,
  branchId: 'b1',
  branchName: 'Main',
  stockOnHand: 10,
  ...o,
});

describe('summarizeSales', () => {
  it('sums completed sales and profit as sales minus saved cost', () => {
    const rows = [sale({ totalCentavos: 10000, totalCostCentavos: 6000 }), sale({ totalCentavos: 2550, totalCostCentavos: 1000 })];
    expect(summarizeSales(rows)).toEqual({ salesCentavos: 12550, profitCentavos: 5550, saleCount: 2 });
  });

  it('ignores voided sales in totals, profit and count', () => {
    const rows = [
      sale({ totalCentavos: 10000, totalCostCentavos: 6000 }),
      sale({ totalCentavos: 2550, totalCostCentavos: 1000 }),
      sale({ status: 'voided', totalCentavos: 9999, totalCostCentavos: 1 }),
    ];
    expect(summarizeSales(rows)).toEqual({ salesCentavos: 12550, profitCentavos: 5550, saleCount: 2 });
  });

  it('returns zeros and empty lists for an empty day', () => {
    expect(summarizeSales([])).toEqual({ salesCentavos: 0, profitCentavos: 0, saleCount: 0 });
    expect(salesPerStaff([])).toEqual([]);
    expect(lowStock([])).toEqual([]);
  });
});

describe('salesPerStaff', () => {
  it('counts a replacement once under the original seller, not the voided original', () => {
    const rows = [sale({ status: 'voided', totalCentavos: 5000 }), sale({ totalCentavos: 5000 })];
    expect(salesPerStaff(rows)).toEqual([{ staffId: 'ana', name: 'Ana', salesCentavos: 5000, saleCount: 1 }]);
  });

  it('sorts staff by sales descending, then name', () => {
    const rows = [
      sale({ soldById: 'cy', soldByName: 'Cy', totalCentavos: 3000 }),
      sale({ soldById: 'ben', soldByName: 'Ben', totalCentavos: 3000 }),
      sale({ soldById: 'ana', soldByName: 'Ana', totalCentavos: 5000 }),
    ];
    expect(salesPerStaff(rows).map((s) => s.name)).toEqual(['Ana', 'Ben', 'Cy']);
  });
});

describe('lowStock', () => {
  it('flags a product at exactly its threshold as low', () => {
    expect(lowStock([prod({ stockOnHand: 5, threshold: 5 })])[0].state).toBe('low');
  });

  it('flags zero and negative stock as out and lists them first', () => {
    const rows = lowStock([
      prod({ productId: 'a', name: 'A', stockOnHand: 2 }),
      prod({ productId: 'b', name: 'B', stockOnHand: 0 }),
      prod({ productId: 'c', name: 'C', stockOnHand: -2 }),
    ]);
    expect(rows.map((r) => [r.productId, r.state])).toEqual([['c', 'out'], ['b', 'out'], ['a', 'low']]);
  });

  it('does not list products above their threshold', () => {
    expect(lowStock([prod({ stockOnHand: 6, threshold: 5 })])).toEqual([]);
  });
});
