import { NextRequest } from "next/server";
import {
  verifyTallyApiKey,
  upsertVouchers,
  upsertLedgers,
  createSyncLog,
  type TallyVoucherInput,
  type TallyLedgerInput,
} from "@/modules/finance/tally.service";
import { success, unauthorized, badRequest, handleError } from "@/lib/response";

export async function POST(request: NextRequest) {
  // API-key auth (no user session — this endpoint is called by the sync agent)
  const authHeader = request.headers.get("Authorization") ?? "";
  const plainKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!plainKey) return unauthorized("Missing API key");

  const keyRecord = await verifyTallyApiKey(plainKey);
  if (!keyRecord) return unauthorized("Invalid or inactive API key");

  let body: {
    companyId?: string;
    vouchers?: TallyVoucherInput[];
    ledgers?: TallyLedgerInput[];
    triggeredBy?: string;
  };

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const companyId = body.companyId ?? keyRecord.companyId;

  // Ensure the key belongs to the claimed company
  if (companyId !== keyRecord.companyId) {
    return unauthorized("API key does not belong to this company");
  }

  try {
    const vouchersIn = body.vouchers?.length
      ? await upsertVouchers(companyId, body.vouchers)
      : 0;

    const ledgersIn = body.ledgers?.length
      ? await upsertLedgers(companyId, body.ledgers)
      : 0;

    await createSyncLog(
      companyId,
      "SUCCESS",
      vouchersIn,
      ledgersIn,
      undefined,
      body.triggeredBy ?? "agent"
    );

    return success({ vouchersIn, ledgersIn });
  } catch (err) {
    await createSyncLog(
      companyId,
      "FAILED",
      0,
      0,
      err instanceof Error ? err.message : "Unknown error",
      body.triggeredBy ?? "agent"
    ).catch(() => {});
    return handleError(err);
  }
}
