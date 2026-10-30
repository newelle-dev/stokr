import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodResolver } from '../zod-resolver';
import { changePasswordSchema } from '@/features/auth/schemas';

const defaultOptions = {
  fields: {},
  shouldUseNativeValidation: false,
};

describe('zodResolver (Zod v4 compatibility)', () => {
  it('returns valid values on successful validation', async () => {
    const resolver = zodResolver(changePasswordSchema);
    const result = await resolver(
      {
        currentPassword: 'current-pass-123',
        newPassword: 'new-valid-password-10',
        confirmPassword: 'new-valid-password-10',
      },
      {},
      defaultOptions
    );

    expect(result.errors).toEqual({});
    expect(result.values.newPassword).toBe('new-valid-password-10');
  });

  it('maps Zod v4 issues into form errors instead of throwing Runtime ZodError', async () => {
    const resolver = zodResolver(changePasswordSchema);

    // This input triggered the user's Runtime ZodError:
    // newPassword < 10 chars, and passwords do not match
    const result = await resolver(
      {
        currentPassword: '',
        newPassword: 'short',
        confirmPassword: 'mismatch',
      },
      {},
      defaultOptions
    );

    expect(result.errors).toBeDefined();
    expect(result.errors.newPassword?.message).toBe('Password must be at least 10 characters');
    expect(result.errors.confirmPassword?.message).toBe('Passwords do not match');
  });

  it('handles transforms (toLowerCase, trim) and passes transformed values on success', async () => {
    const transformSchema = z.object({
      username: z
        .string()
        .trim()
        .transform((val) => val.toLowerCase()),
      storeCode: z
        .string()
        .trim()
        .transform((val) => val.toLowerCase()),
    });

    const resolver = zodResolver(transformSchema);
    const result = await resolver(
      {
        username: '  AdminStaff_01  ',
        storeCode: '  CLOUD-HAVEN  ',
      },
      {},
      defaultOptions
    );

    expect(result.errors).toEqual({});
    expect(result.values.username).toBe('adminstaff_01');
    expect(result.values.storeCode).toBe('cloud-haven');
  });

  it('handles field-level refinements and sets error on the targeted field path', async () => {
    const refinementSchema = z
      .object({
        password: z.string().min(8),
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: 'Confirmation does not match original password',
        path: ['confirmPassword'],
      });

    const resolver = zodResolver(refinementSchema);
    const result = await resolver(
      {
        password: 'Password123!',
        confirmPassword: 'DifferentPassword!',
      },
      {},
      defaultOptions
    );

    expect(result.errors.confirmPassword?.message).toBe('Confirmation does not match original password');
    expect(result.errors.confirmPassword?.type).toBe('custom');
    expect(result.errors.password).toBeUndefined();
  });

  it('handles nested schemas and root refine errors', async () => {
    const nestedSchema = z
      .object({
        branch: z.object({
          name: z.string().min(3, 'Branch name too short'),
        }),
      })
      .refine(() => false, { message: 'Shop constraint violated' });

    const resolver = zodResolver(nestedSchema);
    const result = await resolver(
      { branch: { name: 'ab' } },
      {},
      defaultOptions
    );

    const errors = result.errors as Record<string, Record<string, { message?: string }>>;
    expect(errors.branch?.name?.message).toBe('Branch name too short');
    expect(errors.root?.message).toBe('Shop constraint violated');
  });
});
