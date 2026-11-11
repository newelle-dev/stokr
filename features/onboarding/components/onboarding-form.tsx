'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { onboardingSchema, type OnboardingInput } from '../schemas';
import { createShopAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

type ProductRow = {
  name: string;
  category: 'liquid' | 'device' | 'cartridge' | 'other';
  sellingPrice: string;
  costPrice: string;
  lowStockThreshold: string;
};

const emptyProduct: ProductRow = {
  name: '',
  category: 'liquid',
  sellingPrice: '',
  costPrice: '',
  lowStockThreshold: '5',
};

export function OnboardingForm() {
  const router = useRouter();
  const [shopName, setShopName] = React.useState('');
  const [branchName, setBranchName] = React.useState('');
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [storeCode, setStoreCode] = React.useState<string | null>(null);

  const updateProduct = (index: number, patch: Partial<ProductRow>) =>
    setProducts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const input: OnboardingInput = { shopName, branchName, products };
    const parsed = onboardingSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createShopAction(input);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setStoreCode(result.data.storeCode);
    } catch {
      setError('Could not set up your shop. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (storeCode) {
    return (
      <Card className="w-full border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Your shop is ready</CardTitle>
          <CardDescription>Write down your store code. Staff need it to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-[var(--radius-md)] bg-[var(--muted)] p-4 text-center font-mono text-3xl tracking-widest">
            {storeCode}
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            This is the only time this code is shown.
          </p>
          <Button className="h-12 w-full text-base font-semibold" onClick={() => router.push('/dashboard')}>
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-[var(--border)] bg-[var(--card)]">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Set up your shop</CardTitle>
        <CardDescription>Add your shop and first branch. Products are optional.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {error && (
            <p role="alert" className="text-sm text-[var(--destructive)]">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="shopName">Shop name</Label>
            <Input
              id="shopName"
              className="h-12 text-base"
              value={shopName}
              disabled={isSubmitting}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchName">First branch name</Label>
            <Input
              id="branchName"
              className="h-12 text-base"
              placeholder="e.g. Main"
              value={branchName}
              disabled={isSubmitting}
              onChange={(e) => setBranchName(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium">Products (optional)</p>
            {products.map((row, index) => (
              <div key={index} className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <Input
                  aria-label={`Product ${index + 1} name`}
                  className="h-12 text-base"
                  placeholder="Product name"
                  value={row.name}
                  disabled={isSubmitting}
                  onChange={(e) => updateProduct(index, { name: e.target.value })}
                />
                <select
                  aria-label={`Product ${index + 1} category`}
                  className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 text-base"
                  value={row.category}
                  disabled={isSubmitting}
                  onChange={(e) => updateProduct(index, { category: e.target.value as ProductRow['category'] })}
                >
                  <option value="liquid">Liquid</option>
                  <option value="device">Device</option>
                  <option value="cartridge">Cartridge</option>
                  <option value="other">Other</option>
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    aria-label={`Product ${index + 1} selling price`}
                    className="h-12 text-base"
                    placeholder="Sell ₱"
                    inputMode="decimal"
                    value={row.sellingPrice}
                    disabled={isSubmitting}
                    onChange={(e) => updateProduct(index, { sellingPrice: e.target.value })}
                  />
                  <Input
                    aria-label={`Product ${index + 1} cost price`}
                    className="h-12 text-base"
                    placeholder="Cost ₱"
                    inputMode="decimal"
                    value={row.costPrice}
                    disabled={isSubmitting}
                    onChange={(e) => updateProduct(index, { costPrice: e.target.value })}
                  />
                  <Input
                    aria-label={`Product ${index + 1} low-stock threshold`}
                    className="h-12 text-base"
                    placeholder="Low at"
                    inputMode="numeric"
                    value={row.lowStockThreshold}
                    disabled={isSubmitting}
                    onChange={(e) => updateProduct(index, { lowStockThreshold: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full"
                  disabled={isSubmitting}
                  onClick={() => setProducts((rows) => rows.filter((_, i) => i !== index))}
                >
                  Remove product
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={isSubmitting || products.length >= 50}
              onClick={() => setProducts((rows) => [...rows, { ...emptyProduct }])}
            >
              Add a product
            </Button>
          </div>

          <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isSubmitting}>
            {isSubmitting ? 'Setting up…' : 'Create my shop'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
