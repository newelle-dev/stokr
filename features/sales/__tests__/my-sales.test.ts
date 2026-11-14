import { describe, expect, it } from 'vitest';
import { dayLabel, groupSalesByDay } from '../my-sales';
import type { MySale } from '../queries';

function sale(over: Partial<MySale> & { id: string; createdAt: string }): MySale {
  return {
    branchId: 'b',
    paymentMethod: 'cash',
    totalCentavos: 10000,
    status: 'completed',
    items: [],
    ...over,
  };
}

describe('groupSalesByDay', () => {
  it('splits days at midnight in Asia/Manila, not UTC', () => {
    // 15:59 UTC on Nov 13 is 23:59 in Manila (still Nov 13); 16:01 UTC is 00:01 on Nov 14.
    const days = groupSalesByDay([
      sale({ id: 'a', createdAt: '2026-11-13T16:01:00Z' }),
      sale({ id: 'b', createdAt: '2026-11-13T15:59:00Z' }),
    ]);
    expect(days.map((d) => d.dateKey)).toEqual(['2026-11-14', '2026-11-13']);
    expect(days[0].sales.map((s) => s.id)).toEqual(['a']);
    expect(days[1].sales.map((s) => s.id)).toEqual(['b']);
  });

  it('keeps the input order inside a day', () => {
    const days = groupSalesByDay([
      sale({ id: 'late', createdAt: '2026-11-14T08:00:00Z' }),
      sale({ id: 'early', createdAt: '2026-11-14T02:00:00Z' }),
    ]);
    expect(days).toHaveLength(1);
    expect(days[0].sales.map((s) => s.id)).toEqual(['late', 'early']);
  });

  it('adds only completed sales to the totals and splits cash from GCash', () => {
    const [day] = groupSalesByDay([
      sale({ id: '1', createdAt: '2026-11-14T02:00:00Z', totalCentavos: 25000, paymentMethod: 'cash' }),
      sale({ id: '2', createdAt: '2026-11-14T03:00:00Z', totalCentavos: 35000, paymentMethod: 'gcash' }),
      sale({ id: '3', createdAt: '2026-11-14T04:00:00Z', totalCentavos: 99900, paymentMethod: 'cash', status: 'voided' }),
    ]);
    expect(day.sales).toHaveLength(3);
    expect(day.completedCount).toBe(2);
    expect(day.completedTotalCentavos).toBe(60000);
    expect(day.cashCentavos).toBe(25000);
    expect(day.gcashCentavos).toBe(35000);
  });

  it('returns no days for no sales', () => {
    expect(groupSalesByDay([])).toEqual([]);
  });

  it('a day with only voided sales has zero totals', () => {
    const [day] = groupSalesByDay([sale({ id: 'v', createdAt: '2026-11-14T02:00:00Z', status: 'voided' })]);
    expect(day.completedCount).toBe(0);
    expect(day.completedTotalCentavos).toBe(0);
  });
});

describe('dayLabel', () => {
  const now = new Date('2026-11-14T06:00:00Z'); // 14:00 on Nov 14 in Manila

  it('says Today and Yesterday', () => {
    expect(dayLabel('2026-11-14', now)).toBe('Today');
    expect(dayLabel('2026-11-13', now)).toBe('Yesterday');
  });

  it('uses a short date for older days', () => {
    expect(dayLabel('2026-11-10', now)).toBe('Nov 10, 2026');
  });
});
