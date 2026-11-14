'use client';

import * as React from 'react';
import { Ban } from 'lucide-react';
import { MoneyText } from '@/components/shared/money-text';
import { ListRow, RowList } from '@/components/shell/list-row';
import { RowActionSheet } from '@/components/shell/row-action-sheet';
import { formatManilaDateTime } from '@/lib/dates';
import type { MySale } from '../queries';
import { dayLabel, groupSalesByDay, isVoidedSale } from '../my-sales';

const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash', gcash: 'GCash' };

function itemCount(sale: MySale): number {
  return sale.items.reduce((sum, item) => sum + item.quantity, 0);
}

function itemsSummary(sale: MySale): string {
  return sale.items.map((item) => `${item.quantity} × ${item.productName}`).join(', ');
}

export function MySalesList({ sales }: { sales: MySale[] }) {
  const [openSale, setOpenSale] = React.useState<MySale | null>(null);
  const days = React.useMemo(() => groupSalesByDay(sales), [sales]);

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day.dateKey} aria-label={dayLabel(day.dateKey)} className="space-y-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{dayLabel(day.dateKey)}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {day.completedCount} {day.completedCount === 1 ? 'sale' : 'sales'}
            </p>
          </div>

          {day.completedCount > 0 && (
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Total', value: day.completedTotalCentavos },
                { label: 'Cash', value: day.cashCentavos },
                { label: 'GCash', value: day.gcashCentavos },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-2 py-2"
                >
                  <dt className="text-xs text-[var(--muted-foreground)]">{tile.label}</dt>
                  <dd>
                    <MoneyText centavos={tile.value} className="text-sm font-semibold text-[var(--foreground)]" />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <RowList alwaysVisible>
            {day.sales.map((sale) => {
              const voided = isVoidedSale(sale);
              const count = itemCount(sale);
              return (
                <ListRow
                  key={sale.id}
                  muted={voided}
                  onClick={() => setOpenSale(sale)}
                  title={
                    <span className={voided ? 'line-through' : ''}>
                      <MoneyText centavos={sale.totalCentavos} />
                    </span>
                  }
                  detail={`${formatManilaDateTime(sale.createdAt, 'time')} · ${count} ${count === 1 ? 'item' : 'items'} · ${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}`}
                  trailing={
                    voided ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--destructive)]">
                        <Ban className="h-3.5 w-3.5" aria-hidden />
                        Voided
                      </span>
                    ) : undefined
                  }
                />
              );
            })}
          </RowList>
        </section>
      ))}

      {/* Details only: staff cannot change a sale, so the sheet has no actions. */}
      <RowActionSheet
        title={openSale ? `${formatManilaDateTime(openSale.createdAt)}` : 'Sale'}
        description={
          openSale
            ? [
                itemsSummary(openSale),
                PAYMENT_LABELS[openSale.paymentMethod] ?? openSale.paymentMethod,
                isVoidedSale(openSale) ? 'This sale was voided by the owner.' : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
        isOpen={!!openSale}
        onClose={() => setOpenSale(null)}
        actions={[]}
      />
    </div>
  );
}
