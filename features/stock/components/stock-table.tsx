'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  AlertTriangle,
  PackagePlus,
  SlidersHorizontal,
  Search,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import type { StockOverviewItem } from '../types';
import { RestockModal } from './restock-modal';
import { AdjustmentModal } from './adjustment-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/money';

interface StockTableProps {
  initialItems: StockOverviewItem[];
  branches: { id: string; name: string }[];
  totalSkus: number;
  lowStockCount: number;
  outOfStockCount: number;
  negativeStockCount: number;
  selectedBranchId?: string;
}

export function StockTable({
  initialItems,
  branches,
  totalSkus,
  lowStockCount,
  outOfStockCount,
  negativeStockCount,
  selectedBranchId = 'all',
}: StockTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [branchFilter, setBranchFilter] = React.useState(selectedBranchId);
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'low' | 'negative' | 'zero'>('all');

  // Modal states
  const [restockModalOpen, setRestockModalOpen] = React.useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState<StockOverviewItem | null>(null);

  // Derived products list for modals
  const productsForModals = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; costPriceCentavos: number }>();
    for (const item of initialItems) {
      if (!map.has(item.productId)) {
        map.set(item.productId, {
          id: item.productId,
          name: item.productName,
          costPriceCentavos: item.costPriceCentavos,
        });
      }
    }
    return Array.from(map.values());
  }, [initialItems]);

  // Handle branch switch
  function handleBranchChange(newBranchId: string) {
    setBranchFilter(newBranchId);
    if (newBranchId === 'all') {
      router.push('/stock');
    } else {
      router.push(`/stock?branch=${newBranchId}`);
    }
  }

  // Filter items
  const filteredItems = React.useMemo(() => {
    return initialItems.filter((item) => {
      // 1. Branch filter
      if (branchFilter !== 'all' && item.branchId !== branchFilter) {
        return false;
      }

      // 2. Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory) return false;
      }

      // 3. Status filter
      if (statusFilter === 'negative') return item.isNegativeStock;
      if (statusFilter === 'zero') return item.isOutOfStock;
      if (statusFilter === 'low') return item.isLowStock;

      return true;
    });
  }, [initialItems, branchFilter, searchQuery, statusFilter]);

  function openRestock(item?: StockOverviewItem) {
    setActiveItem(item || null);
    setRestockModalOpen(true);
  }

  function openAdjust(item?: StockOverviewItem) {
    setActiveItem(item || null);
    setAdjustModalOpen(true);
  }

  const uninitializedCount = initialItems.filter((i) => !i.hasOpeningStock).length;

  return (
    <div className="space-y-6">
      {/* Top Banner if products lack opening stock */}
      {uninitializedCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-4 text-sm text-[var(--foreground)]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[var(--warning)] shrink-0" />
            <div>
              <p className="font-semibold text-[var(--warning)]">
                Uninitialized Opening Stock Detected
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {uninitializedCount} product/branch pairs have not yet had initial opening stock entered.
              </p>
            </div>
          </div>
          <Link
            href="/stock/opening"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--warning)] hover:underline whitespace-nowrap"
          >
            <span>Set bulk opening stock</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-medium text-[var(--muted-foreground)]">Total Active SKUs</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[var(--foreground)]">
            {totalSkus}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
          className={`rounded-[var(--radius-lg)] border p-4 text-left transition-colors cursor-pointer ${
            statusFilter === 'low'
              ? 'border-[var(--warning)] bg-[var(--warning)]/10'
              : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Low Stock</p>
            {lowStockCount > 0 && <span className="h-2 w-2 rounded-full bg-[var(--warning)]" />}
          </div>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[var(--warning)]">
            {lowStockCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'zero' ? 'all' : 'zero')}
          className={`rounded-[var(--radius-lg)] border p-4 text-left transition-colors cursor-pointer ${
            statusFilter === 'zero'
              ? 'border-[var(--muted-foreground)] bg-[var(--muted)]'
              : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50'
          }`}
        >
          <p className="text-xs font-medium text-[var(--muted-foreground)]">Out of Stock</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[var(--muted-foreground)]">
            {outOfStockCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'negative' ? 'all' : 'negative')}
          className={`rounded-[var(--radius-lg)] border p-4 text-left transition-colors cursor-pointer ${
            statusFilter === 'negative'
              ? 'border-[var(--destructive)] bg-[var(--destructive)]/10'
              : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Negative Stock</p>
            {negativeStockCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-[var(--destructive)] animate-pulse" />
            )}
          </div>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[var(--destructive)]">
            {negativeStockCount}
          </p>
        </button>
      </div>

      {/* Control Bar: Search, Branch Selector, Action Buttons */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Left: Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 flex-1 max-w-2xl">
          {/* Branch filter */}
          <div className="sm:w-56 shrink-0">
            <select
              value={branchFilter}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              type="text"
              placeholder="Search product name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/stock/opening">
            <Button variant="outline" className="h-11 px-3.5 text-xs sm:text-sm font-medium">
              <Boxes className="mr-1.5 h-4 w-4 text-[var(--muted-foreground)]" />
              Opening Stock
            </Button>
          </Link>
          <Button
            onClick={() => openAdjust()}
            variant="outline"
            className="h-11 px-3.5 text-xs sm:text-sm font-medium"
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4 text-[var(--muted-foreground)]" />
            Adjust
          </Button>
          <Button
            onClick={() => openRestock()}
            className="h-11 px-4 text-xs sm:text-sm font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
          >
            <PackagePlus className="mr-1.5 h-4 w-4" />
            Restock
          </Button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {statusFilter !== 'all' && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--muted-foreground)] flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filtered by:
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--muted)] px-2.5 py-1 font-medium text-[var(--foreground)]">
            {statusFilter === 'low' && 'Low stock items only'}
            {statusFilter === 'negative' && 'Negative stock items only'}
            {statusFilter === 'zero' && 'Out of stock items only'}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="ml-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {/* Main Content Area: Responsive Table (Desktop) / Cards (Mobile) */}
      {filteredItems.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <Boxes className="mx-auto h-10 w-10 text-[var(--muted-foreground)]" />
          <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">
            No stock records found
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search query or status filter.'
              : 'Add products or record opening stock to begin tracking inventory.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden md:block rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Branch</th>
                    <th className="px-4 py-3.5 text-right">Selling Price</th>
                    <th className="px-4 py-3.5 text-right">Cost Price</th>
                    <th className="px-4 py-3.5 text-center">Stock On Hand</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredItems.map((item) => {
                    const rowKey = `${item.branchId}:${item.productId}`;
                    return (
                      <tr key={rowKey} className="hover:bg-[var(--muted)]/30 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-[var(--foreground)]">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--muted-foreground)] capitalize">
                          {item.category}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--foreground)]">
                          {item.branchName}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[var(--foreground)]">
                          {formatMoney(item.sellingPriceCentavos)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[var(--muted-foreground)]">
                          {formatMoney(item.costPriceCentavos)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-base tabular-nums">
                          <span
                            className={
                              item.isNegativeStock
                                ? 'text-[var(--destructive)]'
                                : item.isLowStock
                                ? 'text-[var(--warning)]'
                                : item.isOutOfStock
                                ? 'text-[var(--muted-foreground)]'
                                : 'text-[var(--foreground)]'
                            }
                          >
                            {item.stockOnHand}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {item.isNegativeStock ? (
                            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--destructive)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--destructive)]">
                              <ShieldAlert className="h-3 w-3" />
                              Negative
                            </span>
                          ) : item.isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                              Out of Stock
                            </span>
                          ) : item.isLowStock ? (
                            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--warning)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--warning)]">
                              <AlertTriangle className="h-3 w-3" />
                              Low (&le;{item.lowStockThreshold})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--success)]/10 px-2 py-0.5 text-xs font-medium text-[var(--success)]">
                              <CheckCircle2 className="h-3 w-3" />
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openRestock(item)}
                              className="rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer"
                              title="Restock this item"
                            >
                              Restock
                            </button>
                            <span className="text-[var(--border)]">|</span>
                            <button
                              type="button"
                              onClick={() => openAdjust(item)}
                              className="rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                              title="Adjust stock"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Card View (360px+) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredItems.map((item) => {
              const cardKey = `${item.branchId}:${item.productId}`;
              return (
                <div
                  key={cardKey}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-[var(--foreground)] leading-snug">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.branchName} • <span className="capitalize">{item.category}</span>
                      </p>
                    </div>

                    {item.isNegativeStock ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--destructive)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--destructive)]">
                        <ShieldAlert className="h-3 w-3" />
                        Negative
                      </span>
                    ) : item.isOutOfStock ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                        Out of stock
                      </span>
                    ) : item.isLowStock ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--warning)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--warning)]">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--success)]/10 px-2 py-0.5 text-xs font-medium text-[var(--success)]">
                        Healthy
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-y border-[var(--border)]/60 py-2.5 text-xs">
                    <div>
                      <span className="text-[var(--muted-foreground)] block">Stock</span>
                      <span
                        className={`text-lg font-bold font-mono tabular-nums ${
                          item.isNegativeStock
                            ? 'text-[var(--destructive)]'
                            : item.isLowStock
                            ? 'text-[var(--warning)]'
                            : item.isOutOfStock
                            ? 'text-[var(--muted-foreground)]'
                            : 'text-[var(--foreground)]'
                        }`}
                      >
                        {item.stockOnHand}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)] block">Price</span>
                      <span className="font-mono font-medium text-[var(--foreground)]">
                        {formatMoney(item.sellingPriceCentavos)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)] block">Cost</span>
                      <span className="font-mono text-[var(--muted-foreground)]">
                        {formatMoney(item.costPriceCentavos)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openAdjust(item)}
                      className="h-11 text-xs font-medium"
                    >
                      <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                      Adjust
                    </Button>
                    <Button
                      type="button"
                      onClick={() => openRestock(item)}
                      className="h-11 text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)]"
                    >
                      <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
                      Restock
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modals */}
      <RestockModal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        branches={branches}
        products={productsForModals}
        defaultBranchId={activeItem ? activeItem.branchId : branchFilter !== 'all' ? branchFilter : undefined}
        defaultProductId={activeItem ? activeItem.productId : undefined}
        onSuccess={() => router.refresh()}
      />

      <AdjustmentModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        branches={branches}
        products={productsForModals}
        defaultBranchId={activeItem ? activeItem.branchId : branchFilter !== 'all' ? branchFilter : undefined}
        defaultProductId={activeItem ? activeItem.productId : undefined}
        currentStockOnHand={activeItem ? activeItem.stockOnHand : undefined}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
