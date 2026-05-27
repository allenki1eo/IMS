import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

interface TestWithResult {
  result?: string | null;
  [key: string]: unknown;
}

interface StandardParameterRow {
  name: string;
  unit?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  targetValue?: number | null;
  sortOrder?: number | null;
}

interface TestResultRow {
  id: string;
  parameterName: string;
  minValue?: number | null;
  maxValue?: number | null;
  isPassed?: boolean | null;
}

function generateRef(prefix: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listTests(
  companyId: string,
  params: {
    standardId?: string;
    itemId?: string;
    productionBatchId?: string;
    testType?: string;
    testStage?: string;
    status?: string;
    search?: string;
    page: number;
    pageSize: number;
  }
) {
  const { standardId, itemId, productionBatchId, testType, testStage, status, search, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(standardId ? { standardId } : {}),
    ...(itemId ? { itemId } : {}),
    ...(productionBatchId ? { productionBatchId } : {}),
    ...(testType ? { testType } : {}),
    ...(testStage ? { testStage } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { batchNumber: { contains: search } },
          ],
        }
      : {}),
  };

  const [tests, total] = await Promise.all([
    db.qualityTest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        standard: { select: { id: true, code: true, name: true } },
        item: { select: { id: true, code: true, name: true } },
        productionBatch: { select: { id: true, reference: true, productName: true, status: true } },
        _count: { select: { results: true, nonConformances: true } },
      },
    }),
    db.qualityTest.count({ where }),
  ]);

  return {
    data: (tests as TestWithResult[]).map((test) => ({ ...test, overallResult: test.result })),
    meta: { total, page, pageSize },
  };
}

