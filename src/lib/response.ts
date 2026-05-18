import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function success<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function paginated<T>(
  data: T[],
  meta: PaginationMeta
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({ success: true, data, meta });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(
  error: string,
  code = "BAD_REQUEST"
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error, code }, { status: 400 });
}

export function unauthorized(
  error = "Unauthorized"
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error, code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

export function forbidden(
  error = "You do not have permission to perform this action"
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error, code: "FORBIDDEN" },
    { status: 403 }
  );
}

export function notFound(
  error = "Resource not found"
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error, code: "NOT_FOUND" },
    { status: 404 }
  );
}

export function conflict(error: string): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error, code: "CONFLICT" },
    { status: 409 }
  );
}

export function serverError(
  error = "An unexpected error occurred"
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error, code: "SERVER_ERROR" },
    { status: 500 }
  );
}

export function handleError(err: unknown): NextResponse<ApiResponse> {
  if (err instanceof Error) {
    const msg = err.message;
    const isInternal = /prisma|sqlite|libsql|econnrefused|enotfound|socket hang/i.test(msg);
    if (!isInternal && msg.length < 300) {
      return NextResponse.json({ success: false, error: msg, code: "BAD_REQUEST" }, { status: 400 });
    }
  }
  return NextResponse.json(
    { success: false, error: "An unexpected error occurred", code: "SERVER_ERROR" },
    { status: 500 }
  );
}
