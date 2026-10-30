'use client';

import * as React from 'react';
import { AlertTriangle, SlidersHorizontal, MinusCircle, PlusCircle } from 'lucide-react';
import { recordAdjustmentAction } from '../actions';
import { ADJUSTMENT_REASONS, type AdjustmentReason } from '../types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseQuantityInput } from '@/lib/quantity';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: { id: string; name: string }[];
  products: { id: string; name: string }[];
  defaultBranchId?: string;
  defaultProductId?: string;
  currentStockOnHand?: number;
  onSuccess?: () => void;
}

interface AdjustmentFormProps {
  onClose: () => void;
  branches: { id: string; name: string }[];
  products: { id: string; name: string }[];
  defaultBranchId?: string;
  defaultProductId?: string;
  currentStockOnHand?: number;
  onSuccess?: () => void;
}

function AdjustmentForm({
  onClose,
  branches,
  products,
  defaultBranchId,
  defaultProductId,
  currentStockOnHand,
  onSuccess,
}: AdjustmentFormProps) {
  const [selectedBranchId, setSelectedBranchId] = React.useState(
    defaultBranchId || (branches[0]?.id ?? '')
  );
  const [selectedProductId, setSelectedProductId] = React.useState(
    defaultProductId || (products[0]?.id ?? '')
  );
  const [direction, setDirection] = React.useState<'deduct' | 'add'>('deduct');
  const [magnitudeStr, setMagnitudeStr] = React.useState('');
  const [reason, setReason] = React.useState<AdjustmentReason>('Damaged / Expired');
  const [noteStr, setNoteStr] = React.useState('');

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [quantityError, setQuantityError] = React.useState<string | null>(null);
  const [noteError, setNoteError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Projected stock preview
  const parsedMagnitude = parseInt(magnitudeStr, 10);
  const signedQty = Number.isInteger(parsedMagnitude) && parsedMagnitude > 0
    ? direction === 'deduct' ? -parsedMagnitude : parsedMagnitude
    : 0;

  const projectedStock = typeof currentStockOnHand === 'number'
    ? currentStockOnHand + signedQty
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setQuantityError(null);
    setNoteError(null);

    if (!selectedBranchId) {
      setErrorMsg('Please select a branch.');
      return;
    }

    if (!selectedProductId) {
      setErrorMsg('Please select a product.');
      return;
    }

    // 1. Validate magnitude
    const qtyParsed = parseQuantityInput(magnitudeStr, {
      min: 1,
      max: 100000,
      fieldName: 'Adjustment units',
    });

    if (!qtyParsed.success) {
      setQuantityError(qtyParsed.error);
      return;
    }

    const finalSignedQuantity = direction === 'deduct'
      ? -qtyParsed.quantity
      : qtyParsed.quantity;

    // 2. Validate note
    const trimmedNote = noteStr.trim();
    if (trimmedNote.length < 3) {
      setNoteError('Please enter a clear explanation note (minimum 3 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await recordAdjustmentAction({
        branchId: selectedBranchId,
        productId: selectedProductId,
        quantityChange: finalSignedQuantity,
        reason,
        note: trimmedNote,
      });

      if (!res.ok) {
        setErrorMsg(res.error.message);
        setIsSubmitting(false);
        return;
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg('An unexpected error occurred while recording stock adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Branch Selector */}
      <div className="space-y-1.5">
        <Label htmlFor="adjust-branch">Branch</Label>
        <select
          id="adjust-branch"
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          disabled={isSubmitting}
          className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product Selector */}
      <div className="space-y-1.5">
        <Label htmlFor="adjust-product">Product</Label>
        <select
          id="adjust-product"
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          disabled={isSubmitting}
          className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Direction Toggle */}
      <div className="space-y-1.5">
        <Label>Adjustment Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection('deduct')}
            className={`flex items-center justify-center gap-2 rounded-[var(--radius-md)] border p-3 text-sm font-medium transition-colors ${
              direction === 'deduct'
                ? 'border-[var(--destructive)] bg-[var(--destructive)]/10 text-[var(--destructive)] font-semibold'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            <MinusCircle className="h-4 w-4" />
            <span>Reduce Stock (-)</span>
          </button>
          <button
            type="button"
            onClick={() => setDirection('add')}
            className={`flex items-center justify-center gap-2 rounded-[var(--radius-md)] border p-3 text-sm font-medium transition-colors ${
              direction === 'add'
                ? 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)] font-semibold'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Stock (+)</span>
          </button>
        </div>
      </div>

      {/* Quantity Field */}
      <div className="space-y-1.5">
        <Label htmlFor="adjust-quantity">
          Units to {direction === 'deduct' ? 'Deduct' : 'Add'}{' '}
          <span className="text-[var(--destructive)]">*</span>
        </Label>
        <Input
          id="adjust-quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={100000}
          step={1}
          placeholder="e.g. 2"
          value={magnitudeStr}
          onChange={(e) => {
            setMagnitudeStr(e.target.value);
            setQuantityError(null);
          }}
          disabled={isSubmitting}
          className="h-11"
        />
        {quantityError ? (
          <p className="text-xs text-[var(--destructive)]">{quantityError}</p>
        ) : typeof currentStockOnHand === 'number' ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            Current: <span className="font-semibold">{currentStockOnHand}</span>
            {signedQty !== 0 && (
              <>
                {' '}
                → Adjusted: <span className="font-semibold">{projectedStock}</span>
              </>
            )}
          </p>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">Whole number between 1 and 100,000.</p>
        )}
      </div>

      {/* Reason Dropdown */}
      <div className="space-y-1.5">
        <Label htmlFor="adjust-reason">
          Reason <span className="text-[var(--destructive)]">*</span>
        </Label>
        <select
          id="adjust-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as AdjustmentReason)}
          disabled={isSubmitting}
          className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {ADJUSTMENT_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Required Note */}
      <div className="space-y-1.5">
        <Label htmlFor="adjust-note">
          Explanation Note <span className="text-[var(--destructive)]">*</span>
        </Label>
        <Input
          id="adjust-note"
          type="text"
          placeholder={
            reason.includes('Transfer')
              ? 'e.g. Transferred to Branch 2 per owner instruction'
              : 'e.g. Broken packaging discovered during shelf check'
          }
          value={noteStr}
          onChange={(e) => {
            setNoteStr(e.target.value);
            setNoteError(null);
          }}
          disabled={isSubmitting}
          maxLength={500}
          className="h-11"
        />
        {noteError ? (
          <p className="text-xs text-[var(--destructive)]">{noteError}</p>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">
            Required explanation. Recorded permanently in the activity log.
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-11 px-5"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 px-5 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 font-medium"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Recording...' : 'Save Adjustment'}
        </Button>
      </div>
    </form>
  );
}

export function AdjustmentModal({
  isOpen,
  onClose,
  branches,
  products,
  defaultBranchId,
  defaultProductId,
  currentStockOnHand,
  onSuccess,
}: AdjustmentModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Stock"
      description="Record manual stock adjustments for damage, loss, count corrections, or branch transfers."
    >
      {isOpen && (
        <AdjustmentForm
          onClose={onClose}
          branches={branches}
          products={products}
          defaultBranchId={defaultBranchId}
          defaultProductId={defaultProductId}
          currentStockOnHand={currentStockOnHand}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
}
