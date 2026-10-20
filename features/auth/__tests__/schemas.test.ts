import { describe, expect, it } from 'vitest';
import { loginSchema, staffLoginSchema, changePasswordSchema } from '../schemas';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'owner@stokr.local',
      password: 'random-password-123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('owner@stokr.local');
    }
  });

  it('lowercases and trims email', () => {
    const result = loginSchema.safeParse({
      email: '  Owner@Stokr.Local  ',
      password: 'password',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('owner@stokr.local');
    }
  });

  it('rejects invalid email formats', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'owner@stokr.local',
      password: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('staffLoginSchema', () => {
  it('accepts valid store code, username, and password', () => {
    const result = staffLoginSchema.safeParse({
      storeCode: 'cloudhaven',
      username: 'staff1',
      password: 'mypassword10chars',
    });
    expect(result.success).toBe(true);
  });

  it('lowercases and trims store code and username', () => {
    const result = staffLoginSchema.safeParse({
      storeCode: '  CloudHaven  ',
      username: '  Staff.One  ',
      password: 'password',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.storeCode).toBe('cloudhaven');
      expect(result.data.username).toBe('staff.one');
    }
  });

  it('rejects store code shorter than 3 or longer than 20 characters', () => {
    expect(staffLoginSchema.safeParse({ storeCode: 'ab', username: 'staff1', password: 'p' }).success).toBe(false);
    expect(staffLoginSchema.safeParse({ storeCode: 'a'.repeat(21), username: 'staff1', password: 'p' }).success).toBe(false);
  });

  it('rejects special characters in store code', () => {
    expect(staffLoginSchema.safeParse({ storeCode: 'cloud_haven', username: 'staff1', password: 'p' }).success).toBe(false);
    expect(staffLoginSchema.safeParse({ storeCode: 'cloud-haven', username: 'staff1', password: 'p' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepts password >= 10 characters matching confirmation', () => {
    const result = changePasswordSchema.safeParse({
      newPassword: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 10 characters', () => {
    const result = changePasswordSchema.safeParse({
      newPassword: 'Short9chr',
      confirmPassword: 'Short9chr',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched password and confirmation', () => {
    const result = changePasswordSchema.safeParse({
      newPassword: 'StrongPassword123!',
      confirmPassword: 'DifferentPassword123!',
    });
    expect(result.success).toBe(false);
  });
});
