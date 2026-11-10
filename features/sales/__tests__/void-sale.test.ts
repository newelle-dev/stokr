import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, requireAuthAction, requireOwnerAction, revalidatePath } = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireAuthAction: vi.fn(),
  requireOwnerAction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}));
vi.mock('@/lib/auth', () => ({ requireAuthAction, requireOwnerAction }));
vi.mock('next/cache', () => ({ revalidatePath }));

import { recordReplacementSaleAction, recordSaleAction, voidSaleAction } from '../actions';
import { ownerSalesFilterSchema, replacementSaleInputSchema, voidSaleInputSchema } from '../schemas';
import { saleErrorFor } from '../sale-errors';
import { getManilaRangeBetween } from '@/lib/dates';

const SALE = '00000000-0000-4000-8000-000000000900';
const BRANCH = '00000000-0000-4000-8000-000000000010';
const PRODUCT = '00000000-0000-4000-8000-000000000301';

const ownerOk = { ok: true, data: { role: 'owner' } };
const notOwner = { ok: false, error: { code: 'FORBIDDEN', message: 'Owner access required.' } };

const replacement = {
  branchId: BRANCH,
  paymentMethod: 'cash',
  items: [{ productId: PRODUCT, quantity: 1 }],
  clientRequestId: 'req-r1',
  correctsSaleId: SALE,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('voidSaleInputSchema', () => {
  it('accepts a sale id with a reason and trims it', () => {
    const r = voidSaleInputSchema.safeParse({ saleId: SALE, reason: '  Wrong item  ' });
    expect(r.success && r.data.reason).toBe('Wrong item');
  });

  it.each([
    ['blank reason', { saleId: SALE, reason: '   ' }],
    ['missing reason', { saleId: SALE }],
    ['reason over 200 characters', { saleId: SALE, reason: 'x'.repeat(201) }],
    ['sale id not a uuid', { saleId: 'abc', reason: 'ok' }],
  ])('rejects %s', (_label, input) => {
    expect(voidSaleInputSchema.safeParse(input).success).toBe(false);
  });
});

describe('replacementSaleInputSchema', () => {
  it('requires the original sale id', () => {
    expect(replacementSaleInputSchema.safeParse(replacement).success).toBe(true);
    expect(replacementSaleInputSchema.safeParse({ ...replacement, correctsSaleId: undefined }).success).toBe(false);
  });
});

describe('ownerSalesFilterSchema', () => {
  it('defaults to page 1 and allows no filters', () => {
    expect(ownerSalesFilterSchema.parse({})).toEqual({ page: 1 });
  });

  it.each([
    ['bad date', { from: '10/11/2026' }],
    ['bad status', { status: 'deleted' }],
    ['page 0', { page: 0 }],
    ['branch not a uuid', { branchId: 'main' }],
  ])('rejects %s', (_label, input) => {
    expect(ownerSalesFilterSchema.safeParse(input).success).toBe(false);
  });
});

describe('getManilaRangeBetween', () => {
  it('covers whole Manila days (UTC+8)', () => {
    expect(getManilaRangeBetween('2026-11-10', '2026-11-11')).toEqual({
      startUtc: '2026-11-09T16:00:00.000Z',
      endUtc: '2026-11-11T15:59:59.999Z',
    });
  });
});

describe('voidSaleAction', () => {
  it('blocks staff before touching the database', async () => {
    requireOwnerAction.mockResolvedValue(notOwner);
    const res = await voidSaleAction({ saleId: SALE, reason: 'x' });
    expect(res.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a missing reason without calling the database', async () => {
    requireOwnerAction.mockResolvedValue(ownerOk);
    const res = await voidSaleAction({ saleId: SALE, reason: '' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('voids through void_sale and refreshes the pages', async () => {
    requireOwnerAction.mockResolvedValue(ownerOk);
    rpc.mockResolvedValue({ data: { success: true, sale_id: SALE }, error: null });
    const res = await voidSaleAction({ saleId: SALE, reason: ' Wrong item ' });
    expect(rpc).toHaveBeenCalledWith('void_sale', { p_sale_id: SALE, p_reason: 'Wrong item' });
    expect(res).toEqual({ ok: true, data: { saleId: SALE } });
    expect(revalidatePath).toHaveBeenCalledWith('/sales');
  });

  it('shows a friendly message for an already voided sale and hides unknown errors', async () => {
    requireOwnerAction.mockResolvedValue(ownerOk);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Conflict: this sale is already voided.' } });
    const a = await voidSaleAction({ saleId: SALE, reason: 'x' });
    expect(a.ok === false && a.error.message).toBe('This sale is already voided.');

    rpc.mockResolvedValueOnce({ data: null, error: { message: 'relation "secret" does not exist' } });
    const b = await voidSaleAction({ saleId: SALE, reason: 'x' });
    expect(b.ok === false && b.error.message).not.toContain('secret');
  });
});

describe('recordReplacementSaleAction', () => {
  it('blocks staff before touching the database', async () => {
    requireOwnerAction.mockResolvedValue(notOwner);
    const res = await recordReplacementSaleAction(replacement);
    expect(res.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('passes the original sale id to record_sale', async () => {
    requireOwnerAction.mockResolvedValue(ownerOk);
    rpc.mockResolvedValue({
      data: { success: true, duplicate: false, sale_id: 's2', total_centavos: 25000, flagged_products: [] },
      error: null,
    });
    const res = await recordReplacementSaleAction(replacement);
    expect(rpc).toHaveBeenCalledWith('record_sale', expect.objectContaining({ p_corrects_sale_id: SALE }));
    expect(res.ok).toBe(true);
  });
});

describe('recordSaleAction (normal sale)', () => {
  it('never sends a corrects id, even if the browser adds one', async () => {
    requireAuthAction.mockResolvedValue({ ok: true, data: { role: 'staff' } });
    rpc.mockResolvedValue({
      data: { success: true, duplicate: false, sale_id: 's1', total_centavos: 25000 },
      error: null,
    });
    await recordSaleAction({ ...replacement });
    const args = rpc.mock.calls[0][1];
    expect(args).not.toHaveProperty('p_corrects_sale_id');
  });
});

describe('saleErrorFor (void and replacement)', () => {
  it.each([
    ['Forbidden: Only the owner can void a sale.', 'FORBIDDEN'],
    ['Forbidden: Only the owner can record a replacement sale.', 'FORBIDDEN'],
    ['Invalid reason: a void reason is required (max 200 characters).', 'VALIDATION_ERROR'],
    ['Sale not found in current shop.', 'NOT_FOUND'],
    ['Conflict: only a voided sale can be replaced.', 'CONFLICT'],
    ['Conflict: this sale already has a replacement.', 'CONFLICT'],
  ])('maps "%s"', (message, code) => {
    expect(saleErrorFor(message).code).toBe(code);
  });
});
