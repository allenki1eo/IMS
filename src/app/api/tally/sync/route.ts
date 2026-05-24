import { NextRequest } from "next/server";
import {
  verifyTallyApiKey,
  upsertVouchers,
  upsertLedgers,
  upsertWarehouses,
  upsertUnits,
  upsertCategories,
  upsertStockItems,
  createSyncLog,
  type TallyVoucherInput,
  type TallyLedgerInput,
  type TallyWarehouseInput,
  type TallyUnitInput,
  type TallyCategoryInput,
  type TallyStockItemInput,
} from "@/modules/finance/tally.service";
import { success, unauthorized, badRequest, handleError } from "@/lib/response";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const plainKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!plainKey) return unauthorized("Missing API key");

  const keyRecord = await verifyTallyApiKey(plainKey);
  if (!keyRecord) return unauthorized("Invalid or inactive API key");

  let body: {
    companyId?: string;
    vouchers?: TallyVoucherInput[];
    ledgers?: TallyLedgerInput[];
    warehouses?: TallyWarehouseInput[];
    units?: TallyUnitInput[];
    categories?: TallyCategoryInput[];
    stockItems?: TallyStockItemInput[];
    triggeredBy?: string;
  };

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const companyId = body.companyId ?? keyRecord.companyId;

  if (companyId !== keyRecord.companyId) {
    return unauthorized("API key does not belong to this company");
  }

  try {
    // Master data must be upserted in dependency order:
    // units and warehouses first (no deps), then categories, then items
    const warehousesIn = body.warehouses?.length
      ? await upsertWarehouses(companyId, body.warehouses)
      : 0;

    const unitsIn = body.units?.length
      ? await upsertUnits(companyId, body.units)
      : 0;

    const categoriesIn = body.categories?.length
      ? await upsertCategories(companyId, body.categories)
      : 0;

    const stockItemsIn = body.stockItems?.length
      ? await upsertStockItems(companyId, body.stockItems)
      : 0;

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

    return success({ vouchersIn, ledgersIn, warehousesIn, unitsIn, categoriesIn, stockItemsIn });
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
