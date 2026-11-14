'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/shared/money-text';
import type { CartLine } from '../cart';
import type { PaymentMethod } from '../schemas';

interface SaleReviewProps {
  lines: CartLine[];
  total: number;
  paymentMethod: PaymentMethod;
  errorMessage: string | null;
  isSubmitting: boolean;
  /** Position classes for the fixed action bar, shared with the cart bar so both sit above the tab bar. */
  barClassName: string;
  onPaymentChange: (method: PaymentMethod) => void;
  onSetQuantity: (productId: string, quantity: number) => void;
  onBack: () => void;
  onConfirm: () => void;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: 'Cash', gcash: 'GCash' };

export function SaleReview({
  lines,
  total,
  paymentMethod,
  errorMessage,
  isSubmitting,
  barClassName,
  onPaymentChange,
  onSetQuantity,
  onBack,
  onConfirm,
}: SaleReviewProps) {
  return (
    <div className="space-y-4 pb-48">
      <ul className="space-y-2">
        {lines.map((line) => (
          <li
            key={line.productId}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--foreground)]">{line.name}</p>
              <MoneyText centavos={line.priceCentavos} className="text-sm text-[var(--muted-foreground)]" />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                aria-label={`Take one ${line.name}`}
                disabled={isSubmitting}
                onClick={() => onSetQuantity(line.productId, line.quantity - 1)}
                className="h-11 w-11 text-lg"
              >
                −
              </Button>
              <span className="w-8 text-center text-base font-semibold tabular-nums">{line.quantity}</span>
              <Button
                type="button"
                variant="outline"
                aria-label={`Add one ${line.name}`}
                disabled={isSubmitting}
                onClick={() => onSetQuantity(line.productId, line.quantity + 1)}
                className="h-11 w-11 text-lg"
              >
                +
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--foreground)]">How did the customer pay?</p>
        <div className="grid grid-cols-2 gap-2">
          {(['cash', 'gcash'] as const).map((method) => (
            <Button
              key={method}
              type="button"
              variant={paymentMethod === method ? 'default' : 'outline'}
              aria-pressed={paymentMethod === method}
              disabled={isSubmitting}
              onClick={() => onPaymentChange(method)}
              className="h-12 text-base"
            >
              {PAYMENT_LABELS[method]}
            </Button>
          ))}
        </div>
      </div>

      {/* Fixed at the bottom so Confirm is always under the thumb, with the total and any error beside it. */}
      <div className={`fixed inset-x-0 z-20 border-t border-[var(--border)] bg-[var(--card)] p-4 ${barClassName}`}>
        <div className="mx-auto max-w-lg space-y-3">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold text-[var(--foreground)]">Total</span>
            <MoneyText centavos={total} className="text-3xl font-bold text-[var(--foreground)]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onBack} className="h-12 text-base">
              Back
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || lines.length === 0}
              onClick={onConfirm}
              className="h-12 text-base"
            >
              {isSubmitting ? 'Recording…' : 'Confirm sale'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
