import useSWR from "swr";

interface PagedResponse<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

const LIST_KEYS = [
  "data",
  "sessions",
  "usages",
  "records",
  "analyses",
  "reports",
  "specs",
  "items",
  "users",
  "batches",
  "orders",
] as const;

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of LIST_KEYS) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function asTotal(payload: unknown, fallbackLength: number): number {
  if (!payload || typeof payload !== "object") return fallbackLength;
  const obj = payload as Record<string, unknown>;
  const meta = obj.meta;
  if (meta && typeof meta === "object" && typeof (meta as { total?: unknown }).total === "number") {
    return (meta as { total: number }).total;
  }
  if (typeof obj.total === "number") return obj.total;
  // Nested shape: { data: { sessions, total } }
  const nested = obj.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const n = nested as Record<string, unknown>;
    if (typeof n.total === "number") return n.total;
  }
  return fallbackLength;
}

/**
 * Fetches a paginated API endpoint with SWR caching.
 * Normalizes non-array payloads to [] so DataTable never crashes on `.map`.
 */
export function usePagedData<T>(url: string | null) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<PagedResponse<T> | Record<string, unknown>>(url);

  const rows = asArray<T>(data?.data ?? data);
  const total = asTotal(data, rows.length);

  return {
    data: rows,
    total,
    loading: isLoading,
    validating: isValidating,
    error,
    mutate,
  };
}
