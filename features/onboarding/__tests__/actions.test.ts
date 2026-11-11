import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
const getUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser }, rpc }),
}));

import { createShopAction } from '@/features/onboarding/actions';

const valid = { shopName: 'Cloud Haven', branchName: 'Main', products: [] };

describe('createShopAction', () => {
  beforeEach(() => {
    rpc.mockReset();
    getUser.mockReset();
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('rejects invalid input without calling the database', async () => {
    const result = await createShopAction({ ...valid, shopName: '  ' });
    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns the store code and sends the dashboard as the next page', async () => {
    rpc.mockResolvedValue({ data: 'abc123', error: null });
    const result = await createShopAction(valid);
    expect(result).toEqual({ ok: true, data: { redirectTo: '/dashboard', storeCode: 'abc123' } });
    expect(rpc).toHaveBeenCalledWith('create_shop_for_new_owner', {
      p_shop_name: 'Cloud Haven',
      p_branch_name: 'Main',
      p_products: [],
    });
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
    expect(rpc).not.toHaveBeenCalled();
  });
});
