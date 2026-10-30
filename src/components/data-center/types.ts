import type { PeriodStatus } from "@/modules/data-center/data-center.types";

export interface Requirement {
  id: string;
  name: string;
  description: string | null;
  category: string;
  frequency: string;
  dueMonth: number;
  dueDay: number;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
}

export interface OverviewPeriod {
  key: string;
  label: string;
  dueDate: string;
  status: PeriodStatus;
  upload: { id: string; fileName: string; version: number; uploadedByName: string; createdAt: string } | null;
}

export interface Overview {
  year: number;
  requirements: (Requirement & { periods: OverviewPeriod[] })[];
  totals: Record<PeriodStatus, number> & { expected: number };
}

export interface Upload {
  id: string;
  title: string;
  description: string | null;
  category: string;
  periodYear: number;
  periodKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  version: number;
  status: "CURRENT" | "SUPERSEDED" | "ARCHIVED";
  uploadedByName: string;
  createdAt: string;
  requirementId: string | null;
  requirement: { id: string; name: string; frequency?: string } | null;
  departmentName?: string | null;
}

export interface Department {
  id: string;
  name: string;
}

export function downloadUrl(id: string) {
  return `/api/data-center/uploads/${id}/download`;
}
