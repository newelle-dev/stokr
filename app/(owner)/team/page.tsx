import { Metadata } from 'next';
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

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
        <StaffList
          staffMembers={staffMembers}
          storeCode={storeCode}
          branches={branches}
        />
      </div>
    </div>
  );
}
