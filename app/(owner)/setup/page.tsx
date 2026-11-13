import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { requireOwnerPage } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const STEPS = [
  { href: '/branches', title: 'Add your branches', description: 'Name each physical location. Every sale and stock count belongs to one branch.' },
  { href: '/products', title: 'Add your products', description: 'Enter the catalog with categories and prices.' },
  { href: '/stock/opening', title: 'Enter opening stock', description: 'Record how much you have on hand per product and branch.' },
  { href: '/team', title: 'Add your staff', description: 'Create staff accounts so they can sell from their phones.' },
];

export default async function SetupPage() {
  await requireOwnerPage();

  return (
    <div className="space-y-6">
      <PageHeader title="Set up shop" description="Work through these in order. Each step opens its own page." />

      <ol className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-xs">
        {STEPS.map((step, i) => (
          <li key={step.href}>
            <Link href={step.href} className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-[var(--muted)]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--foreground)]">{step.title}</span>
                <span className="block text-xs text-[var(--muted-foreground)]">{step.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
