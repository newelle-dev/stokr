import { Metadata } from 'next';
import { PageHeader } from '@/components/shell/page-header';
import { PageBody } from '@/components/shell/page-body';
import { requireOwnerPage } from '@/lib/auth';
import { getTeamMembers } from '@/features/team/queries';
import { StaffList } from '@/features/team/components/staff-list';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Team & Staff Accounts | Stokr',
  description: 'Manage staff accounts, credentials, and branch assignments',
};

export default async function TeamPage() {
  await requireOwnerPage();
  const { staffMembers, storeCode, branches } = await getTeamMembers();
  const activeCount = staffMembers.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & staff"
        description={`${activeCount} active. Manage who can log in to record sales at your branches.`}
      />
      <PageBody>
        <StaffList
          staffMembers={staffMembers}
          storeCode={storeCode}
          branches={branches}
        />
      </PageBody>
    </div>
  );
}
