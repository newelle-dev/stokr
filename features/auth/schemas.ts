import { z } from 'zod';

export const ownerLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const staffLoginSchema = z.object({
  storeCode: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Store code must be 3-20 characters')
    .max(20, 'Store code must be 3-20 characters')
    .regex(/^[a-z0-9]{3,20}$/, 'Store code can only contain lowercase letters and numbers'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be 3-30 characters')
    .max(30, 'Username must be 3-30 characters')
    .regex(/^[a-z0-9._-]+$/, 'Username can only contain lowercase letters, numbers, dots, hyphens, and underscores')
    .refine((val) => !val.startsWith('.'), 'Username cannot start with a dot')
    .refine((val) => !val.endsWith('.'), 'Username cannot end with a dot')
    .refine((val) => !val.includes('..'), 'Username cannot contain consecutive dots'),
  password: z.string().min(1, 'Password is required'),
});

export const loginSchema = ownerLoginSchema;
export type LoginInput = z.infer<typeof loginSchema>;
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(72, 'Password cannot exceed 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
