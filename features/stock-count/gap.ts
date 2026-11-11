export type CountLineForMissing = {
  branchName: string;
  difference: number; // counted minus expected
  costCentavos: number; // product's current cost per unit
};

export type MissingStockRow = { branchName: string; units: number; costCentavos: number };

/** Missing stock = negative differences only, summed per branch, sorted by branch name. */
export function missingStockByBranch(lines: CountLineForMissing[]): MissingStockRow[] {
  const byBranch = new Map<string, MissingStockRow>();
  for (const l of lines) {
    if (l.difference >= 0) continue;
    const units = -l.difference;
    const row = byBranch.get(l.branchName) ?? { branchName: l.branchName, units: 0, costCentavos: 0 };
    row.units += units;
    row.costCentavos += units * l.costCentavos;
    byBranch.set(l.branchName, row);
  }
  return [...byBranch.values()].sort((a, b) => a.branchName.localeCompare(b.branchName));
}
