import { Metadata } from 'next';
import { PageHeader } from '@/components/shell/page-header';
import { PageBody } from '@/components/shell/page-body';
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
  const activeCount = products.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${activeCount} active. Cost and selling prices for your catalog.`}
      />
      <PageBody>
        <ProductList products={products} />
      </PageBody>
    </div>
  );
}
