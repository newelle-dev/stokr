export const ADJUSTMENT_REASONS = [
  'Damaged / Expired',
  'Loss / Stolen / Missing',
  'Branch Transfer Out',
  'Branch Transfer In',
  'Owner Personal Use / Promo',
  'Count Correction (Manual)',
  'Other',
] as const;

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

export interface StockOverviewItem {
  productId: string;
  productName: string;
  category: string;
  branchId: string;
  branchName: string;
  stockOnHand: number;
  lowStockThreshold: number;
  sellingPriceCentavos: number;
  costPriceCentavos: number;
  hasOpeningStock: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
  isNegativeStock: boolean;
}

export interface BranchStockStatus {
  branchId: string;
  branchName: string;
  hasOpeningStock: boolean;
  recordedQuantity: number | null;
}

export interface BulkOpeningProductRow {
  productId: string;
  productName: string;
  category: string;
  branches: BranchStockStatus[];
}

export interface StockMovementHistoryItem {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  quantityChange: number;
  reason: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
}
