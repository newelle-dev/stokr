import { PageHeader } from '@/components/shell/page-header';
import { PageBody } from '@/components/shell/page-body';
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
  const activeCount = branches.filter((b) => b.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description={`${activeCount} active. Your physical branch locations and store points.`}
      />
      <PageBody>
        <BranchList branches={branches} />
      </PageBody>
    </div>
  );
}
