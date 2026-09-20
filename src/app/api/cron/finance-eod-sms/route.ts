import { NextRequest } from "next/server";
import { success, unauthorized, badRequest, handleError } from "@/lib/response";
import { todayCalendarDate } from "@/lib/timezone";
import {
  isWithinEodWindow,
  runEodSpendSms,
} from "@/modules/finance/finance-sms.service";

/**
 * EOD spend SMS cron — one combined all-companies rollup.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> or ?secret=
 * Schedule: vercel.json cron ~18:00 UTC (= 21:00 EAT) plus optional mid-window run.
 * Window gate: FINANCE_EOD_SMS_HOUR_START/END (EAT, default 18–20) unless ?force=1.
 *
 * Query: date=YYYY-MM-DD (optional), force=1 (bypass window + skipIfZero / disabled for ops).
 */
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return badRequest("CRON_SECRET is not configured");
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret") ?? "";
  if (bearer !== secret && querySecret !== secret) {
    return unauthorized("Invalid cron secret");
  }

  const force = searchParams.get("force") === "1" || searchParams.get("force") === "true";
  const calendarDate = searchParams.get("date") ?? undefined;

  if (!force && !isWithinEodWindow()) {
    return success({
      skipped: true,
      reason: "Outside EOD SMS hour window (EAT)",
      calendarDate: calendarDate ?? todayCalendarDate(),
    });
  }

  try {
    const result = await runEodSpendSms({ calendarDate, force });
    return success(result);
  } catch (err) {
    return handleError(err);
  }
}
