import { createClient } from '@/lib/supabase/server';
import { requireOwnerPage } from '@/lib/auth';
import type { ProductItem } from './types';
import type { ProductCategory } from '@/lib/supabase/database.types';

export async function getOwnerProducts(): Promise<ProductItem[]> {
  const owner = await requireOwnerPage();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, shop_id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold, is_active, created_at')
    .eq('shop_id', owner.shopId)
    .order('name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((p) => ({
    id: p.id,
    shopId: p.shop_id,
    name: p.name,
    category: p.category as ProductCategory,
    sellingPriceCentavos: p.selling_price_centavos,
    costPriceCentavos: p.cost_price_centavos,
    lowStockThreshold: p.low_stock_threshold,
    isActive: p.is_active,
    createdAt: p.created_at,
  }));
}
