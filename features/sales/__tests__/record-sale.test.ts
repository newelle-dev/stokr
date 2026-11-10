import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, requireAuthAction, revalidatePath } = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireAuthAction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}));
vi.mock('@/lib/auth', () => ({ requireAuthAction }));
vi.mock('next/cache', () => ({ revalidatePath }));

import { recordSaleAction } from '../actions';
import { recordSaleInputSchema } from '../schemas';
import { saleErrorFor } from '../sale-errors';

const BRANCH = '00000000-0000-4000-8000-000000000010';
const PRODUCT = '00000000-0000-4000-8000-000000000301';

const validInput = {
  branchId: BRANCH,
  paymentMethod: 'cash',
  items: [{ productId: PRODUCT, quantity: 2 }],
  clientRequestId: 'req-1',
};

describe('recordSaleInputSchema', () => {
  it('accepts a normal cash sale', () => {
    expect(recordSaleInputSchema.safeParse(validInput).success).toBe(true);
  });

  it.each([
    ['no items', { ...validInput, items: [] }],
    ['more than 50 items', { ...validInput, items: Array.from({ length: 51 }, () => ({ productId: PRODUCT, quantity: 1 })) }],
    ['quantity 0', { ...validInput, items: [{ productId: PRODUCT, quantity: 0 }] }],
    ['quantity 1001', { ...validInput, items: [{ productId: PRODUCT, quantity: 1001 }] }],
    ['fractional quantity', { ...validInput, items: [{ productId: PRODUCT, quantity: 1.5 }] }],
    ['card payment', { ...validInput, paymentMethod: 'card' }],
    ['missing payment', { ...validInput, paymentMethod: undefined }],
    ['blank request id', { ...validInput, clientRequestId: '   ' }],
    ['branch not a uuid', { ...validInput, branchId: 'main' }],
  ])('rejects %s', (_label, input) => {
    expect(recordSaleInputSchema.safeParse(input).success).toBe(false);
  });
});

describe('saleErrorFor', () => {
  it('turns a known database message into a friendly one', () => {
    expect(saleErrorFor('ERROR: Forbidden: Staff can only sell at their own branch.')).toEqual({
      code: 'FORBIDDEN',
      message: 'You can only record sales at your own branch.',
    });
  });

  it('hides unknown database text behind a generic message', () => {
    const result = saleErrorFor('ERROR: relation "sales" does not exist');
    expect(result.code).toBe('DB_ERROR');
    expect(result.message).not.toContain('relation');
  });
});

describe('recordSaleAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    requireAuthAction.mockResolvedValue({ ok: true, data: { id: 'staff' } });
  });

  it('stops before the database when nobody is logged in', async () => {
    requireAuthAction.mockResolvedValue({ ok: false, error: { code: 'UNAUTHORIZED', message: 'signed out' } });
    const result = await recordSaleAction(validInput);
    expect(result).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects bad input before the database', async () => {
    const result = await recordSaleAction({ ...validInput, items: [] });
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sends snake_case arguments to record_sale and returns no cost', async () => {
    rpc.mockResolvedValue({
      data: { success: true, sale_id: 'sale-1', total_centavos: 50000, duplicate: false, flagged_products: [] },
      error: null,
    });

    const result = await recordSaleAction(validInput);

    expect(rpc).toHaveBeenCalledWith('record_sale', {
      p_branch_id: BRANCH,
      p_payment_method: 'cash',
      p_items: [{ product_id: PRODUCT, quantity: 2 }],
      p_client_request_id: 'req-1',
    });
    expect(result).toEqual({
      ok: true,
      data: { saleId: 'sale-1', totalCentavos: 50000, isDuplicate: false, flaggedProducts: [] },
    });
    expect(JSON.stringify(result)).not.toMatch(/cost/i);
    expect(revalidatePath).toHaveBeenCalledWith('/my-sales');
  });

  it('reports a repeated request as a duplicate, not a second sale', async () => {
    rpc.mockResolvedValue({
      data: { success: true, duplicate: true, sale_id: 'sale-1', total_centavos: 50000 },
      error: null,
    });
    const result = await recordSaleAction(validInput);
    expect(result).toMatchObject({ ok: true, data: { saleId: 'sale-1', isDuplicate: true, flaggedProducts: [] } });
  });

  it('passes flagged zero-stock products back to the screen', async () => {
    rpc.mockResolvedValue({
      data: { success: true, sale_id: 'sale-2', total_centavos: 35000, duplicate: false, flagged_products: ['Pastry'] },
      error: null,
    });
    const result = await recordSaleAction(validInput);
    expect(result).toMatchObject({ ok: true, data: { flaggedProducts: ['Pastry'] } });
  });

  it('shows a friendly message and never the raw database text', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Product not found or inactive in current shop.' },
    });
    const result = await recordSaleAction(validInput);
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(JSON.stringify(result)).not.toContain('current shop');
  });
});
