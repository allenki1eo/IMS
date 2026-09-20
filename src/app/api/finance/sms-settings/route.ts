import { NextRequest } from "next/server";
import { requirePermission, getCompanyId, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import {
  FINANCE_SMS_ALERT,
  GLOBAL_SCOPE,
  getFinanceSmsSettings,
  updateFinanceSmsSetting,
} from "@/modules/finance/finance-sms.service";
import { z } from "zod";

const recipientSchema = z.object({
  phone: z.string().min(7).max(32),
  label: z.string().max(64).optional().nullable(),
  isActive: z.boolean().optional(),
});

const putSchema = z.object({
  deposit: z
    .object({
      enabled: z.boolean().optional(),
      recipients: z.array(recipientSchema).max(20).optional(),
    })
    .optional(),
  eod: z
    .object({
      enabled: z.boolean().optional(),
      skipIfZero: z.boolean().optional(),
      recipients: z.array(recipientSchema).max(20).optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "settings:settings:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const settings = await getFinanceSmsSettings(companyId);
    return success(settings);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, "settings:settings:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? "Invalid payload");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    if (parsed.data.deposit) {
      await updateFinanceSmsSetting({
        scopeKey: companyId,
        alertType: FINANCE_SMS_ALERT.DEPOSIT,
        enabled: parsed.data.deposit.enabled,
        recipients: parsed.data.deposit.recipients,
        updatedById: auth.user.id,
        userName: auth.user.fullName || auth.user.username,
        companyId,
        ipAddress,
        userAgent,
      });
    }

    if (parsed.data.eod) {
      await updateFinanceSmsSetting({
        scopeKey: GLOBAL_SCOPE,
        alertType: FINANCE_SMS_ALERT.EOD_SPEND,
        enabled: parsed.data.eod.enabled,
        skipIfZero: parsed.data.eod.skipIfZero,
        recipients: parsed.data.eod.recipients,
        updatedById: auth.user.id,
        userName: auth.user.fullName || auth.user.username,
        companyId,
        ipAddress,
        userAgent,
      });
    }

    const settings = await getFinanceSmsSettings(companyId);
    return success(settings);
  } catch (err) {
    return handleError(err);
  }
}
