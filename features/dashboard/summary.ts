export type SaleForSummary = {
  status: 'completed' | 'voided';
  soldById: string;
  soldByName: string;
  totalCentavos: number;
  totalCostCentavos: number;
};
export type StaffTotal = { staffId: string; name: string; salesCentavos: number; saleCount: number };
export type ProductForStock = {
  productId: string;
  name: string;
  threshold: number;
  branchId: string;
  branchName: string;
  stockOnHand: number;
};
export type LowStockRow = {
  productId: string;
  name: string;
  branchId: string;
  branchName: string;
  stockOnHand: number;
  state: 'out' | 'low';
};

const completed = (sales: SaleForSummary[]) => sales.filter((s) => s.status === 'completed');

export function summarizeSales(sales: SaleForSummary[]): { salesCentavos: number; profitCentavos: number; saleCount: number } {
  const done = completed(sales);
  const salesCentavos = done.reduce((sum, s) => sum + s.totalCentavos, 0);
  const costCentavos = done.reduce((sum, s) => sum + s.totalCostCentavos, 0);
  return { salesCentavos, profitCentavos: salesCentavos - costCentavos, saleCount: done.length };
}

export function salesPerStaff(sales: SaleForSummary[]): StaffTotal[] {
  const byStaff = new Map<string, StaffTotal>();
  for (const s of completed(sales)) {
    const row = byStaff.get(s.soldById) ?? { staffId: s.soldById, name: s.soldByName, salesCentavos: 0, saleCount: 0 };
    row.salesCentavos += s.totalCentavos;
    row.saleCount += 1;
    byStaff.set(s.soldById, row);
  }
  return [...byStaff.values()].sort((a, b) => b.salesCentavos - a.salesCentavos || a.name.localeCompare(b.name));
}

export function lowStock(products: ProductForStock[]): LowStockRow[] {
  return products
    .filter((p) => p.stockOnHand <= p.threshold)
    .map((p): LowStockRow => ({
      productId: p.productId,
      name: p.name,
      branchId: p.branchId,
      branchName: p.branchName,
      stockOnHand: p.stockOnHand,
      state: p.stockOnHand <= 0 ? 'out' : 'low',
    }))
    .sort(
      (a, b) =>
        Number(b.state === 'out') - Number(a.state === 'out') ||
        a.stockOnHand - b.stockOnHand ||
        a.name.localeCompare(b.name),
    );
}
