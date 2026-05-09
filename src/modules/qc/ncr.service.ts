import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(prefix: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listNCRs(
  companyId: string,
  params: {
    testId?: string;
    severity?: string;
    status?: string;
    page: number;
    pageSize: number;
  }
) {
  const { testId, severity, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(testId ? { testId } : {}),
    ...(severity ? { severity } : {}),
    ...(status ? { status } : {}),
  };

  const [ncrs, total] = await Promise.all([
    db.nonConformance.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        test: {
          select: { id: true, reference: true, testType: true, result: true },
        },
      },
    }),
    db.nonConformance.count({ where }),
  ]);

  return { data: ncrs, meta: { total, page, pageSize } };
}

export async function getNCR(companyId: string, id: string) {
  const ncr = await db.nonConformance.findUnique({
    where: { id },
    include: {
      test: {
        select: {
          id: true,
          reference: true,
          testType: true,
          result: true,
          status: true,
          batchNumber: true,
        },
      },
    },
  });

  if (!ncr) return null;
  if (ncr.companyId !== companyId) return null;
  return ncr;
}

export async function createNCR(
  companyId: string,
  data: {
    testId?: string | null;
    title: string;
    description: string;
    severity: string;
    assignedToId?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  if (data.testId) {
    const test = await db.qualityTest.findUnique({ where: { id: data.testId } });
    if (!test) throw new Error("Quality test not found");
    if (test.companyId !== companyId) throw new Error("Quality test not found");
  }

  const reference = generateRef("NCR");

  const ncr = await db.nonConformance.create({
    data: {
      companyId,
      reference,
      testId: data.testId ?? null,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: "OPEN",
      reportedById: userId,
      assignedToId: data.assignedToId ?? null,
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "NCR_CREATE",
    module: "qc",
    resource: "ncr",
    recordId: ncr.id,
    newValue: {
      reference,
      title: data.title,
      severity: data.severity,
      testId: data.testId,
    },
    description: `Created non-conformance report: ${reference} - ${data.title}`,
    ipAddress,
    companyId,
  });

  return ncr;
}

export async function updateNCR(
  companyId: string,
  id: string,
  data: {
    title?: string;
    description?: string;
    severity?: string;
    disposition?: string | null;
    rootCause?: string | null;
    correctiveAction?: string | null;
    assignedToId?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.nonConformance.findUnique({ where: { id } });
  if (!existing) throw new Error("Non-conformance report not found");
  if (existing.companyId !== companyId) throw new Error("Non-conformance report not found");
  if (existing.status !== "OPEN" && existing.status !== "IN_REVIEW") {
    throw new Error("Only OPEN or IN_REVIEW NCRs can be updated");
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.severity !== undefined) updateData.severity = data.severity;
  if (data.disposition !== undefined) updateData.disposition = data.disposition;
  if (data.rootCause !== undefined) updateData.rootCause = data.rootCause;
  if (data.correctiveAction !== undefined) updateData.correctiveAction = data.correctiveAction;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;

  const updated = await db.nonConformance.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId,
    userName,
    action: "NCR_UPDATE",
    module: "qc",
    resource: "ncr",
    recordId: id,
    oldValue: { status: existing.status, severity: existing.severity },
    newValue: updateData,
    description: `Updated non-conformance report: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function resolveNCR(
  companyId: string,
  id: string,
  data: {
    disposition: string;
    rootCause?: string | null;
    correctiveAction?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.nonConformance.findUnique({ where: { id } });
  if (!existing) throw new Error("Non-conformance report not found");
  if (existing.companyId !== companyId) throw new Error("Non-conformance report not found");
  if (existing.status === "RESOLVED" || existing.status === "CLOSED") {
    throw new Error("NCR is already resolved or closed");
  }

  const now = new Date();

  const updated = await db.nonConformance.update({
    where: { id },
    data: {
      status: "RESOLVED",
      disposition: data.disposition,
      rootCause: data.rootCause ?? null,
      correctiveAction: data.correctiveAction ?? null,
      resolvedAt: now,
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "NCR_RESOLVED",
    module: "qc",
    resource: "ncr",
    recordId: id,
    oldValue: { status: existing.status },
    newValue: { status: "RESOLVED", disposition: data.disposition },
    description: `Resolved non-conformance report: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function closeNCR(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.nonConformance.findUnique({ where: { id } });
  if (!existing) throw new Error("Non-conformance report not found");
  if (existing.companyId !== companyId) throw new Error("Non-conformance report not found");
  if (existing.status !== "RESOLVED") throw new Error("Only RESOLVED NCRs can be closed");

  const now = new Date();

  const updated = await db.nonConformance.update({
    where: { id },
    data: { status: "CLOSED", closedAt: now },
  });

  await createAuditLog({
    userId,
    userName,
    action: "NCR_CLOSED",
    module: "qc",
    resource: "ncr",
    recordId: id,
    oldValue: { status: "RESOLVED" },
    newValue: { status: "CLOSED" },
    description: `Closed non-conformance report: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}
