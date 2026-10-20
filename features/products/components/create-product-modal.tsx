'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { createProductSchema, type CreateProductInput } from '../schemas';
import { createProductAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parsePesosToCentavos, formatMoney } from '@/lib/money';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'liquid', label: 'Liquid' },
  { value: 'device', label: 'Device' },
  { value: 'cartridge', label: 'Cartridge' },
  { value: 'other', label: 'Other' },
] as const;

export function CreateProductModal({ isOpen, onClose }: CreateProductModalProps) {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Raw string inputs for currency (pesos with decimals)
  const [sellingPriceStr, setSellingPriceStr] = React.useState('');
  const [costPriceStr, setCostPriceStr] = React.useState('');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      category: 'liquid',
      sellingPriceCentavos: 0,
      costPriceCentavos: 0,
      lowStockThreshold: 5,
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

  const onSubmit = async (data: CreateProductInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await createProductAction(data);
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }
      handleClose();
    } catch {
      setErrorMsg('Failed to create product. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setSellingPriceStr('');
    setCostPriceStr('');
    setErrorMsg(null);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Product"
      description="Add a product to your catalog with cost and selling prices."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)] font-medium"
          >
            {errorMsg}
          </div>
        )}

        {/* Below Cost Warning Banner */}
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
          <Label htmlFor="productName" className="text-sm font-medium">
            Product Name
          </Label>
          <Input
            id="productName"
            type="text"
            placeholder="e.g. Relx Pod Pro Strawberry"
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
          <Label htmlFor="category" className="text-sm font-medium">
            Category
          </Label>
          <select
            id="category"
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
            <Label htmlFor="costPrice" className="text-sm font-medium">
              Cost Price (₱)
            </Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
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
            <Label htmlFor="sellingPrice" className="text-sm font-medium">
              Selling Price (₱)
            </Label>
            <Input
              id="sellingPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
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
          <Label htmlFor="lowStockThreshold" className="text-sm font-medium">
            Low Stock Threshold (Units)
          </Label>
          <Input
            id="lowStockThreshold"
            type="number"
            min="0"
            step="1"
            placeholder="5"
            className="h-11 font-mono text-base"
            disabled={isSubmitting}
            {...register('lowStockThreshold', { valueAsNumber: true })}
          />
          {errors.lowStockThreshold ? (
            <p className="text-xs text-[var(--destructive)]">
              {errors.lowStockThreshold.message}
            </p>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">
              Alert owner when stock on hand falls to or below this quantity.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
