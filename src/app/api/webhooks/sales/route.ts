import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { upsertCustomer, upsertSalesOrder, upsertKPI } from "@/modules/sales/sales.service";
import { db } from "@/lib/db";

const WEBHOOK_SECRET = process.env.SALES_WEBHOOK_SECRET ?? "dev-sales-secret";

function verifySignature(body: string, signature: string): boolean {
  if (process.env.NODE_ENV !== "production") return true; // skip in dev
  const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  return expected === signature;
}

async function getCompanyId(): Promise<string | null> {
  try {
    const company = await db.company.findFirst({ select: { id: true } });
    return company?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Cannot read body" }, { status: 400 });
  }

  const signature = request.headers.get("x-sales-signature") ?? "";
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event: string; data: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Company not configured" }, { status: 500 });
  }

  const { event, data } = payload;
  let status = "OK";
  let errorMsg: string | null = null;

  try {
    switch (event) {
      case "customer.created":
      case "customer.updated":
        await upsertCustomer(companyId, {
          externalId: data.id?.toString(),
          code: (data.code as string) ?? data.id?.toString() ?? "UNKNOWN",
          name: data.name as string,
          email: (data.email as string | null) ?? null,
          phone: (data.phone as string | null) ?? null,
          address: (data.address as string | null) ?? null,
          contactPerson: (data.contactPerson as string | null) ?? (data.contact_person as string | null) ?? null,
          creditLimit: (data.creditLimit as number | null) ?? (data.credit_limit as number | null) ?? null,
          currency: (data.currency as string) ?? "TZS",
          status: (data.status as string) ?? "ACTIVE",
          notes: (data.notes as string | null) ?? null,
        });
        break;

      case "order.created":
      case "order.updated": {
        const customerId = data.customerId ?? data.customer_id;
        // Ensure customer exists
        let customer = await db.customer.findFirst({
          where: { companyId, externalId: customerId?.toString() },
        });
        if (!customer && (data.customer || data.customerName)) {
          const customerData = data.customer as Record<string, unknown> | undefined;
          customer = await upsertCustomer(companyId, {
            externalId: customerId?.toString(),
            code: customerId?.toString() ?? "UNKNOWN",
            name: (customerData?.name as string) ?? (data.customerName as string) ?? "Unknown Customer",
            email: (customerData?.email as string | null) ?? null,
            phone: (customerData?.phone as string | null) ?? null,
          });
        }
        if (!customer) break;

        const linesRaw = (data.lines ?? data.items ?? []) as Record<string, unknown>[];
        await upsertSalesOrder(companyId, {
          externalId: data.id?.toString(),
          reference: (data.reference as string) ?? (data.orderNumber as string) ?? data.id?.toString() ?? "UNKNOWN",
          customerId: customer.id,
          status: (data.status as string) ?? "PENDING",
          priority: (data.priority as string) ?? "NORMAL",
          orderDate: data.orderDate ? new Date(data.orderDate as string) : new Date(),
          requiredDate: data.requiredDate ? new Date(data.requiredDate as string) : null,
          subtotal: (data.subtotal as number) ?? (data.subTotal as number) ?? 0,
          taxAmount: (data.taxAmount as number) ?? (data.tax as number) ?? 0,
          totalAmount: (data.totalAmount as number) ?? (data.total as number) ?? 0,
          currency: (data.currency as string) ?? "TZS",
          notes: (data.notes as string | null) ?? null,
          lines: linesRaw.map((l) => ({
            externalId: l.id?.toString(),
            productCode: (l.productCode as string) ?? (l.product_code as string) ?? (l.sku as string) ?? "UNKNOWN",
            description: (l.description as string) ?? (l.name as string) ?? "",
            quantity: (l.quantity as number) ?? (l.qty as number) ?? 0,
            unitPrice: (l.unitPrice as number) ?? (l.unit_price as number) ?? (l.price as number) ?? 0,
            discount: (l.discount as number) ?? 0,
            totalPrice: (l.totalPrice as number) ?? (l.total as number) ?? (l.lineTotal as number) ?? 0,
          })),
        });
        break;
      }

      case "order.cancelled": {
        const orderId = data.id;
        const orderRef = data.reference;
        if (orderId || orderRef) {
          const orConds: { externalId?: string; reference?: string }[] = [];
          if (orderId) orConds.push({ externalId: orderId.toString() });
          if (orderRef) orConds.push({ reference: orderRef as string });
          const order = await db.salesOrder.findFirst({
            where: { companyId, OR: orConds },
          });
          if (order) {
            await db.salesOrder.update({
              where: { id: order.id },
              data: { status: "CANCELLED", syncedAt: new Date() },
            });
          }
        }
        break;
      }

      case "kpi.updated":
      case "kpi.synced": {
        const kpiList = Array.isArray(data) ? data : [data];
        for (const kpi of kpiList) {
          const k = kpi as Record<string, unknown>;
          await upsertKPI(companyId, {
            period: k.period as string,
            metric: k.metric as string,
            target: (k.target as number) ?? 0,
            achieved: (k.achieved as number) ?? 0,
            currency: (k.currency as string) ?? "TZS",
          });
        }
        break;
      }

      default:
        // Unknown event — log but don't error
        break;
    }
  } catch (err) {
    status = "ERROR";
    errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Sales Webhook Error]", event, err);
  }

  // Log the webhook
  try {
    await db.salesWebhookLog.create({
      data: {
        companyId,
        eventType: event,
        externalId: (payload.data?.id as string | undefined)?.toString() ?? null,
        payload: rawBody.slice(0, 5000),
        status,
        error: errorMsg,
      },
    });
  } catch { /* non-fatal */ }

  if (status === "ERROR") {
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, event });
}
