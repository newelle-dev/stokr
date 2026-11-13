import { requireOwnerPage } from '@/lib/auth';
import { PageHeader } from '@/components/shell/page-header';
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
      <PageHeader title="Owner Dashboard" description={`Welcome back, ${user.fullName}.`} />
      <BranchFilter branches={data.branches} selectedBranchId={data.selectedBranchId} />
      <AutoRefresh />
      <DashboardCards data={data} />
    </div>
  );
}
