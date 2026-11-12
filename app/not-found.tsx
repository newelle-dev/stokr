import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 p-4">
      <p className="text-base font-medium text-[var(--foreground)]">Page not found.</p>
      <p className="text-sm text-[var(--muted-foreground)]">The link may be out of date.</p>
      <Link
        href="/"
        className="inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary)] px-4 text-base text-[var(--primary-foreground)]"
      >
        Go to Stokr
      </Link>
    </main>
  );
}
