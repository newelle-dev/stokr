import { PageHeader } from '@/components/shell/page-header';
import { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/auth';
import { getOwnerBranches } from '@/features/branches/queries';
import { BranchList } from '@/features/branches/components/branch-list';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Branches | Stokr',
  description: 'Manage branch locations',
};

export default async function BranchesPage() {
  await requireOwnerPage();
  const { branches } = await getOwnerBranches();

  return (
    <div className="space-y-8">
      <PageHeader title="Branches" description="Your physical branch locations." />

      {/* Branches Section */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
        <BranchList branches={branches} />
      </div>
    </div>
  );
}
