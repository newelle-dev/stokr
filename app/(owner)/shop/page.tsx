import { PageHeader } from '@/components/shell/page-header';
import { StoreCodeCard } from '@/components/shared/store-code-card';
import { ShopNameForm } from '@/features/shop/components/shop-name-form';
import { getOwnerBranches } from '@/features/branches/queries';
import { requireOwnerPage } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ShopDetailsPage() {
  await requireOwnerPage();
  const { shopName, storeCode } = await getOwnerBranches();

  return (
    <div className="space-y-6">
      <PageHeader title="Shop details" description="Your shop name and the code your staff use to sign in." />
      <ShopNameForm key={shopName} initialName={shopName} />
      <StoreCodeCard shopName={shopName} storeCode={storeCode} />
    </div>
  );
}
