'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyText } from '@/components/shared/money-text';
import { parseQuantityInput } from '@/lib/quantity';
import type { StockCountPageData } from '../queries';
import { missingStockByBranch } from '../gap';
import { acceptStockCountAction, cancelStockCountAction, saveStockCountAction } from '../actions';

const selectClass =
  'flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

export function CountScreen({ data }: { data: StockCountPageData }) {
  const router = useRouter();
  const [qty, setQty] = React.useState<Record<string, string>>({});
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const branchName = data.branches.find((b) => b.id === data.branchId)?.name ?? '';

  async function save() {
    setError(null);
    setMessage(null);
    const items: { productId: string; countedQty: number }[] = [];
    for (const p of data.products) {
      const raw = qty[p.id]?.trim();
      if (!raw) continue; // blank = not counted
      const parsed = parseQuantityInput(raw, { min: 0, max: 100000, allowZero: true, fieldName: `Count for ${p.name}` });
      if (!parsed.success) return setError(parsed.error);
      items.push({ productId: p.id, countedQty: parsed.quantity });
    }
    if (items.length === 0) return setError('Enter a count for at least one product.');

    setBusy(true);
    const res = await saveStockCountAction({ branchId: data.branchId!, note, items });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setQty({});
    setNote('');
    router.refresh();
  }

  async function accept() {
    setBusy(true);
    const res = await acceptStockCountAction({ countId: data.openCount!.id });
    setBusy(false);
    setConfirming(false);
    if (!res.ok) return setError(res.error.message);
    setError(null);
    setMessage(`Count accepted. ${res.data.corrections} stock correction(s) recorded.`);
    router.refresh();
  }

  async function cancel() {
    setBusy(true);
    const res = await cancelStockCountAction({ countId: data.openCount!.id });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setError(null);
    setMessage('Count cancelled. Stock was not changed.');
    router.refresh();
  }

  const open = data.openCount;
  const missing = open
    ? missingStockByBranch(open.lines.map((l) => ({ branchName, difference: l.difference, costCentavos: l.costCentavos })))[0]
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Stock count</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Count what is on the shelf. Saving shows the gap against expected stock; stock only changes when you accept.
        </p>
      </div>

      <label className="block space-y-1 text-sm font-medium text-[var(--foreground)]">
        Branch
        <select
          value={data.branchId ?? ''}
          onChange={(e) => router.push(`/stock/count?branch=${e.target.value}`)}
          className={selectClass}
        >
          {data.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--destructive)]/10 p-3.5 text-sm text-[var(--destructive)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div role="status" className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--success)]/10 p-3.5 text-sm text-[var(--success)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {!data.branchId ? (
        <p className="text-sm text-[var(--muted-foreground)]">No active branch yet. Add a branch first.</p>
      ) : open ? (
        <section className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Gap report: {branchName}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {missing ? (
                <>
                  Missing {missing.units} unit{missing.units === 1 ? '' : 's'} worth{' '}
                  <MoneyText centavos={missing.costCentavos} /> at cost.
                </>
              ) : (
                'Nothing missing in this count.'
              )}
              {open.note ? ` Note: ${open.note}` : ''}
            </p>
          </div>

          <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            {open.lines.map((l) => (
              <li key={l.productId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-medium text-[var(--foreground)]">{l.productName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Expected {l.expectedQty} · Counted {l.countedQty}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-mono text-base font-semibold tabular-nums ${
                    l.difference < 0
                      ? 'text-[var(--destructive)]'
                      : l.difference > 0
                        ? 'text-[var(--success)]'
                        : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {l.difference > 0 ? `+${l.difference}` : l.difference}
                </span>
              </li>
            ))}
          </ul>

          {confirming ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4">
              <p className="text-sm text-[var(--foreground)]">
                Accepting changes stock to match this count. It cannot be undone, only corrected with another count or an adjustment.
              </p>
              <div className="flex gap-3">
                <Button onClick={accept} disabled={busy} className="h-12 flex-1">
                  {busy ? 'Accepting...' : 'Yes, accept count'}
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy} className="h-12 flex-1">
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={() => setConfirming(true)} disabled={busy} className="h-12 flex-1">
                Accept count
              </Button>
              <Button variant="outline" onClick={cancel} disabled={busy} className="h-12 flex-1">
                Cancel count
              </Button>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Leave a product blank if you did not count it. Enter 0 if the shelf is empty.
          </p>
          {data.products.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No active products yet. Add a product first.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
              {data.products.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="break-words text-base font-medium text-[var(--foreground)]">{p.name}</p>
                    <p className="text-xs capitalize text-[var(--muted-foreground)]">{p.category}</p>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100000}
                    step={1}
                    aria-label={`Counted quantity for ${p.name}`}
                    value={qty[p.id] ?? ''}
                    onChange={(e) => setQty((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    disabled={busy}
                    className="h-11 w-24 shrink-0 text-center font-mono"
                  />
                </li>
              ))}
            </ul>
          )}
          <label className="block space-y-1 text-sm font-medium text-[var(--foreground)]">
            Note (optional)
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} disabled={busy} className="h-11" />
          </label>
          <Button onClick={save} disabled={busy || data.products.length === 0} className="h-12 w-full">
            {busy ? 'Saving...' : 'Save count and see gap'}
          </Button>
        </section>
      )}
    </div>
  );
}
