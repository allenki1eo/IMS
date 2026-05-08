import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listWorkflows(companyId: string) {
  return db.approvalWorkflow.findMany({
    where: { companyId },
    include: {
      steps: { orderBy: { stepNumber: "asc" }, include: { role: true } },
      _count: { select: { requests: true } },
    },
    orderBy: [{ module: "asc" }, { resource: "asc" }],
  });
}

export async function getWorkflowById(id: string) {
  return db.approvalWorkflow.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" }, include: { role: true } },
    },
  });
}

export async function createWorkflow(params: {
  companyId: string;
  name: string;
  module: string;
  resource: string;
  description?: string;
  steps: Array<{
    stepNumber: number;
    name: string;
    description?: string;
    approverType: string;
    approverRoleId?: string;
    approverUserId?: string;
    canDelegate?: boolean;
    timeLimitHours?: number;
  }>;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { companyId, name, module, resource, description, steps, createdById, userName, ipAddress, userAgent } =
    params;

  const workflow = await db.approvalWorkflow.create({
    data: {
      companyId,
      name,
      module,
      resource,
      description,
      createdById,
      steps: { create: steps },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "WORKFLOW_CREATE",
    module: "approvals",
    resource: "approval_workflow",
    recordId: workflow.id,
    newValue: { name, module, resource, stepCount: steps.length },
    description: `Created approval workflow: ${name}`,
    ipAddress,
    userAgent,
    companyId,
  });

  return workflow;
}

export async function listApprovalRequests(params: {
  page: number;
  pageSize: number;
  status?: string;
  module?: string;
  companyId: string;
  forUserId?: string;
  userRoleCodes?: string[];
}) {
  const { page, pageSize, status, module, companyId, forUserId, userRoleCodes } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(module ? { module } : {}),
  };

  const [requests, total] = await Promise.all([
    db.approvalRequest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { requestedAt: "desc" },
      include: {
        workflow: { select: { name: true } },
        actions: { orderBy: { actedAt: "desc" }, take: 1 },
      },
    }),
    db.approvalRequest.count({ where }),
  ]);

  return { requests, total };
}

export async function getApprovalRequestById(id: string) {
  return db.approvalRequest.findUnique({
    where: { id },
    include: {
      workflow: {
        include: { steps: { orderBy: { stepNumber: "asc" }, include: { role: true } } },
      },
      actions: {
        orderBy: { actedAt: "asc" },
      },
    },
  });
}

export async function createApprovalRequest(params: {
  companyId: string;
  workflowId: string;
  module: string;
  resource: string;
  recordId: string;
  recordReference: string;
  requestedById: string;
  priority?: string;
  notes?: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const {
    companyId,
    workflowId,
    module,
    resource,
    recordId,
    recordReference,
    requestedById,
    priority = "NORMAL",
    notes,
    userName,
    ipAddress,
    userAgent,
  } = params;

  const request = await db.approvalRequest.create({
    data: {
      companyId,
      workflowId,
      module,
      resource,
      recordId,
      recordReference,
      requestedById,
      priority,
      notes,
    },
  });

  await createAuditLog({
    userId: requestedById,
    userName,
    action: "REQUEST_CREATED",
    module: "approvals",
    resource: "approval_request",
    recordId: request.id,
    newValue: { module, resource, recordReference, priority },
    description: `Approval request created for ${recordReference}`,
    ipAddress,
    userAgent,
    companyId,
  });

  return request;
}

export async function approveStep(params: {
  requestId: string;
  userId: string;
  userName: string;
  comments?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { requestId, userId, userName, comments, ipAddress, userAgent } = params;

  const request = await db.approvalRequest.findUnique({
    where: { id: requestId },
    include: {
      workflow: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
    },
  });
  if (!request) throw new Error("Approval request not found");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  const totalSteps = request.workflow.steps.length;
  const isLastStep = request.currentStep >= totalSteps;

  await db.approvalAction.create({
    data: {
      requestId,
      stepNumber: request.currentStep,
      action: "APPROVE",
      actedById: userId,
      comments,
    },
  });

  if (isLastStep) {
    await db.approvalRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", resolvedAt: new Date(), resolvedById: userId },
    });
  } else {
    await db.approvalRequest.update({
      where: { id: requestId },
      data: { currentStep: request.currentStep + 1 },
    });
  }

  await createAuditLog({
    userId,
    userName,
    action: "REQUEST_APPROVED",
    module: "approvals",
    resource: "approval_request",
    recordId: requestId,
    newValue: { step: request.currentStep, isLastStep },
    description: `Approved step ${request.currentStep} of ${request.recordReference}`,
    ipAddress,
    userAgent,
    companyId: request.companyId,
  });

  return isLastStep ? "APPROVED" : "NEXT_STEP";
}

export async function rejectStep(params: {
  requestId: string;
  userId: string;
  userName: string;
  comments: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { requestId, userId, userName, comments, ipAddress, userAgent } = params;

  const request = await db.approvalRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Approval request not found");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  await db.approvalAction.create({
    data: {
      requestId,
      stepNumber: request.currentStep,
      action: "REJECT",
      actedById: userId,
      comments,
    },
  });

  await db.approvalRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", resolvedAt: new Date(), resolvedById: userId },
  });

  await createAuditLog({
    userId,
    userName,
    action: "REQUEST_REJECTED",
    module: "approvals",
    resource: "approval_request",
    recordId: requestId,
    newValue: { step: request.currentStep, comments },
    description: `Rejected ${request.recordReference}: ${comments}`,
    ipAddress,
    userAgent,
    companyId: request.companyId,
  });
}

export async function cancelRequest(params: {
  requestId: string;
  userId: string;
  userName: string;
  reason: string;
  isAdmin: boolean;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { requestId, userId, userName, reason, isAdmin, ipAddress, userAgent } = params;

  const request = await db.approvalRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Approval request not found");
  if (request.status !== "PENDING") throw new Error("Only pending requests can be cancelled");
  if (!isAdmin && request.requestedById !== userId) {
    throw new Error("You can only cancel your own requests");
  }

  await db.approvalRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED", resolvedAt: new Date(), resolvedById: userId },
  });

  await createAuditLog({
    userId,
    userName,
    action: "REQUEST_CANCELLED",
    module: "approvals",
    resource: "approval_request",
    recordId: requestId,
    newValue: { reason },
    description: `Cancelled approval request ${request.recordReference}: ${reason}`,
    ipAddress,
    userAgent,
    companyId: request.companyId,
  });
}
