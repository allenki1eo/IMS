export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10))
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildMeta(total: number, params: PaginationParams) {
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
  };
}
