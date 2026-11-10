'use client';

import * as React from 'react';
import Link from 'next/link';
import { buttonVariants, Button } from '@/components/ui/button';
import { MoneyText } from '@/components/shared/money-text';
import { formatManilaDateTime } from '@/lib/dates';
import type { OwnerSale } from '../queries';
import { VoidSaleModal } from './void-sale-modal';

const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash', gcash: 'GCash' };

export function OwnerSalesList({ sales }: { sales: OwnerSale[] }) {
  const [voiding, setVoiding] = React.useState<OwnerSale | null>(null);

  if (sales.length === 0) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
        No sales match these filters.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {sales.map((sale) => {
          const isVoided = sale.status === 'voided';
          return (
            <li
              key={sale.id}
              className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {formatManilaDateTime(sale.createdAt)} · {sale.branchName}
                  </p>
                  <p className="font-medium text-[var(--foreground)]">
                    Sold by {sale.soldByName || 'Unknown'}
                    {sale.recordedByName && sale.recordedByName !== sale.soldByName && (
                      <span className="text-sm font-normal text-[var(--muted-foreground)]">
                        {' '}
                        (recorded by {sale.recordedByName})
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <MoneyText
                    centavos={sale.totalCentavos}
                    className={`text-lg font-bold ${isVoided ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]'}`}
                  />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isVoided
                      ? 'bg-[var(--destructive)]/10 text-[var(--destructive)]'
                      : 'bg-[var(--success)]/10 text-[var(--success)]'
                  }`}
                >
                  {isVoided ? 'Voided' : 'Completed'}
                </span>
                {sale.correctsSaleId && (
                  <span className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                    Replacement sale
                  </span>
                )}
                {sale.replacedBySaleId && (
                  <span className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                    Replaced
                  </span>
                )}
              </div>

              <ul className="text-sm text-[var(--foreground)]">
                {sale.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.productName}
                  </li>
                ))}
              </ul>

              {isVoided && sale.voidReason && (
                <p className="text-sm text-[var(--muted-foreground)]">Reason: {sale.voidReason}</p>
              )}

              {!isVoided && (
                <Button type="button" variant="destructive" className="h-11" onClick={() => setVoiding(sale)}>
                  Void sale
                </Button>
              )}
              {isVoided && !sale.replacedBySaleId && (
                <Link
                  href={`/sales/replace/${sale.id}`}
                  className={`${buttonVariants({ variant: 'outline' })} h-11 px-4`}
                >
                  Record replacement
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <VoidSaleModal sale={voiding} onClose={() => setVoiding(null)} />
    </>
  );
}
