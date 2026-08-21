export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="h-80 animate-pulse rounded-xl border bg-muted" />
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-xl border bg-muted" />
          <div className="h-32 animate-pulse rounded-xl border bg-muted" />
        </div>
      </div>
    </div>
  );
}
