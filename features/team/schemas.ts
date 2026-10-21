import { z } from 'zod';

export const createStaffSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(60, 'Full name cannot exceed 60 characters'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be 3-30 characters')
    .max(30, 'Username must be 3-30 characters')
    .regex(
      /^[a-z0-9._-]+$/,
      'Username can only contain lowercase letters, numbers, dots, hyphens, and underscores'
    )
    .refine((val) => !val.startsWith('.'), {
      message: 'Username cannot start with a dot',
    })
    .refine((val) => !val.endsWith('.'), {
      message: 'Username cannot end with a dot',
    })
    .refine((val) => !val.includes('..'), {
      message: 'Username cannot contain consecutive dots',
    }),
  branchId: z.string().uuid('Please select a valid branch'),
});

export const resetStaffPasswordSchema = z.object({
  staffId: z.string().uuid('Invalid staff member ID'),
});

export const deactivateStaffSchema = z.object({
  staffId: z.string().uuid('Invalid staff member ID'),
});

export const reassignStaffBranchSchema = z.object({
  staffId: z.string().uuid('Invalid staff member ID'),
  branchId: z.string().uuid('Please select a valid branch'),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type ResetStaffPasswordInput = z.infer<typeof resetStaffPasswordSchema>;
export type DeactivateStaffInput = z.infer<typeof deactivateStaffSchema>;
export type ReassignStaffBranchInput = z.infer<typeof reassignStaffBranchSchema>;
