'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { recordReplacementSaleAction, recordSaleAction, type RecordSaleResult } from '../actions';
import { cartItemCount, cartReducer, cartTotalCentavos, MAX_LINES } from '../cart';
import type { SellProduct, SellScreenData } from '../queries';
import type { PaymentMethod } from '../schemas';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/shared/money-text';
import { ProductPicker } from './product-picker';
import { SaleReview } from './sale-review';
import { SaleDone } from './sale-done';

type View = 'pick' | 'review' | 'done';

type SellCounterProps = {
  data: SellScreenData;
  /** Owner replacement mode: the sale is linked to this voided sale and the owner returns to /sales afterwards. */
  correctsSaleId?: string;
};

export function SellCounter({ data, correctsSaleId }: SellCounterProps) {
  const [lines, dispatch] = React.useReducer(cartReducer, []);
  const [view, setView] = React.useState<View>('pick');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cash');
  const [branchId, setBranchId] = React.useState(data.homeBranchId ?? data.branches[0]?.id ?? '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<RecordSaleResult | null>(null);
  // One id per sale attempt: a double tap or a retry after a lost reply cannot record the sale twice
  const requestIdRef = React.useRef<string | null>(null);

  const total = cartTotalCentavos(lines);
  const itemCount = cartItemCount(lines);
  const quantityById = Object.fromEntries(lines.map((l) => [l.productId, l.quantity]));
  const isFull = lines.length >= MAX_LINES;

  function handleAdd(product: SellProduct) {
    dispatch({ type: 'add', productId: product.id, name: product.name, priceCentavos: product.priceCentavos });
  }

  async function handleConfirm() {
    if (isSubmitting || lines.length === 0 || !branchId) return;
    const requestId = (requestIdRef.current ??= crypto.randomUUID());

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const input = {
        branchId,
        paymentMethod,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        clientRequestId: requestId,
      };
      const res = correctsSaleId
        ? await recordReplacementSaleAction({ ...input, correctsSaleId })
        : await recordSaleAction(input);

      if (!res.ok) {
        setErrorMessage(res.error.message);
        return;
      }

      requestIdRef.current = null;
      setResult(res.data);
      dispatch({ type: 'clear' });
      setView('done');
    } catch {
      setErrorMessage('Could not reach the server. Check the connection and tap Confirm sale again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNewSale() {
    requestIdRef.current = null;
    setResult(null);
    setErrorMessage(null);
    setPaymentMethod('cash');
    setView('pick');
  }

  if (view === 'done' && result) {
    return <SaleDone result={result} onNewSale={startNewSale} backHref={correctsSaleId ? '/sales' : undefined} />;
  }

  if (view === 'review' && lines.length > 0) {
    return (
      <SaleReview
        lines={lines}
        total={total}
        paymentMethod={paymentMethod}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onPaymentChange={setPaymentMethod}
        onSetQuantity={(productId, quantity) => dispatch({ type: 'set', productId, quantity })}
        onBack={() => setView('pick')}
        onConfirm={handleConfirm}
      />
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {data.isOwner && data.branches.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="sale-branch" className="text-sm font-medium text-[var(--foreground)]">
            Branch
          </label>
          <select
            id="sale-branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="flex h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {data.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!branchId && (
        <p role="alert" className="flex items-center gap-2 text-sm text-[var(--destructive)]">
          <AlertTriangle className="h-4 w-4" /> Your account has no branch yet. Ask the owner to assign one.
        </p>
      )}

      <ProductPicker products={data.products} quantityById={quantityById} isFull={isFull} onAdd={handleAdd} />

      {itemCount > 0 && (
        <div className={`fixed inset-x-0 z-20 ${correctsSaleId ? 'bottom-16 md:bottom-0' : 'bottom-0'} border-t border-[var(--border)] bg-[var(--card)] p-4`}>
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
              <MoneyText centavos={total} className="text-xl font-bold text-[var(--foreground)]" />
            </div>
            <Button type="button" onClick={() => setView('review')} className="h-12 px-6 text-base">
              Review sale
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
