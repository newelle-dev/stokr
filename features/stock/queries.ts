import { createClient } from '@/lib/supabase/server';
import { requireOwnerPage } from '@/lib/auth';
import type { StockOverviewItem, BulkOpeningProductRow } from './types';

export async function getStockOverview(selectedBranchId?: string): Promise<{
  items: StockOverviewItem[];
  branches: { id: string; name: string }[];
  totalSkus: number;
  lowStockCount: number;
  outOfStockCount: number;
  negativeStockCount: number;
}> {
  const user = await requireOwnerPage();
  const supabase = await createClient();

  // 1. Fetch active branches
  const { data: branches, error: branchesErr } = await supabase
    .from('branches')
    .select('id, name')
    .eq('shop_id', user.shopId)
    .eq('is_active', true)
    .order('name');

  if (branchesErr || !branches) {
    throw new Error('Failed to load branches.');
  }

  // 2. Fetch active products
  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold')
    .eq('shop_id', user.shopId)
    .eq('is_active', true)
    .order('name');

  if (productsErr || !products) {
    throw new Error('Failed to load products.');
  }

  // 3. Fetch stock_levels
  let stockLevelsQuery = supabase
    .from('stock_levels')
    .select('branch_id, product_id, stock_on_hand');

  if (selectedBranchId && selectedBranchId !== 'all') {
    stockLevelsQuery = stockLevelsQuery.eq('branch_id', selectedBranchId);
  }

  const { data: stockLevels, error: stockLevelsErr } = await stockLevelsQuery;
  if (stockLevelsErr) {
    throw new Error('Failed to load stock levels.');
  }

  // 4. Fetch opening stock markers to determine which have opening stock recorded
  const { data: openingMovements, error: openingErr } = await supabase
    .from('stock_movements')
    .select('branch_id, product_id')
    .eq('shop_id', user.shopId)
    .eq('reason', 'opening');

  if (openingErr) {
    throw new Error('Failed to load opening stock records.');
  }

  // Create lookup maps
  const stockMap = new Map<string, number>();
  for (const sl of stockLevels ?? []) {
    if (sl.branch_id && sl.product_id) {
      stockMap.set(`${sl.branch_id}:${sl.product_id}`, sl.stock_on_hand ?? 0);
    }
  }

  const openingSet = new Set<string>();
  for (const om of openingMovements ?? []) {
    openingSet.add(`${om.branch_id}:${om.product_id}`);
  }

  const targetBranches = selectedBranchId && selectedBranchId !== 'all'
    ? branches.filter((b) => b.id === selectedBranchId)
    : branches;

  const items: StockOverviewItem[] = [];
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let negativeStockCount = 0;

  for (const prod of products) {
    for (const branch of targetBranches) {
      const key = `${branch.id}:${prod.id}`;
      const stockOnHand = stockMap.get(key) ?? 0;
      const hasOpeningStock = openingSet.has(key);
      const isNegativeStock = stockOnHand < 0;
      const isOutOfStock = stockOnHand === 0;
      const isLowStock = stockOnHand > 0 && stockOnHand <= prod.low_stock_threshold;

      if (isNegativeStock) negativeStockCount++;
      if (isOutOfStock) outOfStockCount++;
      if (isLowStock) lowStockCount++;

      items.push({
        productId: prod.id,
        productName: prod.name,
        category: prod.category,
        branchId: branch.id,
        branchName: branch.name,
        stockOnHand,
        lowStockThreshold: prod.low_stock_threshold,
        sellingPriceCentavos: prod.selling_price_centavos,
        costPriceCentavos: prod.cost_price_centavos,
        hasOpeningStock,
        isLowStock,
        isOutOfStock,
        isNegativeStock,
      });
    }
  }

  return {
    items,
    branches: branches.map((b) => ({ id: b.id, name: b.name })),
    totalSkus: products.length,
    lowStockCount,
    outOfStockCount,
    negativeStockCount,
  };
}

export async function getBulkOpeningStockData(): Promise<{
  rows: BulkOpeningProductRow[];
  branches: { id: string; name: string }[];
  totalProducts: number;
}> {
  const user = await requireOwnerPage();
  const supabase = await createClient();

  // 1. Active branches
  const { data: branches, error: branchesErr } = await supabase
    .from('branches')
    .select('id, name')
    .eq('shop_id', user.shopId)
    .eq('is_active', true)
    .order('name');

  if (branchesErr || !branches) {
    throw new Error('Failed to load branches.');
  }

  // 2. Active products
  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('id, name, category')
    .eq('shop_id', user.shopId)
    .eq('is_active', true)
    .order('name');

  if (productsErr || !products) {
    throw new Error('Failed to load products.');
  }

  // 3. Existing opening movements
  const { data: openingMovements, error: openingErr } = await supabase
    .from('stock_movements')
    .select('branch_id, product_id, quantity_change')
    .eq('shop_id', user.shopId)
    .eq('reason', 'opening');

  if (openingErr) {
    throw new Error('Failed to load opening stock records.');
  }

  const openingMap = new Map<string, number>();
  for (const om of openingMovements ?? []) {
    openingMap.set(`${om.branch_id}:${om.product_id}`, om.quantity_change);
  }

  const rows: BulkOpeningProductRow[] = products.map((prod) => ({
    productId: prod.id,
    productName: prod.name,
    category: prod.category,
    branches: branches.map((branch) => {
      const key = `${branch.id}:${prod.id}`;
      const recorded = openingMap.get(key);
      return {
        branchId: branch.id,
        branchName: branch.name,
        hasOpeningStock: recorded !== undefined,
        recordedQuantity: recorded ?? null,
      };
    }),
  }));

  return {
    rows,
    branches: branches.map((b) => ({ id: b.id, name: b.name })),
    totalProducts: products.length,
  };
}
