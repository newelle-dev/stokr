import Link from 'next/link';
import { PageHeader } from '@/components/shell/page-header';
import { buttonVariants } from '@/components/ui/button';
import { getMySales } from '@/features/sales/queries';
import { MySalesList } from '@/features/sales/components/my-sales-list';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My sales | Stokr',
  description: 'Sales you recorded.',
};

export default async function MySalesPage() {
  const sales = await getMySales();

  return (
    <div className="space-y-4">
      <PageHeader title="My sales" />

      {sales.length === 0 ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-6 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">No sales yet. Record your first sale on the Sell page.</p>
          <Link href="/sell" className={`${buttonVariants()} h-12 px-6 text-base`}>
            Go to Sell
          </Link>
        </div>
      ) : (
        <MySalesList sales={sales} />
      )}
    </div>
  );
}
