'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireOwnerAction } from '@/lib/auth';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import {
  saveStockCountSchema,
  stockCountIdSchema,
  type SaveStockCountInput,
} from './schemas';

// Friendly text for the rules the database enforces; anything else stays generic.
function dbMessage(message: string, fallback: string): string {
  if (message.includes('already has an open count')) {
    return 'This branch already has an open count. Accept or cancel it first.';
  }
  if (message.includes('This count is already')) {
    return 'This count was already accepted or cancelled. Refresh the page.';
  }
  if (message.includes('not found or is inactive')) {
    return 'A branch or product in this count is no longer active. Reload and try again.';
  }
  return fallback;
}

function refresh() {
  revalidatePath('/stock');
  revalidatePath('/stock/count');
  revalidatePath('/dashboard');
}

export async function saveStockCountAction(
  rawInput: SaveStockCountInput
): Promise<ActionResult<{ countId: string; itemCount: number }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;

  const parsed = saveStockCountSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid stock count');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('save_stock_count', {
    p_branch_id: parsed.data.branchId,
    p_note: parsed.data.note ?? '',
    p_items: parsed.data.items.map((i) => ({ product_id: i.productId, counted_qty: i.countedQty })),
  });
  if (error) return errorResult('DB_ERROR', dbMessage(error.message, 'Could not save the count.'));

  const res = data as { stock_count_id: string; item_count: number };
  refresh();
  return successResult({ countId: res.stock_count_id, itemCount: res.item_count });
}

export async function acceptStockCountAction(
  rawInput: { countId: string }
): Promise<ActionResult<{ corrections: number; missingUnits: number }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;

  const parsed = stockCountIdSchema.safeParse(rawInput);
  if (!parsed.success) return errorResult('VALIDATION_ERROR', 'Invalid count');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_stock_count', { p_count_id: parsed.data.countId });
  if (error) return errorResult('DB_ERROR', dbMessage(error.message, 'Could not accept the count.'));

  const res = data as { corrections: number; missing_units: number };
  refresh();
  return successResult({ corrections: res.corrections, missingUnits: res.missing_units });
}

export async function cancelStockCountAction(rawInput: { countId: string }): Promise<ActionResult<null>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;

  const parsed = stockCountIdSchema.safeParse(rawInput);
  if (!parsed.success) return errorResult('VALIDATION_ERROR', 'Invalid count');

  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_stock_count', { p_count_id: parsed.data.countId });
  if (error) return errorResult('DB_ERROR', dbMessage(error.message, 'Could not cancel the count.'));

  refresh();
  return successResult(null);
}
