'use client';

import * as React from 'react';
import { AlertTriangle, PackagePlus } from 'lucide-react';
import { recordRestockAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseMoneyInput, formatMoney } from '@/lib/money';
import { parseQuantityInput } from '@/lib/quantity';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: { id: string; name: string }[];
  products: { id: string; name: string; costPriceCentavos: number }[];
  defaultBranchId?: string;
  defaultProductId?: string;
  onSuccess?: () => void;
}

interface RestockFormProps {
  onClose: () => void;
  branches: { id: string; name: string }[];
  products: { id: string; name: string; costPriceCentavos: number }[];
  defaultBranchId?: string;
  defaultProductId?: string;
  onSuccess?: () => void;
}

function RestockForm({
  onClose,
  branches,
  products,
  defaultBranchId,
  defaultProductId,
  onSuccess,
}: RestockFormProps) {
  const [selectedBranchId, setSelectedBranchId] = React.useState(
    defaultBranchId || (branches[0]?.id ?? '')
  );
  const [selectedProductId, setSelectedProductId] = React.useState(
    defaultProductId || (products[0]?.id ?? '')
  );
  const [quantityStr, setQuantityStr] = React.useState('');
  const [newCostPriceStr, setNewCostPriceStr] = React.useState('');
  const [noteStr, setNoteStr] = React.useState('');

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [quantityError, setQuantityError] = React.useState<string | null>(null);
  const [costPriceError, setCostPriceError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const currentProduct = React.useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setQuantityError(null);
    setCostPriceError(null);

    if (!selectedBranchId) {
      setErrorMsg('Please select a branch.');
      return;
    }

    if (!selectedProductId) {
      setErrorMsg('Please select a product.');
      return;
    }

    // 1. Validate quantity
    const qtyParsed = parseQuantityInput(quantityStr, {
      min: 1,
      max: 100000,
      fieldName: 'Restock quantity',
    });

    if (!qtyParsed.success) {
      setQuantityError(qtyParsed.error);
      return;
    }

    // 2. Validate optional cost price
    let parsedCostCentavos: number | null = null;
    if (newCostPriceStr.trim() !== '') {
      const costParsed = parseMoneyInput(newCostPriceStr, {
        minCentavos: 0,
        fieldName: 'New cost price',
      });
      if (!costParsed.success) {
        setCostPriceError(costParsed.error);
        return;
      }
      parsedCostCentavos = costParsed.centavos;
    }

    setIsSubmitting(true);

    try {
      const res = await recordRestockAction({
        branchId: selectedBranchId,
        productId: selectedProductId,
        quantity: qtyParsed.quantity,
        newCostPriceCentavos: parsedCostCentavos,
        note: noteStr.trim() || null,
      });

      if (!res.ok) {
        setErrorMsg(res.error.message);
        setIsSubmitting(false);
        return;
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg('An unexpected error occurred while recording restock.');
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
        <Label htmlFor="restock-branch">Target Branch</Label>
        <select
          id="restock-branch"
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
        <Label htmlFor="restock-product">Product</Label>
        <select
          id="restock-product"
          value={selectedProductId}
          onChange={(e) => {
            setSelectedProductId(e.target.value);
            setNewCostPriceStr('');
          }}
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

      {/* Quantity Field */}
      <div className="space-y-1.5">
        <Label htmlFor="restock-quantity">
          Quantity Received <span className="text-[var(--destructive)]">*</span>
        </Label>
        <Input
          id="restock-quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={100000}
          step={1}
          placeholder="e.g. 20"
          value={quantityStr}
          onChange={(e) => {
            setQuantityStr(e.target.value);
            setQuantityError(null);
          }}
          disabled={isSubmitting}
          className="h-11"
        />
        {quantityError ? (
          <p className="text-xs text-[var(--destructive)]">{quantityError}</p>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">Whole number between 1 and 100,000.</p>
        )}
      </div>

      {/* Optional New Cost Price */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="restock-cost">New Cost Price (Optional)</Label>
          {currentProduct && (
            <span className="text-xs text-[var(--muted-foreground)]">
              Current: {formatMoney(currentProduct.costPriceCentavos)}
            </span>
          )}
        </div>
        <Input
          id="restock-cost"
          type="text"
          inputMode="decimal"
          placeholder={currentProduct ? (currentProduct.costPriceCentavos / 100).toFixed(2) : '0.00'}
          value={newCostPriceStr}
          onChange={(e) => {
            setNewCostPriceStr(e.target.value);
            setCostPriceError(null);
          }}
          disabled={isSubmitting}
          className="h-11 font-mono"
        />
        {costPriceError ? (
          <p className="text-xs text-[var(--destructive)]">{costPriceError}</p>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">
            Leave blank to keep current cost price. Updates product cost for future sales.
          </p>
        )}
      </div>

      {/* Optional Note */}
      <div className="space-y-1.5">
        <Label htmlFor="restock-note">Supplier / Delivery Note (Optional)</Label>
        <Input
          id="restock-note"
          type="text"
          placeholder="e.g. Invoice #4892 from VapeDistro"
          value={noteStr}
          onChange={(e) => setNoteStr(e.target.value)}
          disabled={isSubmitting}
          maxLength={500}
          className="h-11"
        />
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
          <PackagePlus className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Recording...' : 'Confirm Restock'}
        </Button>
      </div>
    </form>
  );
}

export function RestockModal({
  isOpen,
  onClose,
  branches,
  products,
  defaultBranchId,
  defaultProductId,
  onSuccess,
}: RestockModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restock Inventory"
      description="Record incoming stock for a branch. Optionally update the product's current cost price."
    >
      {isOpen && (
        <RestockForm
          onClose={onClose}
          branches={branches}
          products={products}
          defaultBranchId={defaultBranchId}
          defaultProductId={defaultProductId}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
}
