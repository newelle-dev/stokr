'use client';

import * as React from 'react';
import { updateShopNameAction } from '../actions';
import { updateShopNameSchema } from '../schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ShopNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = React.useState(initialName);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [isSaving, startSave] = React.useTransition();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = updateShopNameSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid shop name');
      return;
    }

    startSave(async () => {
      const res = await updateShopNameAction({ name });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setName(res.data.name);
      setSaved(true);
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-xs"
    >
      <div className="space-y-1.5">
        <Label htmlFor="shopName">Shop name</Label>
        <Input id="shopName" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="h-11" />
      </div>
      {error && <p role="alert" className="text-sm text-[var(--destructive)]">{error}</p>}
      {saved && <p className="text-sm text-[var(--muted-foreground)]">Saved.</p>}
      <Button type="submit" disabled={isSaving} className="min-h-11 w-full">
        {isSaving ? 'Saving...' : 'Save shop name'}
      </Button>
    </form>
  );
}
