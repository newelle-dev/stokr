export default function SalesLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading sales">
      <div className="h-32 animate-pulse rounded-[var(--radius-xl)] bg-[var(--muted)]" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--muted)]" />
      ))}
    </div>
  );
}
