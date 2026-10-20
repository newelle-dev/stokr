'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { updateProductSchema, type UpdateProductInput } from '../schemas';
import { updateProductAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parsePesosToCentavos, centavosToPesos, formatMoney } from '@/lib/money';
import type { ProductItem } from '../types';

interface EditProductModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'liquid', label: 'Liquid' },
  { value: 'device', label: 'Device' },
  { value: 'cartridge', label: 'Cartridge' },
  { value: 'other', label: 'Other' },
] as const;

interface EditProductFormProps {
  product: ProductItem;
  onClose: () => void;
}

function EditProductForm({ product, onClose }: EditProductFormProps) {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [sellingPriceStr, setSellingPriceStr] = React.useState(() =>
    centavosToPesos(product.sellingPriceCentavos).toString()
  );
  const [costPriceStr, setCostPriceStr] = React.useState(() =>
    centavosToPesos(product.costPriceCentavos).toString()
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateProductInput>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: {
      id: product.id,
      name: product.name,
      category: product.category,
      sellingPriceCentavos: product.sellingPriceCentavos,
      costPriceCentavos: product.costPriceCentavos,
      lowStockThreshold: product.lowStockThreshold,
    },
  });

  const sellingCentavos = React.useMemo(() => {
    try {
      return parsePesosToCentavos(parseFloat(sellingPriceStr) || 0);
    } catch {
      return 0;
    }
  }, [sellingPriceStr]);

  const costCentavos = React.useMemo(() => {
    try {
      return parsePesosToCentavos(parseFloat(costPriceStr) || 0);
    } catch {
      return 0;
    }
  }, [costPriceStr]);

  const isBelowCost = sellingCentavos > 0 && costCentavos > 0 && sellingCentavos < costCentavos;

  const onSellingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSellingPriceStr(val);
    try {
      setValue('sellingPriceCentavos', parsePesosToCentavos(parseFloat(val) || 0));
    } catch {
      setValue('sellingPriceCentavos', 0);
    }
  };

  const onCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCostPriceStr(val);
    try {
      setValue('costPriceCentavos', parsePesosToCentavos(parseFloat(val) || 0));
    } catch {
      setValue('costPriceCentavos', 0);
    }
  };

  const onSubmit = async (data: UpdateProductInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await updateProductAction(data);
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch {
      setErrorMsg('Failed to update product. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMsg && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)] font-medium"
        >
          {errorMsg}
        </div>
      )}

      {isBelowCost && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-3 text-sm text-[var(--foreground)]"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" />
          <div>
            <p className="font-semibold text-[var(--warning)]">
              Warning: Selling price is below cost price!
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Selling at {formatMoney(sellingCentavos)} will result in a loss of{' '}
              <strong className="text-[var(--destructive)]">
                {formatMoney(costCentavos - sellingCentavos)}
              </strong>{' '}
              per unit sold.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="editProductName" className="text-sm font-medium">
          Product Name
        </Label>
        <Input
          id="editProductName"
          type="text"
          className="h-11"
          disabled={isSubmitting}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-[var(--destructive)]">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="editCategory" className="text-sm font-medium">
          Category
        </Label>
        <select
          id="editCategory"
          className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
          disabled={isSubmitting}
          {...register('category')}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-xs text-[var(--destructive)]">
            {errors.category.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="editCostPrice" className="text-sm font-medium">
            Cost Price (₱)
          </Label>
          <Input
            id="editCostPrice"
            type="number"
            step="0.01"
            min="0"
            className="h-11 font-mono text-base"
            disabled={isSubmitting}
            value={costPriceStr}
            onChange={onCostChange}
          />
          {errors.costPriceCentavos && (
            <p className="text-xs text-[var(--destructive)]">
              {errors.costPriceCentavos.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="editSellingPrice" className="text-sm font-medium">
            Selling Price (₱)
          </Label>
          <Input
            id="editSellingPrice"
            type="number"
            step="0.01"
            min="0"
            className="h-11 font-mono text-base"
            disabled={isSubmitting}
            value={sellingPriceStr}
            onChange={onSellingChange}
          />
          {errors.sellingPriceCentavos && (
            <p className="text-xs text-[var(--destructive)]">
              {errors.sellingPriceCentavos.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="editLowStockThreshold" className="text-sm font-medium">
          Low Stock Threshold (Units)
        </Label>
        <Input
          id="editLowStockThreshold"
          type="number"
          min="0"
          step="1"
          className="h-11 font-mono text-base"
          disabled={isSubmitting}
          {...register('lowStockThreshold', { valueAsNumber: true })}
        />
        {errors.lowStockThreshold && (
          <p className="text-xs text-[var(--destructive)]">
            {errors.lowStockThreshold.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

export function EditProductModal({ product, isOpen, onClose }: EditProductModalProps) {
  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Product"
      description={`Update catalog details for ${product.name}`}
    >
      <EditProductForm key={product.id} product={product} onClose={onClose} />
    </Modal>
  );
}
