import { z } from "zod";

export const createEmployeeSchema = z.object({
  branchId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  employeeNumber: z.string().min(1, "Employee number is required").max(50),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  employmentType: z.enum(["PERMANENT", "CONTRACT", "CASUAL", "TEMPORARY"]).optional().default("PERMANENT"),
  hireDate: z.string().datetime().optional().nullable(),
  isDriver: z.boolean().optional().default(false),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  employmentType: z.enum(["PERMANENT", "CONTRACT", "CASUAL", "TEMPORARY"]).optional(),
  hireDate: z.string().datetime().optional().nullable(),
  isDriver: z.boolean().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]),
  terminationDate: z.string().datetime().optional().nullable(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
