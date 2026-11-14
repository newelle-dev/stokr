/**
 * Groups a staff member's own sales by Asia/Manila day for the My sales screen. Pure logic, no React,
 * so the day boundaries and totals are unit tested. Only the person's own completed sales add to the totals.
 */
import { getManilaDateString, formatManilaDateTime } from '@/lib/dates';
import type { MySale } from './queries';

export type DaySummary = {
  /** YYYY-MM-DD in Asia/Manila */
  dateKey: string;
  /** Newest first, same order as the input */
  sales: MySale[];
  completedCount: number;
  completedTotalCentavos: number;
  cashCentavos: number;
  gcashCentavos: number;
};

export function isVoidedSale(sale: Pick<MySale, 'status'>): boolean {
  return sale.status === 'voided';
}

export function groupSalesByDay(sales: MySale[]): DaySummary[] {
  const days = new Map<string, DaySummary>();

  for (const sale of sales) {
    const dateKey = getManilaDateString(new Date(sale.createdAt));
    let day = days.get(dateKey);
    if (!day) {
      day = { dateKey, sales: [], completedCount: 0, completedTotalCentavos: 0, cashCentavos: 0, gcashCentavos: 0 };
      days.set(dateKey, day);
    }
    day.sales.push(sale);

    if (isVoidedSale(sale)) continue;
    day.completedCount += 1;
    day.completedTotalCentavos += sale.totalCentavos;
    if (sale.paymentMethod === 'cash') day.cashCentavos += sale.totalCentavos;
    if (sale.paymentMethod === 'gcash') day.gcashCentavos += sale.totalCentavos;
  }

  return Array.from(days.values());
}

/** "Today", "Yesterday", otherwise a short date. Manila is fixed at UTC+8, so 24 hours back is the previous day. */
export function dayLabel(dateKey: string, now: Date = new Date()): string {
  if (dateKey === getManilaDateString(now)) return 'Today';
  if (dateKey === getManilaDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return 'Yesterday';
  return formatManilaDateTime(`${dateKey}T12:00:00+08:00`, 'date');
}
