import { describe, expect, it } from 'vitest';
import { loginSchema } from '../schemas';

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
