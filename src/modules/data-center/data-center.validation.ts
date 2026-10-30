import { z } from "zod";
import { DATA_CATEGORIES, FREQUENCIES } from "./data-center.types";

const categoryValues = DATA_CATEGORIES.map((c) => c.value) as [string, ...string[]];
const frequencyValues = FREQUENCIES.map((f) => f.value) as [string, ...string[]];

export const requirementSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  description: z.string().trim().max(500).optional().nullable(),
  category: z.enum(categoryValues, { errorMap: () => ({ message: "Choose a category" }) }),
  frequency: z.enum(frequencyValues, { errorMap: () => ({ message: "Choose a frequency" }) }),
  dueMonth: z.coerce.number().int().min(1).max(12).default(1),
  dueDay: z.coerce.number().int().min(1).max(31).default(31),
  departmentId: z.string().trim().min(1).optional().nullable(),
});

export const requirementUpdateSchema = requirementSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const uploadMetaSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().trim().max(500).optional().nullable(),
  category: z.enum(categoryValues).optional(),
  periodKey: z.string().regex(/^\d{4}(-Q[1-4]|-(0[1-9]|1[0-2]))?$/, "Invalid period"),
  requirementId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
});

export type RequirementInput = z.infer<typeof requirementSchema>;
export type RequirementUpdateInput = z.infer<typeof requirementUpdateSchema>;
export type UploadMetaInput = z.infer<typeof uploadMetaSchema>;
