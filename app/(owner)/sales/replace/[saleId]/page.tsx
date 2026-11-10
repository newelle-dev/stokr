import Link from 'next/link';
import { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/auth';
import { getReplaceableSale, getSellScreenData } from '@/features/sales/queries';
import { SellCounter } from '@/features/sales/components/sell-counter';
import { MoneyText } from '@/components/shared/money-text';
import { buttonVariants } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Replacement sale | Stokr',
  description: 'Record a replacement for a voided sale',
};

export default async function ReplaceSalePage({ params }: { params: Promise<{ saleId: string }> }) {
  await requireOwnerPage();
  const { saleId } = await params;
  const original = await getReplaceableSale(saleId);

  if (!original) {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          This sale cannot be replaced. It may not be voided, or it already has a replacement.
        </p>
        <Link href="/sales" className={`${buttonVariants({ variant: 'outline' })} h-11 px-4`}>Back to sales</Link>
      </div>
    );
  }

  const data = await getSellScreenData();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Replacement sale</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Replaces a voided sale of <MoneyText centavos={original.totalCentavos} className="font-semibold text-[var(--foreground)]" />.
        The original seller{original.soldByName ? ` (${original.soldByName})` : ''} stays on the sale; you are recorded as the one who entered it.
      </p>
      <SellCounter data={{ ...data, homeBranchId: original.branchId }} correctsSaleId={original.id} />
    </div>
  );
}
