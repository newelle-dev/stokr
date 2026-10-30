'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireOwnerAction } from '@/lib/auth';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import {
  bulkOpeningStockSchema,
  restockInputSchema,
  adjustmentInputSchema,
  type BulkOpeningStockInput,
  type RestockInput,
  type AdjustmentInput,
} from './schemas';

export async function recordBulkOpeningStockAction(
  rawInput: BulkOpeningStockInput
): Promise<ActionResult<{ count: number }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;

  const parsed = bulkOpeningStockSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid opening stock data');
  }

  const supabase = await createClient();

  // Convert to DB payload (snake_case)
  const itemsPayload = parsed.data.items.map((item) => ({
    branch_id: item.branchId,
    product_id: item.productId,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc('record_bulk_opening_stock', {
    p_items: itemsPayload,
  });

  if (error) {
    if (error.message.includes('Opening stock has already been recorded')) {
      return errorResult(
        'ALREADY_RECORDED',
        error.message.replace(/.*?Opening stock has already been recorded/, 'Opening stock has already been recorded')
      );
    }
    return errorResult('DB_ERROR', error.message || 'Failed to record bulk opening stock.');
  }

  const res = data as { success: boolean; count: number };

  revalidatePath('/stock');
  revalidatePath('/stock/opening');

  return successResult({ count: res.count });
}

export async function recordRestockAction(
  rawInput: RestockInput
): Promise<ActionResult<{ movementId: string; quantity: number }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;

  const parsed = restockInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid restock data');
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('record_restock', {
    p_branch_id: parsed.data.branchId,
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
    p_new_cost_price_centavos: parsed.data.newCostPriceCentavos ?? undefined,
    p_note: parsed.data.note ?? undefined,
  });

  if (error) {
    return errorResult('DB_ERROR', error.message || 'Failed to record restock.');
  }

  const res = data as { success: boolean; movement_id: string; quantity: number };

  revalidatePath('/stock');
  revalidatePath('/products');

  return successResult({
    movementId: res.movement_id,
    quantity: res.quantity,
  });
}

export async function recordAdjustmentAction(
  rawInput: AdjustmentInput
): Promise<ActionResult<{ movementId: string; quantityChange: number }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;

  const parsed = adjustmentInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid adjustment data');
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('record_adjustment', {
    p_branch_id: parsed.data.branchId,
    p_product_id: parsed.data.productId,
    p_quantity_change: parsed.data.quantityChange,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note,
  });

  if (error) {
    return errorResult('DB_ERROR', error.message || 'Failed to record stock adjustment.');
  }

  const res = data as { success: boolean; movement_id: string; quantity_change: number };

  revalidatePath('/stock');

  return successResult({
    movementId: res.movement_id,
    quantityChange: res.quantity_change,
  });
}
