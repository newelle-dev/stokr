import { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/auth';
import { getOwnerProducts } from '@/features/products/queries';
import { ProductList } from '@/features/products/components/product-list';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Products | Stokr',
  description: 'Manage your shop product catalog, prices, and thresholds',
};

export default async function ProductsPage() {
  await requireOwnerPage();
  const products = await getOwnerProducts();

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
        <ProductList products={products} />
      </div>
    </div>
  );
}
