import type { ProductCategory } from '@/lib/supabase/database.types';

export interface ProductItem {
  id: string;
  shopId: string;
  name: string;
  category: ProductCategory;
  sellingPriceCentavos: number;
  costPriceCentavos: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
}
