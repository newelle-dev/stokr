'use client';

import { useRouter } from 'next/navigation';

export function BranchFilter({
  branches,
  selectedBranchId,
}: {
  branches: { id: string; name: string }[];
  selectedBranchId: string | null;
}) {
  const router = useRouter();
  return (
    <label className="block space-y-1 text-sm font-medium text-[var(--foreground)]">
      Branch
      <select
        value={selectedBranchId ?? ''}
        onChange={(e) => router.push(e.target.value ? `/dashboard?branch=${e.target.value}` : '/dashboard')}
        className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      >
        <option value="">All branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
