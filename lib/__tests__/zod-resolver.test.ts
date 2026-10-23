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
