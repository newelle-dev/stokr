import { getMySales } from '@/features/sales/queries';
import { formatManilaDateTime } from '@/lib/dates';
import { MoneyText } from '@/components/shared/money-text';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My sales | Stokr',
  description: 'Sales you recorded.',
};

const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash', gcash: 'GCash' };

export default async function MySalesPage() {
  const sales = await getMySales();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">My sales</h1>

      {sales.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
          No sales yet. Record your first sale on the Sell page.
        </p>
      ) : (
        <ul className="space-y-3">
          {sales.map((sale) => (
            <li
              key={sale.id}
              className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <time dateTime={sale.createdAt} className="text-[var(--muted-foreground)]">
                  {formatManilaDateTime(sale.createdAt)}
                </time>
                <span className="rounded-[var(--radius-sm)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]">
                  {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                </span>
              </div>

              <ul className="space-y-1 text-sm">
                {sale.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[var(--foreground)]">
                      {item.productName} × {item.quantity}
                    </span>
                    <MoneyText centavos={item.lineTotalCentavos} className="shrink-0 text-[var(--foreground)]" />
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">Total</span>
                <MoneyText centavos={sale.totalCentavos} className="text-base font-bold text-[var(--foreground)]" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
