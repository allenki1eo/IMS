import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getRequestMeta } from "@/lib/api-helpers";
import { badRequest, handleError } from "@/lib/response";
import { DataCenterError } from "@/modules/data-center/data-center.service";
import type { AuthUser } from "@/types/auth";

export function actorFrom(request: NextRequest, user: AuthUser) {
  return { id: user.id, name: user.fullName, ipAddress: getRequestMeta(request).ipAddress };
}

/** User-correctable errors → 400 with the message; everything else → handleError. */
export function dataCenterError(err: unknown) {
  if (err instanceof DataCenterError) return badRequest(err.message);
  if (err instanceof ZodError) return badRequest(err.errors[0]?.message ?? "Invalid input");
  console.error("[API Error]", err);
  return handleError(err);
}

export function parseYear(value: string | null) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : new Date().getFullYear();
}
