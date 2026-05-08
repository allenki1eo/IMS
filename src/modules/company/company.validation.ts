import { z } from "zod";

export const updateCompanySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  legalName: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  currency: z.string().length(3).optional(),
  dateFormat: z.string().optional(),
  fiscalYearStart: z.number().min(1).max(12).optional(),
});

export const createBranchSchema = z.object({
  name: z.string().min(2).max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, underscores, hyphens"),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  isMain: z.boolean().optional().default(false),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
});

export const createDepartmentSchema = z.object({
  branchId: z.string().optional().nullable(),
  name: z.string().min(2).max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase"),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  headEmployeeId: z.string().optional().nullable(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  headEmployeeId: z.string().optional().nullable(),
});
