import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { success } from "@/lib/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const [userCount, employeeCount, branchCount, pendingApprovals] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.employee.count({ where: { status: "ACTIVE" } }),
    db.branch.count({ where: { isActive: true } }),
    db.approvalRequest.count({ where: { status: "PENDING" } }),
  ]);

  return success({ userCount, employeeCount, branchCount, pendingApprovals });
}
