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
      {/* The top bar and tab bar already say "Sell"; keeping the heading hidden gives the product list more room. */}
      <h1 className="sr-only">Sell</h1>
      <SellCounter data={data} />
    </div>
  );
}
