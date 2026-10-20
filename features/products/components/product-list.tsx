'use client';

import * as React from 'react';
import { Plus, Search, Edit2, Ban, CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import type { ProductItem } from '../types';
import type { ProductCategory } from '@/lib/supabase/database.types';
import { toggleProductActiveAction } from '../actions';
import { MoneyText } from '@/components/shared/money-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateProductModal } from './create-product-modal';
import { EditProductModal } from './edit-product-modal';

interface ProductListProps {
  products: ProductItem[];
}

const CATEGORY_TABS: { label: string; value: 'all' | ProductCategory }[] = [
  { label: 'All', value: 'all' },
  { label: 'Liquid', value: 'liquid' },
  { label: 'Device', value: 'device' },
  { label: 'Cartridge', value: 'cartridge' },
  { label: 'Other', value: 'other' },
];

export function ProductList({ products }: ProductListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | ProductCategory>('all');
  const [showInactive, setShowInactive] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<ProductItem | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      // Status filter
      if (!showInactive && !p.isActive) return false;
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [products, showInactive, selectedCategory, searchQuery]);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setActionError(null);
    setIsProcessing(true);
    try {
      const result = await toggleProductActiveAction({
        id,
        isActive: !currentActive,
      });
      if (!result.ok) {
        setActionError(result.error.message);
      }
    } catch {
      setActionError('Failed to change product status.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            Product Catalog ({products.filter((p) => p.isActive).length} Active)
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your shop&apos;s master catalog with cost and selling prices.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 self-start sm:self-auto font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </Button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)] font-medium"
        >
          {actionError}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              type="text"
              placeholder="Search products by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className={`rounded-[var(--radius-md)] border px-3 py-2 text-xs font-medium transition-colors ${
                showInactive
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {showInactive ? 'Showing Inactive' : 'Show Inactive'}
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedCategory(tab.value)}
              className={`rounded-[var(--radius-full)] px-3 py-1.5 transition-colors whitespace-nowrap ${
                selectedCategory === tab.value
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product List: Mobile Cards + Desktop Table */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-12 text-center">
          <Package className="h-10 w-10 text-[var(--muted-foreground)]/60 mb-2" />
          <h4 className="font-semibold text-[var(--foreground)]">No products found</h4>
          <p className="text-sm text-[var(--muted-foreground)] mt-1 max-w-sm">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Add your first product to start building your catalog.'}
          </p>
          {!searchQuery && selectedCategory === 'all' && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Product</span>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Threshold</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredProducts.map((p) => {
                  const isBelowCost = p.sellingPriceCentavos < p.costPriceCentavos;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[var(--muted)]/30 transition-colors ${
                        !p.isActive ? 'opacity-60 bg-[var(--muted)]/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">
                        <div className="flex items-center gap-2">
                          <span>{p.name}</span>
                          {isBelowCost && (
                            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--destructive)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--destructive)]">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Below Cost</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-[var(--muted-foreground)]">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <MoneyText centavos={p.costPriceCentavos} className="text-[var(--muted-foreground)]" />
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold">
                        <MoneyText
                          centavos={p.sellingPriceCentavos}
                          className={isBelowCost ? 'text-[var(--destructive)] font-bold' : 'text-[var(--foreground)]'}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[var(--muted-foreground)]">
                        {p.lowStockThreshold}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-medium ${
                            p.isActive
                              ? 'bg-[var(--success)]/10 text-[var(--success)]'
                              : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.isActive ? 'bg-[var(--success)]' : 'bg-[var(--muted-foreground)]'
                            }`}
                          />
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingProduct(p)}
                            className="h-8 gap-1 text-xs"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleToggleActive(p.id, p.isActive)}
                            className={`h-8 gap-1 text-xs ${
                              p.isActive
                                ? 'text-[var(--destructive)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10'
                                : 'text-[var(--success)] hover:text-[var(--success)] hover:bg-[var(--success)]/10'
                            }`}
                          >
                            {p.isActive ? (
                              <>
                                <Ban className="h-3.5 w-3.5" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Reactivate</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (stacked cards per ui-context.md) */}
          <div className="grid gap-3 md:hidden">
            {filteredProducts.map((p) => {
              const isBelowCost = p.sellingPriceCentavos < p.costPriceCentavos;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xs ${
                    !p.isActive ? 'opacity-70 bg-[var(--muted)]/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-[var(--foreground)] text-base">
                        {p.name}
                      </h4>
                      <span className="text-xs capitalize text-[var(--muted-foreground)]">
                        {p.category}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-medium shrink-0 ${
                        p.isActive
                          ? 'bg-[var(--success)]/10 text-[var(--success)]'
                          : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {isBelowCost && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--destructive)]/10 px-2 py-1 text-xs font-semibold text-[var(--destructive)]">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Selling below cost price</span>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-[var(--radius-md)] bg-[var(--muted)]/40 p-2 text-xs">
                    <div>
                      <span className="text-[var(--muted-foreground)] block">Cost</span>
                      <MoneyText centavos={p.costPriceCentavos} className="font-medium text-[var(--foreground)]" />
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)] block">Selling</span>
                      <MoneyText
                        centavos={p.sellingPriceCentavos}
                        className={isBelowCost ? 'font-bold text-[var(--destructive)]' : 'font-semibold text-[var(--foreground)]'}
                      />
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)] block">Low Alert</span>
                      <span className="font-mono text-[var(--foreground)]">{p.lowStockThreshold} units</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1 border-t border-[var(--border)]/60 pt-2.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProduct(p)}
                      className="h-8 gap-1 text-xs"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => handleToggleActive(p.id, p.isActive)}
                      className={`h-8 gap-1 text-xs ${
                        p.isActive
                          ? 'text-[var(--destructive)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10'
                          : 'text-[var(--success)] hover:text-[var(--success)] hover:bg-[var(--success)]/10'
                      }`}
                    >
                      {p.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modals */}
      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <EditProductModal
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
      />
    </div>
  );
}
