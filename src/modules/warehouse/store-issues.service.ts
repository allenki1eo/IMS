import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export const ISSUE_TYPES = [
  { value: "ISSUE_TO_PRODUCTION", label: "Issue to Production", direction: -1 },
  { value: "RETURN_FROM_PRODUCTION", label: "Return from Production", direction: 1 },
  { value: "RETURN_TO_SUPPLIER", label: "Return to Supplier", direction: -1 },
  { value: "OTHER_ADDITION", label: "Other Addition", direction: 1 },
  { value: "OTHER_DEDUCTION", label: "Other Deduction", direction: -1 },
] as const;

export function issueDirection(issueType: string): 1 | -1 {
  const t = ISSUE_TYPES.find((x) => x.value === issueType);
  return (t?.direction ?? -1) as 1 | -1;
}

function genRef(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function listStoreIssues(params: {
  companyId: string;
  page: number;
  pageSize: number;
  issueType?: string;
  warehouseId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const { companyId, page, pageSize, issueType, warehouseId, dateFrom, dateTo } = params;
  const skip = (page - 1) * pageSize;
  const where = {
    companyId,
    ...(issueType ? { issueType } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(dateFrom || dateTo
      ? { issueDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
      : {}),
  };
  const [issues, total] = await Promise.all([
    db.storeIssue.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { issueDate: "desc" },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        lines: { include: { item: { select: { id: true, name: true, code: true } } } },
      },
    }),
    db.storeIssue.count({ where }),
  ]);
  return { issues, total };
}

export async function getStoreIssueById(id: string) {
  return db.storeIssue.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, name: true, code: true } },
      lines: {
        include: {
          item: {
            select: { id: true, name: true, code: true, uom: { select: { symbol: true } } },
          },
        },
      },
    },
  });
}

/**
 * Creates a store issue and applies it to stock immediately (atomic).
 * Stock-decreasing types validate available balance first.
 */
export async function createStoreIssue(params: {
  companyId: string;
  warehouseId: string;
  issueType: string;
  issueDate: Date;
  destination?: string;
  notes?: string;
  lines: Array<{ itemId: string; quantity: number; notes?: string }>;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { companyId, warehouseId, issueType, issueDate, destination, notes, lines, createdById, userName, ipAddress, userAgent } = params;

  if (!ISSUE_TYPES.some((t) => t.value === issueType)) {
    throw new Error(`Invalid issue type: ${issueType}`);
  }
  if (lines.length === 0) throw new Error("At least one line is required");
  for (const line of lines) {
    if (!(line.quantity > 0)) throw new Error("Line quantities must be greater than zero");
  }

  const direction = issueDirection(issueType);
  const reference = genRef("SI");

  const issue = await db.$transaction(async (tx) => {
    const created = await tx.storeIssue.create({
      data: {
        companyId,
        warehouseId,
        reference,
        issueType,
        issueDate,
        destination: destination ?? null,
        notes: notes ?? null,
        createdById,
        lines: {
          create: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, notes: l.notes ?? null })),
        },
      },
      include: { lines: true },
    });

    for (const line of lines) {
      const balance = await tx.stockBalance.findFirst({
        where: { itemId: line.itemId, warehouseId, locationId: null },
      });
      const current = balance?.quantity ?? 0;
      const newQty = current + direction * line.quantity;

      if (direction < 0 && newQty < 0) {
        const item = await tx.item.findUnique({ where: { id: line.itemId }, select: { name: true } });
        throw new Error(`Insufficient stock for ${item?.name ?? line.itemId}: have ${current}, need ${line.quantity}`);
      }

      if (balance) {
        await tx.stockBalance.update({ where: { id: balance.id }, data: { quantity: newQty } });
      } else {
        await tx.stockBalance.create({
          data: { itemId: line.itemId, warehouseId, locationId: null, quantity: newQty },
        });
      }

      await tx.stockLedger.create({
        data: {
          companyId,
          itemId: line.itemId,
          warehouseId,
          transactionType: issueType,
          quantity: direction * line.quantity,
          balanceAfter: newQty,
          referenceType: "STORE_ISSUE",
          referenceId: created.id,
          notes: destination ?? null,
          createdById,
          createdAt: issueDate,
        },
      });
    }

    return created;
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "STORE_ISSUE_CREATE",
    module: "warehouse",
    resource: "issue",
    recordId: issue.id,
    newValue: { reference, issueType, warehouseId, lineCount: lines.length },
    description: `Created store issue ${reference} (${issueType})`,
    ipAddress,
    userAgent,
    companyId,
  });

  return issue;
}
