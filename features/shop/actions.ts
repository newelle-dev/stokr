'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireOwnerAction } from '@/lib/auth';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import { updateShopNameSchema, type UpdateShopNameInput } from './schemas';

// RLS (shops_update_owner) is the real guard; requireOwnerAction keeps the error message clear.
export async function updateShopNameAction(
  rawInput: UpdateShopNameInput
): Promise<ActionResult<{ name: string }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = updateShopNameSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid shop name');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('shops')
    .update({ name: parsed.data.name })
    .eq('id', owner.shopId);

  if (error) return errorResult('DB_ERROR', 'Failed to save the shop name. Please try again.');

  revalidatePath('/shop');
  revalidatePath('/more');

  return successResult({ name: parsed.data.name });
}
