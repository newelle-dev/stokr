import { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/auth';
import { getOwnerBranches } from '@/features/branches/queries';
import { BranchList } from '@/features/branches/components/branch-list';
import { StoreCodeCard } from './store-code-card';


export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Settings & Branches | Stokr',
  description: 'Manage shop details and branch locations',
};

export default async function SettingsPage() {
  await requireOwnerPage();
  const { branches, storeCode, shopName } = await getOwnerBranches();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Configure your shop details and physical branch locations.
        </p>
      </div>

      {/* Store Identity Card */}
      <StoreCodeCard shopName={shopName} storeCode={storeCode} />

      {/* Branches Section */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
        <BranchList branches={branches} />
      </div>
    </div>
  );
}
