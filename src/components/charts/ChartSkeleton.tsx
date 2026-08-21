"use client";

/**
 * Lightweight pulsing placeholder shown while a lazily-loaded Recharts
 * bundle is being fetched. Matches the height of the chart it replaces
 * to avoid layout shift.
 */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-md bg-muted"
      style={{ height }}
      aria-hidden="true"
    />
  );
}
