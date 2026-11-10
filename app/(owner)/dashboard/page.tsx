import { requireOwnerPage } from '@/lib/auth';
import { getOwnerDashboard } from '@/features/dashboard/queries';
import { BranchFilter } from '@/features/dashboard/components/branch-filter';
import { AutoRefresh } from '@/features/dashboard/components/auto-refresh';
import { DashboardCards } from '@/features/dashboard/components/dashboard-cards';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard | Stokr',
  description: 'Owner management dashboard for Stokr.',
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  // Invariant: Mandatory page-level owner guard
  const user = await requireOwnerPage();
  const { branch } = await searchParams;
  const data = await getOwnerDashboard({ branchId: branch || undefined });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">Owner Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Welcome back, {user.fullName}.</p>
      </div>
      <BranchFilter branches={data.branches} selectedBranchId={data.selectedBranchId} />
      <AutoRefresh />
      <DashboardCards data={data} />
    </div>
  );
}