export async function getTest(companyId: string, id: string) {
  const test = await db.qualityTest.findUnique({
    where: { id },
    include: {
      standard: { select: { id: true, code: true, name: true } },
      item: { select: { id: true, code: true, name: true } },
      productionBatch: { select: { id: true, reference: true, productName: true, status: true } },
      results: { orderBy: { id: "asc" } },
      nonConformances: {
        select: {
          id: true,
          reference: true,
          title: true,
          severity: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!test) return null;
  if (test.companyId !== companyId) return null;
  return { ...test, overallResult: test.result };
}

export async function createTest(
  companyId: string,
  data: {
    standardId?: string | null;
    itemId?: string | null;
    productionBatchId?: string | null;
    batchNumber?: string | null;
    testType: string;
    testStage?: string | null;
    samplePoint?: string | null;
    notes?: string | null;
    sampleQty?: number | null;
    sampleUnit?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  if (data.standardId) {
    const standard = await db.qualityStandard.findUnique({ where: { id: data.standardId } });
    if (!standard) throw new Error("Quality standard not found");
    if (standard.companyId !== companyId) throw new Error("Quality standard not found");
  }

  if (data.itemId) {
    const item = await db.item.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error("Item not found");
    if (item.companyId !== companyId) throw new Error("Item not found");
  }

  let batchNumber = data.batchNumber ?? null;
  if (data.productionBatchId) {
    const batch = await db.productionBatch.findUnique({ where: { id: data.productionBatchId } });
    if (!batch) throw new Error("Production batch not found");
    if (batch.companyId !== companyId) throw new Error("Production batch not found");
    batchNumber = batch.reference;
  }

  const reference = generateRef("QT");

  const test = await db.qualityTest.create({
    data: {
      companyId,
      reference,
      standardId: data.standardId ?? null,
      itemId: data.itemId ?? null,
      productionBatchId: data.productionBatchId ?? null,
      batchNumber,
      testType: data.testType,
      testStage: data.testStage ?? null,
      samplePoint: data.samplePoint ?? null,
      status: "PENDING",
      requestedById: userId,
      sampleQty: data.sampleQty ?? null,
      sampleUnit: data.sampleUnit ?? null,
      notes: data.notes ?? null,
    },
  });

  // If standardId provided, auto-create result rows from standard parameters
  if (data.standardId) {
    const parameters = await db.qualityStandardParameter.findMany({
      where: { standardId: data.standardId },
      orderBy: { sortOrder: "asc" },
    });

    const parameterRows = parameters as StandardParameterRow[];
    if (parameterRows.length > 0) {
      await db.qualityTestResult.createMany({
        data: parameterRows.map((p) => ({
          testId: test.id,
          parameterName: p.name,
          unit: p.unit,
          minValue: p.minValue,
          maxValue: p.maxValue,
          targetValue: p.targetValue,
        })),
      });
    }
  }

  await createAuditLog({
    userId,
    userName,
    action: "QC_TEST_CREATE",
    module: "qc",
    resource: "test",
    recordId: test.id,
    newValue: {
      reference,
      testType: data.testType,
      testStage: data.testStage,
      samplePoint: data.samplePoint,
      standardId: data.standardId,
      itemId: data.itemId,
      productionBatchId: data.productionBatchId,
    },
    description: `Created quality test: ${reference}`,
    ipAddress,
    companyId,
  });

  return test;
}

export async function startTest(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.qualityTest.findUnique({ where: { id } });
  if (!existing) throw new Error("Quality test not found");
  if (existing.companyId !== companyId) throw new Error("Quality test not found");
  if (existing.status !== "PENDING") throw new Error("Only PENDING tests can be started");

  const updated = await db.qualityTest.update({
    where: { id },
    data: { status: "IN_PROGRESS", testedById: userId },
  });

  await createAuditLog({
    userId,
    userName,
    action: "QC_TEST_STARTED",
    module: "qc",
    resource: "test",
    recordId: id,
    oldValue: { status: "PENDING" },
    newValue: { status: "IN_PROGRESS", testedById: userId },
    description: `Started quality test: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function recordResults(
  companyId: string,
  id: string,
  results: Array<{ resultId: string; actualValue?: number | null; textResult?: string | null }>,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.qualityTest.findUnique({
    where: { id },
    include: { results: true },
  });
  if (!existing) throw new Error("Quality test not found");
  if (existing.companyId !== companyId) throw new Error("Quality test not found");
  if (existing.status !== "IN_PROGRESS") throw new Error("Only IN_PROGRESS tests can have results recorded");

  // Update each result row
  for (const r of results) {
    const resultRow = (existing.results as TestResultRow[]).find((row) => row.id === r.resultId);
    if (!resultRow) continue;

    // Compute isPassed if actualValue is provided and numeric bounds are set
    let isPassed: boolean | null = null;
    if (r.actualValue !== undefined && r.actualValue !== null) {
      const hasMin = resultRow.minValue !== null && resultRow.minValue !== undefined;
      const hasMax = resultRow.maxValue !== null && resultRow.maxValue !== undefined;
      if (hasMin || hasMax) {
        isPassed = true;
        if (hasMin && r.actualValue < resultRow.minValue!) isPassed = false;
        if (hasMax && r.actualValue > resultRow.maxValue!) isPassed = false;
      }
    }

    await db.qualityTestResult.update({
      where: { id: r.resultId },
      data: {
        actualValue: r.actualValue ?? null,
        textResult: r.textResult ?? null,
        isPassed,
      },
    });
  }

  await createAuditLog({
    userId,
    userName,
    action: "QC_TEST_RESULTS_RECORDED",
    module: "qc",
    resource: "test",
    recordId: id,
    newValue: { resultCount: results.length },
    description: `Recorded results for quality test: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return db.qualityTest.findUnique({
    where: { id },
    include: {
      standard: { select: { id: true, code: true, name: true } },
      item: { select: { id: true, code: true, name: true } },
      productionBatch: { select: { id: true, reference: true, productName: true, status: true } },
      results: { orderBy: { id: "asc" } },
    },
  });
}

export async function completeTest(
  companyId: string,
  id: string,
  data: { notes?: string | null },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.qualityTest.findUnique({
    where: { id },
    include: { results: true },
  });
  if (!existing) throw new Error("Quality test not found");
  if (existing.companyId !== companyId) throw new Error("Quality test not found");
  if (existing.status !== "IN_PROGRESS") throw new Error("Only IN_PROGRESS tests can be completed");

  const now = new Date();

  // Compute overall result
  // Need to know which results map to required parameters
  let overallResult = "PASS";
  const resultRows = existing.results;

  if (resultRows.length > 0) {
    // We need to check required params - fetch from standard if available
    let requiredParamNames: Set<string> = new Set();
    if (existing.standardId) {
      const params = await db.qualityStandardParameter.findMany({
        where: { standardId: existing.standardId, isRequired: true },
      });
      requiredParamNames = new Set((params as StandardParameterRow[]).map((p) => p.name));
    }

    const typedResultRows = resultRows as TestResultRow[];
    const requiredResults = requiredParamNames.size > 0
      ? typedResultRows.filter((r) => requiredParamNames.has(r.parameterName))
      : typedResultRows;

    const anyRequiredFailed = requiredResults.some((r) => r.isPassed === false);
    const allRequiredPassed = requiredResults.every((r) => r.isPassed === true);

    if (anyRequiredFailed) {
      overallResult = "FAIL";
    } else if (allRequiredPassed) {
      overallResult = "PASS";
    } else {
      overallResult = "CONDITIONAL";
    }
  }

  const updated = await db.qualityTest.update({
    where: { id },
    data: {
      status: "COMPLETED",
      result: overallResult,
      testedAt: now,
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "QC_TEST_COMPLETED",
    module: "qc",
    resource: "test",
    recordId: id,
    oldValue: { status: "IN_PROGRESS" },
    newValue: { status: "COMPLETED", result: overallResult },
    description: `Completed quality test: ${existing.reference} with result: ${overallResult}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function cancelTest(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.qualityTest.findUnique({ where: { id } });
  if (!existing) throw new Error("Quality test not found");
  if (existing.companyId !== companyId) throw new Error("Quality test not found");
  if (existing.status !== "PENDING") throw new Error("Only PENDING tests can be cancelled");

  const updated = await db.qualityTest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await createAuditLog({
    userId,
    userName,
    action: "QC_TEST_CANCELLED",
    module: "qc",
    resource: "test",
    recordId: id,
    oldValue: { status: "PENDING" },
    newValue: { status: "CANCELLED" },
    description: `Cancelled quality test: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function setReleaseDecision(
  companyId: string,
  id: string,
  decision: string,
  notes: string | null,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.qualityTest.findUnique({ where: { id } });
  if (!existing) throw new Error("Quality test not found");
  if (existing.companyId !== companyId) throw new Error("Quality test not found");
  if (existing.status !== "COMPLETED") throw new Error("Only COMPLETED tests can receive release decisions");

  const allowed = new Set(["HOLD", "RELEASED", "CONDITIONAL_RELEASE", "REJECTED"]);
  if (!allowed.has(decision)) throw new Error("Invalid release decision");

  const updated = await db.qualityTest.update({
    where: { id },
    data: {
      releaseDecision: decision,
      releasedAt: new Date(),
      releasedById: userId,
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "QC_RELEASE_DECISION",
    module: "qc",
    resource: "test",
    recordId: id,
    oldValue: { releaseDecision: existing.releaseDecision },
    newValue: { releaseDecision: decision },
    description: `Set QC release decision for ${existing.reference}: ${decision}`,
    ipAddress,
    companyId,
  });

  return updated;
}
