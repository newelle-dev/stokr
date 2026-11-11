import { describe, expect, it } from 'vitest';
import { getManilaRangeBetween } from '@/lib/dates';
import { dashboardFilterSchema } from '../schemas';

describe('dashboardFilterSchema', () => {
  it('accepts no filter and a guid branch id, rejects a non-guid', () => {
    expect(dashboardFilterSchema.parse({})).toEqual({});
    const id = '00000000-0000-0000-0000-000000000010';
    expect(dashboardFilterSchema.parse({ branchId: id })).toEqual({ branchId: id });
    expect(() => dashboardFilterSchema.parse({ branchId: 'abc' })).toThrow();
  });
});

describe('Manila today range', () => {
  it('spans 16:00Z the day before to 15:59:59.999Z; 23:59 Manila is in, 00:01 next day is out', () => {
    const r = getManilaRangeBetween('2026-11-10', '2026-11-10');
    expect(r.startUtc).toBe('2026-11-09T16:00:00.000Z');
    expect(r.endUtc).toBe('2026-11-10T15:59:59.999Z');
    expect('2026-11-10T15:59:00.000Z' <= r.endUtc).toBe(true);
    expect('2026-11-10T16:01:00.000Z' <= r.endUtc).toBe(false);
  });
});
