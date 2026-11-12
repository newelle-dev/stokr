export default function AuthLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-48 animate-pulse rounded-[var(--radius-lg)] bg-[var(--muted)]" />
      <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-[var(--muted)]" />
    </div>
  );
}
