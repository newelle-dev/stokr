const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request

/** Reads every row by paging; a failed page throws so the dashboard never shows partial numbers. */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error || !data) throw new Error('Failed to load the dashboard.');
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}
