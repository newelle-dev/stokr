import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireOwnerPage, requireStaffOrOwnerPage } from '@/lib/auth';
import { getManilaDateString, getManilaRangeBetween } from '@/lib/dates';
import { ownerSalesFilterSchema, type OwnerSalesFilter } from './schemas';

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

export const OWNER_SALES_PAGE_SIZE = 50;

export type OwnerSaleItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPriceCentavos: number;
};

export type OwnerSale = {
  id: string;
  branchId: string;
  branchName: string;
  soldById: string;
  soldByName: string;
  recordedByName: string;
  paymentMethod: string;
  totalCentavos: number;
  status: string;
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
  correctsSaleId: string | null;
  /** Set when a voided sale already has a replacement, so the UI hides "record replacement". */
  replacedBySaleId: string | null;
  items: OwnerSaleItem[];
};

export type OwnerSalesData = {
  sales: OwnerSale[];
  /** Total of completed sales matching the filters (voided sales never count). */
  completedTotalCentavos: number;
  completedCount: number;
  voidedCount: number;
  matchingCount: number;
  page: number;
  pageSize: number;
  from: string;
  to: string;
  branches: { id: string; name: string }[];
  staff: { id: string; name: string }[];
};

/**
 * Owner sales list: all sales in the shop with filters (date, branch, staff, status), newest first, paged.
 * Dates are Asia/Manila days and default to today. Owner only (invariant 17 + RLS).
 */
export async function getOwnerSales(rawFilters: OwnerSalesFilter = {}): Promise<OwnerSalesData> {
  await requireOwnerPage();
  const filters = ownerSalesFilterSchema.parse(rawFilters);
  const today = getManilaDateString();
  const from = filters.from ?? today;
  const to = filters.to && filters.to >= from ? filters.to : from;
  const { startUtc, endUtc } = getManilaRangeBetween(from, to);
  const supabase = await createClient();

  type Filterable<Q> = { gte(c: string, v: string): Q; lte(c: string, v: string): Q; eq(c: string, v: string): Q };
  const withFilters = <Q extends Filterable<Q>>(q: Q): Q => {
    let out = q.gte('created_at', startUtc).lte('created_at', endUtc);
    if (filters.branchId) out = out.eq('branch_id', filters.branchId);
    if (filters.staffId) out = out.eq('sold_by', filters.staffId);
    if (filters.status) out = out.eq('status', filters.status);
    return out;
  };

  const offset = (filters.page - 1) * OWNER_SALES_PAGE_SIZE;
  const { data: sales, count, error: salesError } = await withFilters(
    supabase
      .from('sales')
      .select(
        'id, branch_id, sold_by, recorded_by, payment_method, total_centavos, status, void_reason, voided_at, created_at, corrects_sale_id',
        { count: 'exact' }
      )
  )
    .order('created_at', { ascending: false })
    .range(offset, offset + OWNER_SALES_PAGE_SIZE - 1);
  if (salesError) throw new Error('Failed to load sales.');

  // shortcut: totals read every matching row's total, fine for one shop's day/week, switch to a database sum function if ranges get large
  const { data: summaryRows, error: summaryError } = await withFilters(
    supabase.from('sales').select('total_centavos, status')
  );
  if (summaryError) throw new Error('Failed to load sales totals.');
  const completed = (summaryRows ?? []).filter((r) => r.status === 'completed');
  const completedTotalCentavos = completed.reduce((sum, r) => sum + r.total_centavos, 0);

  const [{ data: branches, error: branchesError }, { data: people, error: peopleError }] = await Promise.all([
    supabase.from('branches').select('id, name').order('name'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ]);
  if (branchesError || peopleError) throw new Error('Failed to load sales filters.');
  const branchName = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const personName = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  const saleIds = (sales ?? []).map((s) => s.id);
  const itemsBySale = new Map<string, OwnerSaleItem[]>();
  const replacedBy = new Map<string, string>();
  if (saleIds.length > 0) {
    const [{ data: items, error: itemsError }, { data: replacements, error: replError }] = await Promise.all([
      supabase
        .from('sale_items')
        .select('id, sale_id, product_name, quantity, unit_price_centavos')
        .in('sale_id', saleIds),
      supabase.from('sales').select('id, corrects_sale_id').in('corrects_sale_id', saleIds),
    ]);
    if (itemsError || replError) throw new Error('Failed to load sale details.');
    for (const item of items ?? []) {
      const list = itemsBySale.get(item.sale_id) ?? [];
      list.push({
        id: item.id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPriceCentavos: item.unit_price_centavos,
      });
      itemsBySale.set(item.sale_id, list);
    }
    for (const r of replacements ?? []) {
      if (r.corrects_sale_id) replacedBy.set(r.corrects_sale_id, r.id);
    }
  }

  return {
    sales: (sales ?? []).map((s) => ({
      id: s.id,
      branchId: s.branch_id,
      branchName: branchName.get(s.branch_id) ?? '',
      soldById: s.sold_by,
      soldByName: personName.get(s.sold_by) ?? '',
      recordedByName: personName.get(s.recorded_by) ?? '',
      paymentMethod: s.payment_method,
      totalCentavos: s.total_centavos,
      status: s.status,
      voidReason: s.void_reason,
      voidedAt: s.voided_at,
      createdAt: s.created_at,
      correctsSaleId: s.corrects_sale_id,
      replacedBySaleId: replacedBy.get(s.id) ?? null,
      items: itemsBySale.get(s.id) ?? [],
    })),
    completedTotalCentavos,
    completedCount: completed.length,
    voidedCount: (summaryRows ?? []).length - completed.length,
    matchingCount: count ?? 0,
    page: filters.page,
    pageSize: OWNER_SALES_PAGE_SIZE,
    from,
    to,
    branches: (branches ?? []).map((b) => ({ id: b.id, name: b.name })),
    staff: (people ?? []).map((p) => ({ id: p.id, name: p.full_name })),
  };
}

export type ReplaceableSale = {
  id: string;
  branchId: string;
  soldByName: string;
  totalCentavos: number;
  voidReason: string | null;
};

/** The voided sale an owner is about to replace, or null if it is missing, not voided, or already replaced. */
export async function getReplaceableSale(saleId: string): Promise<ReplaceableSale | null> {
  await requireOwnerPage();
  if (!z.string().guid().safeParse(saleId).success) return null;
  const supabase = await createClient();

  const { data: sale, error } = await supabase
    .from('sales')
    .select('id, branch_id, sold_by, total_centavos, status, void_reason')
    .eq('id', saleId)
    .maybeSingle();
  if (error) throw new Error('Failed to load the sale.');
  if (!sale || sale.status !== 'voided') return null;

  const [{ data: replacement, error: replError }, { data: seller }] = await Promise.all([
    supabase.from('sales').select('id').eq('corrects_sale_id', saleId).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', sale.sold_by).maybeSingle(),
  ]);
  if (replError) throw new Error('Failed to load the sale.');
  if (replacement) return null;

  return {
    id: sale.id,
    branchId: sale.branch_id,
    soldByName: seller?.full_name ?? '',
    totalCentavos: sale.total_centavos,
    voidReason: sale.void_reason,
  };
}
