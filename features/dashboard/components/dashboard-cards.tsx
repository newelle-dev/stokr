import { AlertTriangle, PackageX } from 'lucide-react';
import { MoneyText } from '@/components/shared/money-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardData } from '../queries';

const muted = 'text-sm text-[var(--muted-foreground)]';
const row = 'flex min-h-11 items-center justify-between gap-3 py-2';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function DashboardCards({ data }: { data: DashboardData }) {
  const showBranch = data.selectedBranchId === null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s sales and profit</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className={muted}>Sales</p>
            <MoneyText centavos={data.today.salesCentavos} className="text-[32px] font-bold leading-tight" />
          </div>
          <div>
            <p className={muted}>Profit</p>
            <MoneyText centavos={data.today.profitCentavos} className="text-[32px] font-bold leading-tight" />
          </div>
          <p className={`${muted} col-span-2`}>{plural(data.today.saleCount, 'sale')} today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low stock</CardTitle>
        </CardHeader>
        <CardContent>
          {data.lowStock.length === 0 ? (
            <p className={muted}>Nothing is low right now.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {data.lowStock.map((r) => (
                <li key={`${r.branchId}:${r.productId}`} className={row}>
                  <div className="min-w-0">
                    <p className="break-words text-base font-medium text-[var(--foreground)]">{r.name}</p>
                    {showBranch && <p className={muted}>{r.branchName}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-sm">
                    {r.state === 'out' ? (
                      <PackageX className="h-4 w-4 text-[var(--destructive)]" aria-hidden />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-[var(--warning)]" aria-hidden />
                    )}
                    <span className="font-medium text-[var(--foreground)]">
                      {r.state === 'out' ? 'Out of stock' : 'Low stock'}
                    </span>
                    <span className="tabular-nums text-[var(--muted-foreground)]">{r.stockOnHand} left</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sales per staff</CardTitle>
        </CardHeader>
        <CardContent>
          {data.staffTotals.length === 0 ? (
            <p className={muted}>No sales yet today.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {data.staffTotals.map((s) => (
                <li key={s.staffId} className={row}>
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-[var(--foreground)]">{s.name || 'Unknown'}</p>
                    <p className={muted}>{plural(s.saleCount, 'sale')}</p>
                  </div>
                  <MoneyText centavos={s.salesCentavos} className="text-base font-semibold" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Missing stock</CardTitle>
        </CardHeader>
        <CardContent>
          {data.missingStock.length === 0 ? (
            <p className={muted}>No stock count yet. Missing stock shows here after your first count.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {data.missingStock.map((m) => (
                <li key={m.branchName} className={row}>
                  <p className="text-base font-medium text-[var(--foreground)]">{m.branchName}</p>
                  <p className="text-sm">
                    {plural(m.units, 'unit')} · <MoneyText centavos={m.costCentavos} />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
