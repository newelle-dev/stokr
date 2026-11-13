import { PageHeader } from '@/components/shell/page-header';

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="About Stokr" description="Sales and inventory for small vape shops." />
      <div className="space-y-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[var(--foreground)] shadow-xs">
        <p>
          Stokr records sales at the counter and shows the owner stock on hand, profit, who sold what and
          what is missing. Stock is always the sum of recorded movements, so nothing is typed over.
        </p>
        <p className="text-[var(--muted-foreground)]">Stokr is built for real two-branch shops.</p>
      </div>
    </div>
  );
}
