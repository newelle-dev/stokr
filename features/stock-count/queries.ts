import { createClient } from '@/lib/supabase/server';
import { requireOwnerPage } from '@/lib/auth';
import { missingStockByBranch, type MissingStockRow } from './gap';

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type CountLine = {
  productId: string;
  productName: string;
  expectedQty: number;
  countedQty: number;
  difference: number;
  costCentavos: number;
};

export type OpenCount = {
  id: string;
  note: string | null;
  createdAt: string;
  lines: CountLine[];
};

export type StockCountPageData = {
  branches: { id: string; name: string }[];
  branchId: string | null;
  products: { id: string; name: string; category: string }[];
  openCount: OpenCount | null;
};

const LOAD_ERROR = 'Failed to load the stock count.';

export async function getStockCountPage(rawBranchId?: string): Promise<StockCountPageData> {
  const user = await requireOwnerPage();
  const supabase = await createClient();

  const branchesRes = await supabase
    .from('branches')
    .select('id, name')
    .eq('shop_id', user.shopId)
    .eq('is_active', true)
    .order('name');
  if (branchesRes.error) throw new Error(LOAD_ERROR);
  const branches = branchesRes.data ?? [];

  // A bad or stale ?branch= falls back to the first branch.
  const branchId = branches.find((b) => b.id === rawBranchId)?.id ?? branches[0]?.id ?? null;
  if (!branchId) return { branches, branchId, products: [], openCount: null };

  const [productsRes, openRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, category')
      .eq('shop_id', user.shopId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('stock_counts')
      .select('id, note, created_at')
      .eq('shop_id', user.shopId)
      .eq('branch_id', branchId)
      .eq('status', 'open')
      .maybeSingle(),
  ]);
  if (productsRes.error || openRes.error) throw new Error(LOAD_ERROR);

  let openCount: OpenCount | null = null;
  if (openRes.data) {
    const itemsRes = await supabase
      .from('stock_count_items')
      .select('product_id, expected_qty, counted_qty, difference')
      .eq('shop_id', user.shopId)
      .eq('stock_count_id', openRes.data.id);
    if (itemsRes.error) throw new Error(LOAD_ERROR);

    const costs = await productCosts(supabase, user.shopId, (itemsRes.data ?? []).map((i) => i.product_id));
    openCount = {
      id: openRes.data.id,
      note: openRes.data.note,
      createdAt: openRes.data.created_at,
      lines: (itemsRes.data ?? [])
        .map((i) => ({
          productId: i.product_id,
          productName: costs.get(i.product_id)?.name ?? 'Unknown product',
          expectedQty: i.expected_qty,
          countedQty: i.counted_qty,
          difference: i.difference,
          costCentavos: costs.get(i.product_id)?.cost ?? 0,
        }))
        .sort((a, b) => a.difference - b.difference || a.productName.localeCompare(b.productName)),
    };
  }

  return { branches, branchId, products: productsRes.data ?? [], openCount };
}

async function productCosts(supabase: Supabase, shopId: string, ids: string[]) {
  const map = new Map<string, { name: string; cost: number }>();
  if (ids.length === 0) return map;
  const res = await supabase
    .from('products')
    .select('id, name, cost_price_centavos')
    .eq('shop_id', shopId)
    .in('id', ids);
  if (res.error) throw new Error(LOAD_ERROR);
  for (const p of res.data ?? []) map.set(p.id, { name: p.name, cost: p.cost_price_centavos });
  return map;
}

/** Dashboard card: negative differences of each branch's latest ACCEPTED count (owner only via RLS). */
export async function getMissingStock(
  supabase: Supabase,
  shopId: string,
  branchId: string | null,
  branchNames: Map<string, string>
): Promise<MissingStockRow[]> {
  let q = supabase
    .from('stock_counts')
    .select('id, branch_id')
    .eq('shop_id', shopId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false });
  if (branchId) q = q.eq('branch_id', branchId);
  const counts = await q;
  if (counts.error) throw new Error(LOAD_ERROR);

  // rows come newest first, so the first one seen per branch is its latest count
  const latest = new Map<string, string>(); // countId -> branchId
  const seenBranch = new Set<string>();
  for (const c of counts.data ?? []) {
    if (seenBranch.has(c.branch_id) || !branchNames.has(c.branch_id)) continue;
    seenBranch.add(c.branch_id);
    latest.set(c.id, c.branch_id);
  }
  if (latest.size === 0) return [];

  const items = await supabase
    .from('stock_count_items')
    .select('stock_count_id, product_id, difference')
    .eq('shop_id', shopId)
    .in('stock_count_id', [...latest.keys()])
    .lt('difference', 0);
  if (items.error) throw new Error(LOAD_ERROR);

  const costs = await productCosts(supabase, shopId, [...new Set((items.data ?? []).map((i) => i.product_id))]);
  return missingStockByBranch(
    (items.data ?? []).map((i) => ({
      branchName: branchNames.get(latest.get(i.stock_count_id)!) ?? '',
      difference: i.difference,
      costCentavos: costs.get(i.product_id)?.cost ?? 0,
    }))
  );
}
