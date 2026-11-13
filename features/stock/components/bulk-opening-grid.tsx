'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Save,
  Lock,
} from 'lucide-react';
import type { BulkOpeningProductRow } from '../types';
import { recordBulkOpeningStockAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseQuantityInput } from '@/lib/quantity';

interface BulkOpeningGridProps {
  rows: BulkOpeningProductRow[];
  branches: { id: string; name: string }[];
}

export function BulkOpeningGrid({ rows, branches }: BulkOpeningGridProps) {
  const router = useRouter();

  // Map of `${branchId}:${productId}` -> input string
  const [quantities, setQuantities] = React.useState<Record<string, string>>({});
  const [cellErrors, setCellErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function handleCellChange(branchId: string, productId: string, value: string) {
    const key = `${branchId}:${productId}`;
    setQuantities((prev) => ({ ...prev, [key]: value }));

    // Clear error on edit
    if (cellErrors[key]) {
      setCellErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  }

  // Count how many uninitialized cells have non-empty values
  const pendingItemsCount = React.useMemo(() => {
    let count = 0;
    for (const row of rows) {
      for (const branch of row.branches) {
        if (!branch.hasOpeningStock) {
          const key = `${branch.branchId}:${row.productId}`;
          const val = quantities[key]?.trim();
          if (val && val !== '0') {
            count++;
          }
        }
      }
    }
    return count;
  }, [rows, quantities]);

  async function handleSave() {
    setGeneralError(null);
    setSuccessMsg(null);
    const errors: Record<string, string> = {};
    const itemsToSubmit: { branchId: string; productId: string; quantity: number }[] = [];

    for (const row of rows) {
      for (const branch of row.branches) {
        if (!branch.hasOpeningStock) {
          const key = `${branch.branchId}:${row.productId}`;
          const val = quantities[key]?.trim();

          // Per user decision: skip blank or empty inputs (handled later via Restock)
          if (!val || val === '0') continue;

          const parsed = parseQuantityInput(val, {
            min: 1,
            max: 100000,
            fieldName: 'Opening quantity',
          });

          if (!parsed.success) {
            errors[key] = parsed.error;
          } else {
            itemsToSubmit.push({
              branchId: branch.branchId,
              productId: row.productId,
              quantity: parsed.quantity,
            });
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setCellErrors(errors);
      setGeneralError('Please fix the highlighted invalid quantity values.');
      return;
    }

    if (itemsToSubmit.length === 0) {
      setGeneralError('No opening stock quantities entered to save.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await recordBulkOpeningStockAction({
        items: itemsToSubmit,
      });

      if (!res.ok) {
        setGeneralError(res.error.message);
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Successfully recorded opening stock for ${res.data.count} product-branch items!`);
      // Re-fetch data
      router.refresh();
      // Clear quantities
      setQuantities({});
    } catch {
      setGeneralError('An unexpected error occurred while saving bulk opening stock.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Bulk Opening Stock
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Enter starting stock for each product and branch in a single transaction. Once recorded,
            opening stock is permanent and future changes must be entered as restocks or adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/stock">
            <Button variant="outline" className="h-11 px-4">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || pendingItemsCount === 0}
            className="h-11 px-5 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 font-medium"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting
              ? 'Saving...'
              : `Save Opening Stock (${pendingItemsCount})`}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {generalError && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--destructive)]/10 p-3.5 text-sm text-[var(--destructive)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--success)]/10 p-3.5 text-sm text-[var(--success)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Matrix Table (Desktop / Tablet) */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 min-w-[220px]">Product</th>
                <th className="px-4 py-3.5 min-w-[120px]">Category</th>
                {branches.map((b) => (
                  <th key={b.id} className="px-4 py-3.5 min-w-[170px] text-center">
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((row) => (
                <tr key={row.productId} className="hover:bg-[var(--muted)]/20 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[var(--foreground)]">
                    {row.productName}
                  </td>
                  <td className="px-4 py-3.5 text-[var(--muted-foreground)] capitalize">
                    {row.category}
                  </td>
                  {row.branches.map((b) => {
                    const cellKey = `${b.branchId}:${row.productId}`;
                    const hasRecorded = b.hasOpeningStock;
                    const error = cellErrors[cellKey];

                    if (hasRecorded) {
                      return (
                        <td key={b.branchId} className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--muted)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] select-none">
                            <Lock className="h-3 w-3" />
                            Recorded: {b.recordedQuantity}
                          </span>
                        </td>
                      );
                    }

                    return (
                      <td key={b.branchId} className="px-4 py-2.5">
                        <div className="flex flex-col items-center">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={100000}
                            step={1}
                            placeholder="Qty (or blank)"
                            value={quantities[cellKey] ?? ''}
                            onChange={(e) =>
                              handleCellChange(b.branchId, row.productId, e.target.value)
                            }
                            disabled={isSubmitting}
                            className={`h-10 text-center font-mono font-medium max-w-[130px] ${
                              error ? 'border-[var(--destructive)] focus-visible:ring-[var(--destructive)]' : ''
                            }`}
                          />
                          {error && (
                            <span className="mt-1 text-[11px] text-[var(--destructive)] text-center">
                              {error}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helper text at bottom */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <Boxes className="h-4 w-4 shrink-0" />
        <span>
          Products with recorded opening stock are locked. Leave cells blank for products not yet
          present at a branch; you can restock them when they arrive.
        </span>
      </div>
    </div>
  );
}
