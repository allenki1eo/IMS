/**
 * SwalaSMS client (https://swalasms.com).
 * Credentials via env only — never commit tokens.
 *
 * API: POST https://swalasms.com/api/v1/sms/messages
 * Auth: Authorization: Bearer <SWALA_SMS_API_KEY>
 * Optional: Idempotency-Key header
 */

export type SwalaSendResult =
  | { ok: true; providerMsgId: string | null; raw: unknown }
  | { ok: false; error: string; status?: number; raw?: unknown };

const DEFAULT_BASE = "https://swalasms.com/api/v1";

export function getSwalaConfig() {
  const apiKey = process.env.SWALA_SMS_API_KEY?.trim() || "";
  const senderId = process.env.SWALA_SMS_SENDER_ID?.trim() || "";
  const baseUrl = (process.env.SWALA_SMS_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, "");
  return { apiKey, senderId, baseUrl, configured: Boolean(apiKey && senderId) };
}

/** Normalize TZ phones to E.164 (+255...). */
export function normalizePhoneE164(phone: string): string | null {
  const raw = phone.trim().replace(/[\s\-()]/g, "");
  if (!raw) return null;
  let digits = raw.startsWith("+") ? raw.slice(1) : raw;
  digits = digits.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `255${digits.slice(1)}`;
  } else if (digits.length === 9 && digits.startsWith("7")) {
    digits = `255${digits}`;
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `+${digits}`;
}

export async function sendSwalaSms(params: {
  to: string;
  body: string;
  idempotencyKey?: string;
}): Promise<SwalaSendResult> {
  const { apiKey, senderId, baseUrl, configured } = getSwalaConfig();
  if (!configured) {
    return { ok: false, error: "Swala SMS not configured (SWALA_SMS_API_KEY / SWALA_SMS_SENDER_ID)" };
  }

  const recipient = normalizePhoneE164(params.to);
  if (!recipient) {
    return { ok: false, error: `Invalid phone number: ${params.to}` };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (params.idempotencyKey) {
    headers["Idempotency-Key"] = params.idempotencyKey.slice(0, 128);
  }

  try {
    const res = await fetch(`${baseUrl}/sms/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        recipient,
        sender_id: senderId,
        body: params.body.slice(0, 1600),
      }),
    });

    let raw: unknown = null;
    const text = await res.text();
    try {
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = { text };
    }

    if (!res.ok) {
      let msg = `Swala HTTP ${res.status}`;
      if (raw && typeof raw === "object" && "message" in raw) {
        const m = (raw as { message: unknown }).message;
        if (m != null && String(m).trim()) msg = String(m);
      }
      return { ok: false, error: msg, status: res.status, raw };
    }

    const providerMsgId = extractProviderMsgId(raw);
    return { ok: true, providerMsgId, raw };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Swala request failed" };
  }
}

function extractProviderMsgId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const data = obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj;
  for (const key of ["uid", "message_uid", "id", "messageId", "message_id"]) {
    const v = data[key] ?? obj[key];
    if (typeof v === "string" && v) return v;
  }
  if (Array.isArray(data.messages) && data.messages[0] && typeof data.messages[0] === "object") {
    const first = data.messages[0] as Record<string, unknown>;
    for (const key of ["uid", "id", "message_uid"]) {
      if (typeof first[key] === "string") return first[key] as string;
    }
  }
  return null;
}
