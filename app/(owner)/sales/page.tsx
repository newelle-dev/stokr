import Link from 'next/link';
import { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/auth';
import { getOwnerSales } from '@/features/sales/queries';
import { ownerSalesFilterSchema, SALE_STATUSES, type OwnerSalesFilter } from '@/features/sales/schemas';
import { OwnerSalesList } from '@/features/sales/components/owner-sales-list';
import { MoneyText } from '@/components/shared/money-text';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sales | Stokr',
  description: 'All sales, with void and replacement',
};

type Params = Record<'from' | 'to' | 'branch' | 'staff' | 'status' | 'page', string | undefined>;

// Bad or empty values fall back to "no filter" instead of breaking the page
function parseFilters(p: Params): OwnerSalesFilter {
  const parsed = ownerSalesFilterSchema.safeParse({
    from: p.from || undefined,
    to: p.to || undefined,
    branchId: p.branch || undefined,
    staffId: p.staff || undefined,
    status: p.status || undefined,
    page: p.page ? Number(p.page) : 1,
  });
  return parsed.success ? parsed.data : {};
}

const selectClass =
  'flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

export default async function SalesPage({ searchParams }: { searchParams: Promise<Partial<Params>> }) {
  await requireOwnerPage();
  const filters = parseFilters((await searchParams) as Params);
  const data = await getOwnerSales(filters);

  const totalPages = Math.max(1, Math.ceil(data.matchingCount / data.pageSize));
  const pageHref = (page: number) => {
    const q = new URLSearchParams({ from: data.from, to: data.to, page: String(page) });
    if (filters.branchId) q.set('branch', filters.branchId);
    if (filters.staffId) q.set('staff', filters.staffId);
    if (filters.status) q.set('status', filters.status);
    return `/sales?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Sales</h1>
        <Link href="/sell" className={`${buttonVariants()} h-11 px-4`}>New sale</Link>
      </div>

      <form method="get" className="grid grid-cols-2 gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-4 md:grid-cols-6">
        <label className="space-y-1 text-sm font-medium">
          From
          <Input type="date" name="from" defaultValue={data.from} className="h-11" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          To
          <Input type="date" name="to" defaultValue={data.to} className="h-11" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Branch
          <select name="branch" defaultValue={filters.branchId ?? ''} className={selectClass}>
            <option value="">All branches</option>
            {data.branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Staff
          <select name="staff" defaultValue={filters.staffId ?? ''} className={selectClass}>
            <option value="">All staff</option>
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Status
          <select name="status" defaultValue={filters.status ?? ''} className={selectClass}>
            <option value="">All</option>
            {SALE_STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'voided' ? 'Voided' : 'Completed'}</option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex items-end gap-2 md:col-span-1">
          <Button type="submit" className="h-11 flex-1">Apply</Button>
          <Link href="/sales" className={`${buttonVariants({ variant: 'outline' })} h-11 px-3`}>Today</Link>
        </div>
      </form>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="text-xs text-[var(--muted-foreground)]">Completed total</p>
          <MoneyText centavos={data.completedTotalCentavos} className="text-lg font-bold" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="text-xs text-[var(--muted-foreground)]">Completed</p>
          <p className="text-lg font-bold tabular-nums">{data.completedCount}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="text-xs text-[var(--muted-foreground)]">Voided</p>
          <p className="text-lg font-bold tabular-nums">{data.voidedCount}</p>
        </div>
      </div>

      <OwnerSalesList sales={data.sales} />

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Pages">
          {data.page > 1 ? (
            <Link href={pageHref(data.page - 1)} className={`${buttonVariants({ variant: 'outline' })} h-11 px-4`}>Previous</Link>
          ) : <span />}
          <span className="text-sm text-[var(--muted-foreground)]">Page {data.page} of {totalPages}</span>
          {data.page < totalPages ? (
            <Link href={pageHref(data.page + 1)} className={`${buttonVariants({ variant: 'outline' })} h-11 px-4`}>Next</Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
