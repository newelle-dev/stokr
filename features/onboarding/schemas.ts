import { z } from 'zod';
import { newPasswordSchema } from '@/features/auth/schemas';

export const onboardingSchema = z
  .object({
    shopName: z.string().trim().min(1, 'Shop name is required').max(80, 'Shop name is too long'),
    branchName: z.string().trim().min(1, 'Branch name is required').max(80, 'Branch name is too long'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type OnboardingInput = z.input<typeof onboardingSchema>;
