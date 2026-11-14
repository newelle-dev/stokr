export default function ShopLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading shop details">
      <div className="h-16 animate-pulse rounded-[var(--radius-xl)] bg-[var(--muted)]" />
      <div className="h-32 animate-pulse rounded-[var(--radius-xl)] bg-[var(--muted)]" />
    </div>
  );
}
