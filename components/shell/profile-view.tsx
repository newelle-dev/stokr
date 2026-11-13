import { SignOutButton } from '@/components/shared/sign-out-button';
import { PageHeader } from '@/components/shell/page-header';
import type { UserSessionProfile } from '@/lib/auth';

export function ProfileView({ user }: { user: UserSessionProfile }) {
  const rows: [string, string | null][] = [
    ['Name', user.fullName],
    ['Role', user.role === 'owner' ? 'Owner' : 'Staff'],
    [user.email ? 'Email' : 'Username', user.email ?? user.username],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" />
      <div className="divide-y divide-[var(--border)] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3.5">
            <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
            <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">{value ?? '-'}</span>
          </div>
        ))}
      </div>
      <SignOutButton className="min-h-11 w-full" />
    </div>
  );
}
