import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
const getUser = vi.fn();
const updateUser = vi.fn();
const cookieSet = vi.fn();
const redirect = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({ set: cookieSet }),
}));
vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to) }));

let profileRow: { id: string } | null = null;
let profileError: { message: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser, updateUser },
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: profileRow, error: profileError }) }),
      }),
    }),
  }),
}));

import { createShopAction, dismissStoreCodeAction } from '@/features/onboarding/actions';
import { STORE_CODE_COOKIE } from '@/features/onboarding/constants';

const valid = {
  shopName: 'Cloud Haven',
  branchName: 'Main',
  newPassword: 'a-strong-password',
  confirmPassword: 'a-strong-password',
};

describe('createShopAction', () => {
  beforeEach(() => {
    rpc.mockReset();
    getUser.mockReset();
    updateUser.mockReset();
    profileRow = null;
    profileError = null;
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    updateUser.mockResolvedValue({ error: null });
  });

  it('does not touch the password when the user already has a profile', async () => {
    profileRow = { id: 'u1' };
    const result = await createShopAction(valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ALREADY_ONBOARDED');
    expect(updateUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('stops without changing the password when the profile lookup fails', async () => {
    profileError = { message: 'connection reset' };
    const result = await createShopAction(valid);
    expect(result.ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects invalid input without calling Supabase', async () => {
    const result = await createShopAction({ ...valid, shopName: '  ' });
    expect(result.ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a mismatched password before any Supabase call', async () => {
    const result = await createShopAction({ ...valid, confirmPassword: 'different-password-1' });
    expect(result.ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sets the password first, then creates the shop with no products', async () => {
    rpc.mockResolvedValue({ data: 'abc123', error: null });
    const order: string[] = [];
    updateUser.mockImplementation(async () => {
      order.push('updateUser');
      return { error: null };
    });
    rpc.mockImplementation(async () => {
      order.push('rpc');
      return { data: 'abc123', error: null };
    });
    const result = await createShopAction(valid);
    expect(result).toEqual({ ok: true, data: { redirectTo: '/dashboard', storeCode: 'abc123' } });
    expect(order).toEqual(['updateUser', 'rpc']);
    expect(updateUser).toHaveBeenCalledWith({ password: 'a-strong-password' });
    expect(rpc).toHaveBeenCalledWith('create_shop_for_new_owner', {
      p_shop_name: 'Cloud Haven',
      p_branch_name: 'Main',
      p_products: [],
    });
  });

  it('ignores the same-password error so a retry can finish', async () => {
    updateUser.mockResolvedValue({
      error: { message: 'New password should be different from the old password.', code: 'same_password' },
    });
    rpc.mockResolvedValue({ data: 'abc123', error: null });
    const result = await createShopAction(valid);
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledOnce();
  });

  it('stops on any other password error and does not create the shop', async () => {
    updateUser.mockResolvedValue({ error: { message: 'Password is too weak', code: 'weak_password' } });
    const result = await createShopAction(valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('AUTH_ERROR');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('keeps the new store code in a short-lived httpOnly cookie for the onboarding page', async () => {
    rpc.mockResolvedValue({ data: 'abc123', error: null });
    await createShopAction(valid);
    expect(cookieSet).toHaveBeenCalledWith(
      STORE_CODE_COOKIE,
      'abc123',
      expect.objectContaining({ httpOnly: true, path: '/onboarding', maxAge: 600 })
    );
  });

  it('does not set the cookie when onboarding fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'already_onboarded' } });
    await createShopAction(valid);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it('clears the store code cookie and goes to the dashboard when dismissed', async () => {
    await dismissStoreCodeAction();
    expect(cookieSet).toHaveBeenCalledWith(
      STORE_CODE_COOKIE,
      '',
      expect.objectContaining({ maxAge: 0, path: '/onboarding' })
    );
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('maps a second onboarding attempt to a plain message', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'already_onboarded' } });
    const result = await createShopAction(valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ALREADY_ONBOARDED');
  });

  it('does not leak raw database errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'duplicate key value violates constraint' } });
    const result = await createShopAction(valid);
    if (result.ok) throw new Error('expected failure');
    expect(result.error.message).not.toContain('duplicate key');
  });

  it('refuses when there is no signed-in user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const result = await createShopAction(valid);
    expect(result.ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
