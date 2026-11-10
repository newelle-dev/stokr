'use client';

import * as React from 'react';
import { voidSaleAction } from '../actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyText } from '@/components/shared/money-text';

interface VoidSaleModalProps {
  sale: { id: string; totalCentavos: number } | null;
  onClose: () => void;
}

export function VoidSaleModal({ sale, onClose }: VoidSaleModalProps) {
  const [reason, setReason] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function handleClose() {
    if (isSubmitting) return;
    setReason('');
    setErrorMsg(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sale || isSubmitting) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await voidSaleAction({ saleId: sale.id, reason });
      if (!res.ok) {
        setErrorMsg(res.error.message);
        return;
      }
      setReason('');
      onClose();
    } catch {
      setErrorMsg('Could not reach the server. Check the connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={sale !== null}
      onClose={handleClose}
      title="Void this sale?"
      description="The sale stays in the list as voided and its stock goes back. This cannot be undone."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {sale && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Sale total: <MoneyText centavos={sale.totalCentavos} className="font-semibold text-[var(--foreground)]" />
          </p>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm font-medium text-[var(--destructive)]"
          >
            {errorMsg}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="void-reason" className="text-sm font-medium">
            Reason (required)
          </Label>
          <Input
            id="void-reason"
            type="text"
            maxLength={200}
            className="h-11"
            placeholder="e.g. Wrong item rung up"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" className="h-11" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" className="h-11" disabled={isSubmitting || reason.trim() === ''}>
            {isSubmitting ? 'Voiding…' : 'Void sale'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
