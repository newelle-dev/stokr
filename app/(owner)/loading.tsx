export default function OwnerLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-48 animate-pulse rounded-[var(--radius-lg)] bg-[var(--muted)]" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--muted)]" />
      ))}
    </div>
  );
}
