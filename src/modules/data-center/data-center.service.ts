import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import {
  readUploadContent, removeUploadContent, saveUploadContent, storageKind,
} from "@/lib/storage";
import {
  dueDateFor, parsePeriodKey, periodLabel, periodStatus, periodsFor,
  type PeriodStatus,
} from "./data-center.types";
import type { RequirementInput, RequirementUpdateInput, UploadMetaInput } from "./data-center.validation";

interface Actor {
  id: string;
  name: string;
  ipAddress?: string;
}

/** Thrown for user-correctable problems; routes map it to 400. */
export class DataCenterError extends Error {}

async function departmentNames(companyId: string) {
  const depts = await db.department.findMany({ where: { companyId }, select: { id: true, name: true } });
  return new Map(depts.map((d) => [d.id, d.name]));
}

async function assertDepartment(companyId: string, departmentId?: string | null) {
  if (!departmentId) return;
  const dept = await db.department.findFirst({ where: { id: departmentId, companyId }, select: { id: true } });
  if (!dept) throw new DataCenterError("Department not found in this company");
}

/* ─────────────── Requirements ─────────────── */

export async function listRequirements(companyId: string, includeInactive = false) {
  const [rows, names] = await Promise.all([
    db.dataRequirement.findMany({
      where: { companyId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    departmentNames(companyId),
  ]);
  return rows.map((r) => ({ ...r, departmentName: r.departmentId ? names.get(r.departmentId) ?? null : null }));
}

export async function createRequirement(companyId: string, input: RequirementInput, actor: Actor) {
  await assertDepartment(companyId, input.departmentId);
  const req = await db.dataRequirement.create({
    data: {
      companyId,
      name: input.name,
      description: input.description || null,
      category: input.category,
      frequency: input.frequency,
      dueMonth: input.dueMonth,
      dueDay: input.dueDay,
      departmentId: input.departmentId || null,
      createdById: actor.id,
    },
  });
  await createAuditLog({
    userId: actor.id,
    userName: actor.name,
    action: "DATA_REQUIREMENT_CREATE",
    module: "data",
    resource: "requirement",
    recordId: req.id,
    newValue: { name: req.name, category: req.category, frequency: req.frequency, dueMonth: req.dueMonth, dueDay: req.dueDay },
    description: `Created data requirement: ${req.name} (${req.frequency.toLowerCase()})`,
    ipAddress: actor.ipAddress,
    companyId,
  });
  return req;
}

export async function updateRequirement(companyId: string, id: string, input: RequirementUpdateInput, actor: Actor) {
  const existing = await db.dataRequirement.findFirst({ where: { id, companyId } });
  if (!existing) return null;
  await assertDepartment(companyId, input.departmentId);
  const updated = await db.dataRequirement.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.dueMonth !== undefined && { dueMonth: input.dueMonth }),
      ...(input.dueDay !== undefined && { dueDay: input.dueDay }),
      ...(input.departmentId !== undefined && { departmentId: input.departmentId || null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
  await createAuditLog({
    userId: actor.id,
    userName: actor.name,
    action: input.isActive === false ? "DATA_REQUIREMENT_DEACTIVATE" : "DATA_REQUIREMENT_UPDATE",
    module: "data",
    resource: "requirement",
    recordId: id,
    oldValue: { name: existing.name, frequency: existing.frequency, dueMonth: existing.dueMonth, dueDay: existing.dueDay, isActive: existing.isActive },
    newValue: { name: updated.name, frequency: updated.frequency, dueMonth: updated.dueMonth, dueDay: updated.dueDay, isActive: updated.isActive },
    description: `Updated data requirement: ${updated.name}`,
    ipAddress: actor.ipAddress,
    companyId,
  });
  return updated;
}

/* ─────────────── Yearly overview ─────────────── */

export interface OverviewPeriod {
  key: string;
  label: string;
  dueDate: string;
  status: PeriodStatus;
  upload: { id: string; fileName: string; version: number; uploadedByName: string; createdAt: Date } | null;
}

export async function getOverview(companyId: string, year: number) {
  const [requirements, uploads] = await Promise.all([
    listRequirements(companyId),
    db.dataUpload.findMany({
      where: { companyId, periodYear: year, status: "CURRENT", requirementId: { not: null } },
      select: { id: true, requirementId: true, periodKey: true, fileName: true, version: true, uploadedByName: true, createdAt: true },
    }),
  ]);

  const byKey = new Map(uploads.map((u) => [`${u.requirementId}|${u.periodKey}`, u]));
  const now = new Date();
  const totals: Record<PeriodStatus, number> = { SUBMITTED: 0, OVERDUE: 0, DUE_SOON: 0, UPCOMING: 0 };

  const rows = requirements.map((req) => {
    const periods: OverviewPeriod[] = periodsFor(req.frequency, year).map((key) => {
      const u = byKey.get(`${req.id}|${key}`) ?? null;
      const due = dueDateFor(req, key);
      const status = periodStatus(!!u, due, now);
      totals[status]++;
      return {
        key,
        label: periodLabel(key),
        dueDate: due.toISOString(),
        status,
        upload: u && { id: u.id, fileName: u.fileName, version: u.version, uploadedByName: u.uploadedByName, createdAt: u.createdAt },
      };
    });
    return { ...req, periods };
  });

  const expected = Object.values(totals).reduce((a, b) => a + b, 0);
  return { year, requirements: rows, totals: { ...totals, expected } };
}

/* ─────────────── Uploads ─────────────── */

export async function listUploads(
  companyId: string,
  params: { year?: number; category?: string; requirementId?: string; status?: string; search?: string; page: number; pageSize: number }
) {
  const { year, category, requirementId, search, page, pageSize } = params;
  const status = params.status === "ALL" ? undefined : params.status || "CURRENT";
  const where: Prisma.DataUploadWhereInput = {
    companyId,
    ...(year ? { periodYear: year } : {}),
    ...(category ? { category } : {}),
    ...(requirementId ? { requirementId } : {}),
    ...(status ? { status } : {}),
    ...(search ? { OR: [{ title: { contains: search } }, { fileName: { contains: search } }, { description: { contains: search } }] } : {}),
  };
  const [rows, total, names] = await Promise.all([
    db.dataUpload.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { requirement: { select: { id: true, name: true } } },
    }),
    db.dataUpload.count({ where }),
    departmentNames(companyId),
  ]);
  const data = rows.map((u) => ({ ...u, departmentName: u.departmentId ? names.get(u.departmentId) ?? null : null }));
  return { data, total };
}

export async function getUpload(companyId: string, id: string) {
  const upload = await db.dataUpload.findFirst({
    where: { id, companyId },
    include: { requirement: { select: { id: true, name: true, frequency: true } } },
  });
  if (!upload) return null;
  const history = upload.requirementId
    ? await db.dataUpload.findMany({
        where: { companyId, requirementId: upload.requirementId, periodKey: upload.periodKey },
        orderBy: { version: "desc" },
        select: { id: true, version: true, status: true, fileName: true, sizeBytes: true, uploadedByName: true, createdAt: true },
      })
    : [];
  return { ...upload, history };
}

export async function createUpload(
  companyId: string,
  meta: UploadMetaInput,
  file: { name: string; type: string; bytes: Buffer },
  actor: Actor
) {
  const period = parsePeriodKey(meta.periodKey);
  if (!period) throw new DataCenterError("Invalid period");

  let category = meta.category;
  let departmentId = meta.departmentId || null;
  const requirement = meta.requirementId
    ? await db.dataRequirement.findFirst({ where: { id: meta.requirementId, companyId } })
    : null;
  if (meta.requirementId && !requirement) throw new DataCenterError("Requirement not found in this company");
  if (requirement) {
    if (!periodsFor(requirement.frequency, period.year).includes(meta.periodKey)) {
      throw new DataCenterError(`"${requirement.name}" is ${requirement.frequency.toLowerCase()} — pick a matching period`);
    }
    category = requirement.category;
    departmentId = departmentId ?? requirement.departmentId;
  }
  if (!category) throw new DataCenterError("Choose a category");
  await assertDepartment(companyId, departmentId);

  const kind = storageKind();
  const sha256 = createHash("sha256").update(file.bytes).digest("hex");

  // Supersede the period's current file and create the new version atomically.
  // DB storage writes the bytes in the same transaction.
  const { upload, supersededIds } = await db.$transaction(async (tx) => {
    let version = 1;
    let supersededIds: string[] = [];
    if (requirement) {
      const previous = await tx.dataUpload.findMany({
        where: { companyId, requirementId: requirement.id, periodKey: meta.periodKey },
        select: { id: true, version: true, status: true },
      });
      version = previous.reduce((m, p) => Math.max(m, p.version), 0) + 1;
      supersededIds = previous.filter((p) => p.status === "CURRENT").map((p) => p.id);
      if (supersededIds.length) {
        await tx.dataUpload.updateMany({ where: { id: { in: supersededIds } }, data: { status: "SUPERSEDED" } });
      }
    }
    const upload = await tx.dataUpload.create({
      data: {
        companyId,
        departmentId,
        requirementId: requirement?.id ?? null,
        title: meta.title,
        description: meta.description || null,
        category,
        periodYear: period.year,
        periodKey: meta.periodKey,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.bytes.length,
        sha256,
        storage: kind,
        version,
        uploadedById: actor.id,
        uploadedByName: actor.name,
        ...(kind === "DB" ? { blob: { create: { content: new Uint8Array(file.bytes) } } } : {}),
      },
    });
    return { upload, supersededIds };
  });

  if (kind === "DISK") {
    try {
      await saveUploadContent(kind, companyId, upload.id, file.bytes);
    } catch (err) {
      // Undo: the record must never point at a file that wasn't written.
      await db.$transaction([
        db.dataUpload.delete({ where: { id: upload.id } }),
        db.dataUpload.updateMany({ where: { id: { in: supersededIds } }, data: { status: "CURRENT" } }),
      ]);
      await removeUploadContent(kind, companyId, upload.id);
      throw err;
    }
  }

  await createAuditLog({
    userId: actor.id,
    userName: actor.name,
    action: "DATA_UPLOAD_CREATE",
    module: "data",
    resource: "upload",
    recordId: upload.id,
    newValue: {
      title: upload.title, fileName: upload.fileName, sizeBytes: upload.sizeBytes, sha256,
      periodKey: upload.periodKey, requirementId: upload.requirementId, version: upload.version,
    },
    description: `Uploaded ${upload.fileName} for ${periodLabel(upload.periodKey)}${requirement ? ` (${requirement.name}, v${upload.version})` : ""}`,
    ipAddress: actor.ipAddress,
    companyId,
  });

  return upload;
}

/**
 * Archive an upload. If it was the period's current file, the most recent
 * earlier version becomes current again — so archiving a mistaken upload
 * restores what was there before.
 */
export async function archiveUpload(companyId: string, id: string, actor: Actor) {
  const upload = await db.dataUpload.findFirst({ where: { id, companyId } });
  if (!upload) return null;
  if (upload.status === "ARCHIVED") throw new DataCenterError("Already archived");

  const restored = await db.$transaction(async (tx) => {
    await tx.dataUpload.update({ where: { id }, data: { status: "ARCHIVED" } });
    if (upload.status !== "CURRENT" || !upload.requirementId) return null;
    const previous = await tx.dataUpload.findFirst({
      where: { companyId, requirementId: upload.requirementId, periodKey: upload.periodKey, status: "SUPERSEDED" },
      orderBy: { version: "desc" },
    });
    if (!previous) return null;
    return tx.dataUpload.update({ where: { id: previous.id }, data: { status: "CURRENT" } });
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.name,
    action: "DATA_UPLOAD_ARCHIVE",
    module: "data",
    resource: "upload",
    recordId: id,
    oldValue: { status: upload.status },
    newValue: { status: "ARCHIVED", restoredVersion: restored?.version ?? null },
    description: `Archived ${upload.fileName} (${periodLabel(upload.periodKey)})${restored ? `; v${restored.version} is current again` : ""}`,
    ipAddress: actor.ipAddress,
    companyId,
  });
  return { archived: id, restored: restored?.id ?? null };
}

export async function getUploadContent(companyId: string, id: string, actor: Actor) {
  const upload = await db.dataUpload.findFirst({ where: { id, companyId } });
  if (!upload) return null;
  const bytes = await readUploadContent(upload.storage, companyId, id);
  if (!bytes) return { upload, bytes: null };

  // Downloads of company data are worth an audit trail too.
  await createAuditLog({
    userId: actor.id,
    userName: actor.name,
    action: "DATA_UPLOAD_DOWNLOAD",
    module: "data",
    resource: "upload",
    recordId: id,
    description: `Downloaded ${upload.fileName}`,
    ipAddress: actor.ipAddress,
    companyId,
  });
  return { upload, bytes };
}
