export default function DashboardLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading dashboard">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-[var(--radius-xl)] bg-[var(--muted)]" />
      ))}
    </div>
  );
}
