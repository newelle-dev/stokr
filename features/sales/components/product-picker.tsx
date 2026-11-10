'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { MoneyText } from '@/components/shared/money-text';
import type { SellProduct } from '../queries';

interface ProductPickerProps {
  products: SellProduct[];
  quantityById: Record<string, number>;
  isFull: boolean;
  onAdd: (product: SellProduct) => void;
}

export function ProductPicker({ products, quantityById, isFull, onAdd }: ProductPickerProps) {
  const [query, setQuery] = React.useState('');

  if (products.length === 0) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
        No products yet. Ask the owner to add products.
      </p>
    );
  }

  const needle = query.trim().toLowerCase();
  const shown = needle ? products.filter((p) => p.name.toLowerCase().includes(needle)) : products;

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

      {isFull && (
        <p className="text-sm text-[var(--warning)]">
          This sale has 50 products, the most allowed. Review it or start a new sale.
        </p>
      )}

      <ul className="space-y-2">
        {shown.map((p) => {
          const count = quantityById[p.id] ?? 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onAdd(p)}
                disabled={isFull && count === 0}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left active:bg-[var(--muted)] disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-[var(--foreground)]">{p.name}</span>
                  <span className="block text-sm capitalize text-[var(--muted-foreground)]">{p.category}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {count > 0 && (
                    <span className="rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-sm font-semibold text-[var(--primary-foreground)]">
                      ×{count}
                    </span>
                  )}
                  <MoneyText centavos={p.priceCentavos} className="text-base font-semibold text-[var(--foreground)]" />
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="text-sm text-[var(--muted-foreground)]">No products match &ldquo;{query}&rdquo;.</li>
        )}
      </ul>
    </div>
  );
}
