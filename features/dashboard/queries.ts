import { createClient } from '@/lib/supabase/server';
import { requireOwnerPage } from '@/lib/auth';
import { getManilaDateString, getManilaRangeBetween } from '@/lib/dates';
import { getMissingStock } from '@/features/stock-count/queries';
import { dashboardFilterSchema } from './schemas';
import { fetchAllRows } from './paging';
import {
  lowStock,
  resolveBranchId,
  salesPerStaff,
  summarizeSales,
  type LowStockRow,
  type ProductForStock,
  type SaleForSummary,
  type StaffTotal,
} from './summary';

export type DashboardData = {
  date: string; // Manila day YYYY-MM-DD
  branches: { id: string; name: string }[];
  selectedBranchId: string | null;
  today: { salesCentavos: number; profitCentavos: number; saleCount: number };
  lowStock: LowStockRow[];
  staffTotals: StaffTotal[];
  missingStock: { branchName: string; units: number; costCentavos: number }[];
};

const LOAD_ERROR = 'Failed to load the dashboard.';

export async function getOwnerDashboard(rawFilter?: unknown): Promise<DashboardData> {
  const user = await requireOwnerPage();
  const supabase = await createClient();

  const date = getManilaDateString();
  const { startUtc, endUtc } = getManilaRangeBetween(date, date);

  const branchesRes = await supabase
    .from('branches')
    .select('id, name')
    .eq('shop_id', user.shopId)
    .eq('is_active', true)
    .order('name');
  if (branchesRes.error) throw new Error(LOAD_ERROR);
  const branchList = branchesRes.data ?? [];

  // A bad or stale ?branch= falls back to all branches instead of breaking the page.
  const parsed = dashboardFilterSchema.safeParse(rawFilter ?? {});
  const branchId = resolveBranchId(parsed.success ? parsed.data.branchId : undefined, branchList);

  const [saleData, people, products, stockData] = await Promise.all([
    fetchAllRows((from, to) => {
      let q = supabase
        .from('sales')
        .select('status, branch_id, sold_by, total_centavos, total_cost_centavos')
        .eq('shop_id', user.shopId)
        .gte('created_at', startUtc)
        .lte('created_at', endUtc)
        .order('id')
        .range(from, to);
      if (branchId) q = q.eq('branch_id', branchId);
      return q;
    }),
    supabase.from('profiles').select('id, full_name').eq('shop_id', user.shopId),
    supabase.from('products').select('id, name, low_stock_threshold').eq('shop_id', user.shopId).eq('is_active', true),
    fetchAllRows((from, to) => {
      let q = supabase
        .from('stock_levels')
        .select('branch_id, product_id, stock_on_hand')
        .order('branch_id')
        .order('product_id')
        .range(from, to);
      if (branchId) q = q.eq('branch_id', branchId);
      return q;
    }),
  ]);
  if (people.error || products.error) throw new Error(LOAD_ERROR);

  const personName = new Map((people.data ?? []).map((p) => [p.id, p.full_name]));
  const saleRows: SaleForSummary[] = saleData.map((s) => ({
    status: s.status === 'voided' ? 'voided' : 'completed',
    soldById: s.sold_by,
    soldByName: personName.get(s.sold_by) ?? '',
    totalCentavos: s.total_centavos,
    totalCostCentavos: s.total_cost_centavos,
  }));

  const branchName = new Map(branchList.map((b) => [b.id, b.name]));
  const productInfo = new Map((products.data ?? []).map((p) => [p.id, p]));
  const stockRows: ProductForStock[] = [];
  for (const level of stockData) {
    const product = level.product_id ? productInfo.get(level.product_id) : undefined;
    const name = level.branch_id ? branchName.get(level.branch_id) : undefined;
    if (!product || !name || !level.branch_id) continue; // inactive product/branch: not listed
    stockRows.push({
      productId: product.id,
      name: product.name,
      threshold: product.low_stock_threshold,
      branchId: level.branch_id,
      branchName: name,
      stockOnHand: level.stock_on_hand ?? 0,
    });
  }

  return {
    date,
    branches: branchList,
    selectedBranchId: branchId,
    today: summarizeSales(saleRows),
    lowStock: lowStock(stockRows),
    staffTotals: salesPerStaff(saleRows),
    missingStock: await getMissingStock(supabase, user.shopId, branchId, branchName),
  };
}
