export default function SellLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading products">
      <div className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--muted)]" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-[var(--radius-lg)] bg-[var(--muted)]" />
      ))}
    </div>
  );
}
