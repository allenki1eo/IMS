import { z } from "zod";

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required").max(100),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  employeeId: z.string().optional(),
  mustChangePassword: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
});

export const assignRoleSchema = z.object({
  roleId: z.string().min(1, "Role is required"),
  branchId: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
