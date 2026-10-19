import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-medium text-[var(--muted-foreground)] mb-6">
          <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
          Unit 1: System Foundation
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] mb-2">
          Stokr
        </h1>
        <p className="text-base text-[var(--muted-foreground)] mb-8">
          Phone-first sales and inventory for vape shops.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
