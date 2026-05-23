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

    const invalidDatabaseUrl =
      /error validating datasource/i.test(msg) &&
      /url must start with the protocol `postgresql:\/\/` or `postgres:\/\/`/i.test(msg);
    if (invalidDatabaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "DATABASE_URL is not a valid Supabase Postgres URL. Set it to the Supabase Transaction Pooler URL starting with postgresql://, and set DIRECT_URL to the direct db.<project-ref>.supabase.co:5432 URL.",
          code: "DATABASE_URL_INVALID",
        },
        { status: 500 }
      );
    }

    // Business logic errors — surface directly
    const isDbError = /prisma|postgres|sqlite|libsql|econnrefused|enotfound|can't reach database|socket hang/i.test(msg);
    if (!isDbError && msg.length < 300) {
      return NextResponse.json({ success: false, error: msg, code: "BAD_REQUEST" }, { status: 400 });
    }

    // DB schema errors — give a meaningful hint instead of the generic message
    const noTable = msg.match(/no such table[:\s]+(?:main\.)?(\w+)/i);
    if (noTable) {
      return NextResponse.json(
        { success: false, error: `Database table "${noTable[1]}" is missing. Run the Supabase schema migration.`, code: "SERVER_ERROR" },
        { status: 500 }
      );
    }

    const noColumn = msg.match(/table \w+ has no column named (\w+)/i) ||
                     msg.match(/no such column[:\s]+(\w+)/i);
    if (noColumn) {
      return NextResponse.json(
        { success: false, error: `Database column "${noColumn[1]}" is missing. Run the Supabase schema migration.`, code: "SERVER_ERROR" },
        { status: 500 }
      );
    }

    const supabaseDirectConnection =
      /can't reach database server|connect timed out|connection timed out|econnrefused|enotfound|p1001/i.test(msg) &&
      /db\.[\w-]+\.supabase\.co:5432/i.test(msg);
    if (supabaseDirectConnection) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot reach Supabase through the direct database URL. Set DATABASE_URL to the Supabase Transaction Pooler URL in production and keep the direct db.supabase.co URL as DIRECT_URL for migrations.",
          code: "DATABASE_CONNECTION_ERROR",
        },
        { status: 500 }
      );
    }

    const uniqueViolation = /unique constraint failed|unique/i.test(msg);
    if (uniqueViolation) {
      return NextResponse.json(
        { success: false, error: "A record with these details already exists.", code: "CONFLICT" },
        { status: 409 }
      );
    }

    // Surface the actual DB error message (truncated) so operators can diagnose it
    const safeMsg = msg.replace(/authToken[=:]\S+/gi, "[REDACTED]").slice(0, 300);
    return NextResponse.json(
      { success: false, error: safeMsg, code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
  return NextResponse.json(
    { success: false, error: "An unexpected error occurred", code: "SERVER_ERROR" },
    { status: 500 }
  );
}
