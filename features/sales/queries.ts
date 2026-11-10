import { createClient } from '@/lib/supabase/server';
import { requireStaffOrOwnerPage } from '@/lib/auth';

export type MySaleItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPriceCentavos: number;
  lineTotalCentavos: number;
};

export type MySale = {
  id: string;
  branchId: string;
  paymentMethod: string;
  totalCentavos: number;
  status: string;
  createdAt: string;
  items: MySaleItem[];
};

export type SellProduct = { id: string; name: string; category: string; priceCentavos: number };

export type SellScreenData = {
  products: SellProduct[];
  branches: { id: string; name: string }[];
  isOwner: boolean;
  homeBranchId: string | null;
};

/**
 * What the sell screen needs. Products come from the staff_products view, which has no cost column.
 * Staff can only sell at their own branch, so they get that branch alone; the owner gets all active branches.
 */
export async function getSellScreenData(): Promise<SellScreenData> {
  const user = await requireStaffOrOwnerPage();
  const supabase = await createClient();

  const { data: products, error: productsError } = await supabase
    .from('staff_products')
    .select('id, name, category, selling_price_centavos')
    .eq('is_active', true)
    .order('name');

  if (productsError) {
    throw new Error('Failed to load products.');
  }

  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (branchesError) {
    throw new Error('Failed to load branches.');
  }

  const isOwner = user.role === 'owner';

  return {
    products: (products ?? [])
      .filter((p): p is typeof p & { id: string } => p.id !== null)
      .map((p) => ({
        id: p.id,
        name: p.name ?? '',
        category: p.category ?? '',
        priceCentavos: p.selling_price_centavos ?? 0,
      })),
    branches: (branches ?? [])
      .filter((b) => isOwner || b.id === user.branchId)
      .map((b) => ({ id: b.id, name: b.name })),
    isOwner,
    homeBranchId: user.branchId,
  };
}

/**
 * The logged-in user's own sales, newest first. Reads only the my_sales and
 * my_sale_items views, which have no cost columns.
 */
export async function getMySales(): Promise<MySale[]> {
  await requireStaffOrOwnerPage();
  const supabase = await createClient();

  // shortcut: shows the latest 100 sales only, add paging when a worker has more than 100 sales in view
  const { data: sales, error: salesError } = await supabase
    .from('my_sales')
    .select('id, branch_id, payment_method, total_centavos, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (salesError) {
    throw new Error('Failed to load your sales.');
  }

  const saleIds = (sales ?? []).map((s) => s.id).filter((id): id is string => id !== null);
  if (saleIds.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from('my_sale_items')
    .select('id, sale_id, product_name, quantity, unit_price_centavos, line_total_centavos')
    .in('sale_id', saleIds);

  if (itemsError) {
    throw new Error('Failed to load your sale items.');
  }

  const itemsBySale = new Map<string, MySaleItem[]>();
  for (const item of items ?? []) {
    if (!item.sale_id || !item.id) continue;
    const list = itemsBySale.get(item.sale_id) ?? [];
    list.push({
      id: item.id,
      productName: item.product_name ?? '',
      quantity: item.quantity ?? 0,
      unitPriceCentavos: item.unit_price_centavos ?? 0,
      lineTotalCentavos: item.line_total_centavos ?? 0,
    });
    itemsBySale.set(item.sale_id, list);
  }

  return (sales ?? [])
    .filter((s): s is typeof s & { id: string } => s.id !== null)
    .map((s) => ({
      id: s.id,
      branchId: s.branch_id ?? '',
      paymentMethod: s.payment_method ?? '',
      totalCentavos: s.total_centavos ?? 0,
      status: s.status ?? '',
      createdAt: s.created_at ?? '',
      items: itemsBySale.get(s.id) ?? [],
    }));
}
