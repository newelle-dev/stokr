import { describe, expect, it, vi, beforeEach } from 'vitest';
import { requestPasswordResetAction, resetPasswordAction } from '../actions';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

let mockUser: { role: 'owner' | 'staff' } | null = null;
let hasRecoveryCookie = false;
let resetError: { message: string } | null = null;
let updateError: { message: string } | null = null;
const resetCalls: Array<{ email: string; redirectTo?: string }> = [];
let updateCalls = 0;
let deletedCookies: string[] = [];

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn(async () => mockUser) }));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ origin: 'https://stokr.example' })),
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === 'stokr_recovery' && hasRecoveryCookie ? { value: '1' } : undefined),
    delete: (name: string) => deletedCookies.push(name),
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      resetPasswordForEmail: vi.fn(async (email: string, opts?: { redirectTo?: string }) => {
        resetCalls.push({ email, redirectTo: opts?.redirectTo });
        return { error: resetError };
      }),
      updateUser: vi.fn(async () => {
        updateCalls++;
        return { error: updateError };
      }),
    },
  })),
}));

const goodPw = { newPassword: 'correct-horse-9', confirmPassword: 'correct-horse-9' };

beforeEach(() => {
  mockUser = null;
  hasRecoveryCookie = false;
  resetError = null;
  updateError = null;
  resetCalls.length = 0;
  updateCalls = 0;
  deletedCookies = [];
});

describe('requestPasswordResetAction', () => {
  it('sends the reset email with the callback link', async () => {
    const r = await requestPasswordResetAction({ email: 'Owner@Shop.com' });
    expect(r.ok).toBe(true);
    expect(resetCalls).toEqual([{ email: 'owner@shop.com', redirectTo: 'https://stokr.example/login/callback' }]);
  });

  it('answers the same way when the email service fails (no account probing)', async () => {
    resetError = { message: 'User not found' };
    const r = await requestPasswordResetAction({ email: 'nobody@shop.com' });
    expect(r.ok).toBe(true);
  });

  it('rejects a malformed email without calling the service', async () => {
    const r = await requestPasswordResetAction({ email: 'not-an-email' });
    expect(r.ok).toBe(false);
    expect(resetCalls).toHaveLength(0);
  });
});

describe('resetPasswordAction', () => {
  it('refuses a normal logged-in session without the recovery cookie', async () => {
    mockUser = { role: 'owner' };
    const r = await resetPasswordAction(goodPw);
    expect(r.ok).toBe(false);
    expect(updateCalls).toBe(0);
  });

  it('refuses when nobody is signed in', async () => {
    hasRecoveryCookie = true;
    const r = await resetPasswordAction(goodPw);
    expect(r.ok).toBe(false);
    expect(updateCalls).toBe(0);
  });

  it('refuses mismatched or short passwords', async () => {
    mockUser = { role: 'owner' };
    hasRecoveryCookie = true;
    const r = await resetPasswordAction({ newPassword: 'short', confirmPassword: 'short' });
    expect(r.ok).toBe(false);
    expect(updateCalls).toBe(0);
  });

  it('updates the password and burns the recovery cookie', async () => {
    mockUser = { role: 'owner' };
    hasRecoveryCookie = true;
    const r = await resetPasswordAction(goodPw);
    expect(r.ok).toBe(true);
    expect(updateCalls).toBe(1);
    expect(deletedCookies).toEqual(['stokr_recovery']);
  });
});
