import { PageHeader } from '@/components/shell/page-header';

const TOPICS: { question: string; answer: string }[] = [
  {
    question: 'How do I record a sale?',
    answer: 'Open Sell, add the products and quantities, then review and confirm the sale.',
  },
  {
    question: 'How do I fix a wrong sale?',
    answer: 'Sales are never deleted. Void the sale or record a replacement sale from the Sales page.',
  },
  {
    question: 'How do I count stock?',
    answer: 'Open More > Stock count, count each shelf and save the differences.',
  },
  {
    question: 'How do staff sign in?',
    answer: 'Staff use the shop store code from More, plus their username and password.',
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Help" description="Quick answers for the most common tasks." />
      <div className="divide-y divide-[var(--border)] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-xs">
        {TOPICS.map((t) => (
          <div key={t.question} className="space-y-1 px-4 py-3.5">
            <p className="text-sm font-medium text-[var(--foreground)]">{t.question}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{t.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
