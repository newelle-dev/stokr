import * as React from 'react';
import { requireOwnerPage } from '@/lib/auth';
import { getBulkOpeningStockData } from '@/features/stock/queries';
import { BulkOpeningGrid } from '@/features/stock/components/bulk-opening-grid';

export const dynamic = 'force-dynamic';

export default async function BulkOpeningStockPage() {
  await requireOwnerPage();

  const data = await getBulkOpeningStockData();

  return (
    <div className="space-y-6">
      <BulkOpeningGrid rows={data.rows} branches={data.branches} />
    </div>
  );
}
