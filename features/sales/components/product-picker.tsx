'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { MoneyText } from '@/components/shared/money-text';
import { formatMoney } from '@/lib/money';
import type { SellProduct } from '../queries';
import { CATEGORY_FILTERS, filterProducts, type CategoryFilter } from '../product-filter';

interface ProductPickerProps {
  products: SellProduct[];
  quantityById: Record<string, number>;
  isFull: boolean;
  onAdd: (product: SellProduct) => void;
  /** Sets a line's quantity; below 1 removes the line. Lets the cashier fix a wrong tap without leaving the list. */
  onSetQuantity: (productId: string, quantity: number) => void;
}

export function ProductPicker({ products, quantityById, isFull, onAdd, onSetQuantity }: ProductPickerProps) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<CategoryFilter>('all');

  if (products.length === 0) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
        No products yet. Ask the owner to add products.
      </p>
    );
  }

  const shown = filterProducts(products, category, query);

  return (
    <div className="space-y-3">
      <Input
        type="search"
        aria-label="Search products"
        placeholder="Search products"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-12 text-base"
      />

      <div role="group" aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORY_FILTERS.map((f) => {
          const active = category === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(f.value)}
              className={`min-h-11 shrink-0 rounded-[var(--radius-full)] border px-4 text-sm font-medium transition-colors ${
                active
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] active:bg-[var(--muted)]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isFull && (
        <p className="text-sm text-[var(--warning)]">
          This sale has 50 products, the most allowed. Review it or start a new sale.
        </p>
      )}

      <ul className="space-y-2">
        {shown.map((p) => {
          const count = quantityById[p.id] ?? 0;
          const inCart = count > 0;
          // The row keeps the same height with or without a quantity, so the list never shifts under the cashier's thumb.
          return (
            <li key={p.id}>
              <div
                className={`flex min-h-14 items-center rounded-[var(--radius-lg)] border bg-[var(--card)] ${
                  inCart ? 'border-[var(--primary)]/60' : 'border-[var(--border)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onAdd(p)}
                  disabled={isFull && !inCart}
                  className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 rounded-l-[var(--radius-lg)] px-4 py-3 text-left active:bg-[var(--muted)] disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-[var(--foreground)]">{p.name}</span>
                    <span className="block truncate text-sm text-[var(--muted-foreground)]">
                      <span className="capitalize">{p.category}</span>
                      {inCart && <> · {formatMoney(p.priceCentavos)}</>}
                    </span>
                  </span>
                  {!inCart && (
                    <MoneyText centavos={p.priceCentavos} className="shrink-0 text-base font-semibold text-[var(--foreground)]" />
                  )}
                </button>

                {inCart && (
                  <div className="flex shrink-0 items-center gap-1 pr-2">
                    <button
                      type="button"
                      aria-label={`Take one ${p.name}`}
                      onClick={() => onSetQuantity(p.id, count - 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-lg active:bg-[var(--muted)]"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-base font-semibold tabular-nums" aria-label={`${count} in the sale`}>
                      {count}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one ${p.name}`}
                      onClick={() => onSetQuantity(p.id, count + 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-lg active:bg-[var(--muted)]"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="text-sm text-[var(--muted-foreground)]">
            No products match{query.trim() ? <> &ldquo;{query}&rdquo;</> : ' in this category'}.
          </li>
        )}
      </ul>
    </div>
  );
}
