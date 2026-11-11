import { describe, expect, it } from 'vitest';
import { missingStockByBranch } from '../gap';

describe('missingStockByBranch', () => {
  it('sums only negative differences, in units and cost', () => {
    const rows = missingStockByBranch([
      { branchName: 'Main', difference: -3, costCentavos: 10000 },
      { branchName: 'Main', difference: -1, costCentavos: 25050 },
      { branchName: 'Main', difference: 4, costCentavos: 99999 }, // extra stock is not missing
      { branchName: 'Main', difference: 0, costCentavos: 500 },
    ]);
    expect(rows).toEqual([{ branchName: 'Main', units: 4, costCentavos: 55050 }]);
  });

  it('groups per branch and drops branches with nothing missing', () => {
    const rows = missingStockByBranch([
      { branchName: 'B', difference: -2, costCentavos: 100 },
      { branchName: 'A', difference: -1, costCentavos: 300 },
      { branchName: 'C', difference: 5, costCentavos: 100 },
    ]);
    expect(rows).toEqual([
      { branchName: 'A', units: 1, costCentavos: 300 },
      { branchName: 'B', units: 2, costCentavos: 200 },
    ]);
  });

  it('returns empty when there are no counts', () => {
    expect(missingStockByBranch([])).toEqual([]);
  });
});
