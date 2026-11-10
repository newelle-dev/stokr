'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/shared/money-text';
import type { RecordSaleResult } from '../actions';

interface SaleDoneProps {
  result: RecordSaleResult;
  onNewSale: () => void;
}

export function SaleDone({ result, onNewSale }: SaleDoneProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success)]/10">
        <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Sale recorded</h2>
        <MoneyText centavos={result.totalCentavos} className="text-3xl font-bold text-[var(--foreground)]" />
      </div>

      {result.flaggedProducts.length > 0 && (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--warning)]/10 p-3 text-left text-sm text-[var(--warning)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Now out of stock at this branch: {result.flaggedProducts.join(', ')}. The sale still counts.
          </span>
        </div>
      )}

      <Button type="button" onClick={onNewSale} className="h-12 w-full text-base">
        New sale
      </Button>
    </div>
  );
}
