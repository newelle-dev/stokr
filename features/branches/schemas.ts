import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Branch name is required')
    .max(50, 'Branch name cannot exceed 50 characters'),
});

export const updateBranchSchema = z.object({
  id: z.string().uuid('Invalid branch ID'),
  name: z
    .string()
    .trim()
    .min(1, 'Branch name is required')
    .max(50, 'Branch name cannot exceed 50 characters'),
});

export const branchIdSchema = z.object({
  id: z.string().uuid('Invalid branch ID'),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type BranchIdInput = z.infer<typeof branchIdSchema>;
