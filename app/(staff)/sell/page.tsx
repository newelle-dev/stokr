import { PageHeader } from '@/components/shell/page-header';
import { getSellScreenData } from '@/features/sales/queries';
import { SellCounter } from '@/features/sales/components/sell-counter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sell | Stokr',
  description: 'Fast mobile sales counter for Stokr staff.',
};

export default async function SellPage() {
  const data = await getSellScreenData();

  return (
    <div className="space-y-4">
      <PageHeader title="Sell" />
      <SellCounter data={data} />
    </div>
  );
}
