import { describe, it, expect } from 'vitest';
import { onboardingSchema } from '@/features/onboarding/schemas';

const valid = {
  shopName: 'Cloud Haven',
  branchName: 'Main',
  newPassword: 'a-strong-password',
  confirmPassword: 'a-strong-password',
};

describe('onboardingSchema', () => {
  it('accepts a valid shop, branch and password', () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects blank and spaces-only shop names', () => {
    expect(onboardingSchema.safeParse({ ...valid, shopName: '' }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, shopName: '   ' }).success).toBe(false);
  });

  it('rejects blank and 81-character branch names', () => {
    expect(onboardingSchema.safeParse({ ...valid, branchName: '   ' }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, branchName: 'x'.repeat(81) }).success).toBe(false);
  });

  it('rejects an 81-character shop name', () => {
    expect(onboardingSchema.safeParse({ ...valid, shopName: 'x'.repeat(81) }).success).toBe(false);
  });

  it('rejects a password under 10 or over 72 characters', () => {
    const short = 'a'.repeat(9);
    const long = 'a'.repeat(73);
    expect(onboardingSchema.safeParse({ ...valid, newPassword: short, confirmPassword: short }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, newPassword: long, confirmPassword: long }).success).toBe(false);
  });

  it('rejects a confirmation that does not match, with the error on confirmPassword', () => {
    const result = onboardingSchema.safeParse({ ...valid, confirmPassword: 'something-else-entirely' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
  });
});
