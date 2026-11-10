export default function MySalesLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading your sales">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--muted)]" />
      ))}
    </div>
  );
}
