import * as React from 'react';
import { requireOwnerPage } from '@/lib/auth';
import { getStockOverview } from '@/features/stock/queries';
import { StockTable } from '@/features/stock/components/stock-table';

export const dynamic = 'force-dynamic';

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  await requireOwnerPage();
  const resolvedParams = await searchParams;
  const selectedBranchId = resolvedParams.branch || 'all';

  const stockData = await getStockOverview(selectedBranchId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Inventory & Stock
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Real-time stock on hand calculated from append-only ledger movements. Restock arrivals,
          adjust inventory, and flag depleted items.
        </p>
      </div>

      <StockTable
        initialItems={stockData.items}
        branches={stockData.branches}
        totalSkus={stockData.totalSkus}
        lowStockCount={stockData.lowStockCount}
        outOfStockCount={stockData.outOfStockCount}
        negativeStockCount={stockData.negativeStockCount}
        selectedBranchId={selectedBranchId}
      />
    </div>
  );
}
