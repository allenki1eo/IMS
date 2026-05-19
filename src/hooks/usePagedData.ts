import useSWR from "swr";

interface PagedResponse<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

/**
 * Fetches a paginated API endpoint with SWR caching.
 * Returns cached data instantly on revisit, refreshes in background.
 */
export function usePagedData<T>(url: string | null) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<PagedResponse<T>>(url);

  return {
    data: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    loading: isLoading,
    validating: isValidating,
    error,
    mutate,
  };
}
