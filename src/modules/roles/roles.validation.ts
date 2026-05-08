import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, numbers, and underscores only"),
  description: z.string().optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional().nullable(),
});

export const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.string()),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
