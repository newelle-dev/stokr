import Link from 'next/link';
import { ChevronRight, Store } from 'lucide-react';
import { requireOwnerPage } from '@/lib/auth';
import { getOwnerBranches } from '@/features/branches/queries';
import { MORE_SECTIONS } from '@/lib/nav';
import { NAV_ICONS } from '@/components/shell/nav-icons';

export const dynamic = 'force-dynamic';

export default async function MorePage() {
  const user = await requireOwnerPage();
  const { shopName, storeCode } = await getOwnerBranches();

  return (
    <div className="space-y-6">
      <h1 className="sr-only">More</h1>

      <Link
        href="/shop"
        className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs active:bg-[var(--muted)]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary)]/10 text-[var(--primary)]">
          <Store className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[var(--foreground)]">{shopName}</p>
          <p className="truncate text-sm text-[var(--muted-foreground)]">{user.email ?? user.fullName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-[var(--muted-foreground)]">Staff store code</p>
          <p className="font-mono text-sm font-bold tracking-wide text-[var(--foreground)]">{storeCode}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
      </Link>

      {MORE_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {section.title}
          </h2>
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-xs">
            {section.items.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-[var(--muted)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--muted)] text-[var(--foreground)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[var(--foreground)]">{item.label}</span>
                      <span className="block truncate text-xs text-[var(--muted-foreground)]">{item.description}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
