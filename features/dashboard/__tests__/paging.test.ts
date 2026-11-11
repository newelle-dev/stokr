import { describe, expect, it } from 'vitest';
import { fetchAllRows } from '../paging';
import { resolveBranchId } from '../summary';

describe('fetchAllRows', () => {
  it('keeps reading pages until a short page, so more than 1000 rows are not cut off', async () => {
    const all = Array.from({ length: 2500 }, (_, i) => i);
    const calls: [number, number][] = [];
    const rows = await fetchAllRows<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: all.slice(from, to + 1), error: null };
    });
    expect(rows).toHaveLength(2500);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('throws on a page error instead of returning partial rows', async () => {
    await expect(fetchAllRows<number>(async () => ({ data: null, error: new Error('boom') }))).rejects.toThrow();
  });
});

describe('resolveBranchId', () => {
  const branches = [{ id: 'a', name: 'Annex' }, { id: 'b', name: 'Main' }];
  it('keeps an active branch id', () => expect(resolveBranchId('b', branches)).toBe('b'));
  it('falls back to all branches for an unknown or deactivated id', () => {
    expect(resolveBranchId('zzz', branches)).toBeNull();
  });
  it('treats no id as all branches', () => expect(resolveBranchId(undefined, branches)).toBeNull());
});
