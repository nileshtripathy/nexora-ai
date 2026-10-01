export default function AdminLoading() {
  return (
    <div className="space-y-4" aria-busy aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
