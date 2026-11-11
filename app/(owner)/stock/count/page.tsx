import * as React from 'react';
import { requireOwnerPage } from '@/lib/auth';
import { getStockCountPage } from '@/features/stock-count/queries';
import { CountScreen } from '@/features/stock-count/components/count-screen';

export const dynamic = 'force-dynamic';

export default async function StockCountPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  await requireOwnerPage();
  const { branch } = await searchParams;
  const data = await getStockCountPage(branch);

  return <CountScreen data={data} />;
}
