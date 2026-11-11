'use server';

import { createClient } from '@/lib/supabase/server';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import { onboardingSchema, type OnboardingInput } from './schemas';

export interface CreateShopResultData {
  redirectTo: string;
  storeCode: string;
}

/**
 * Creates the signed-in user's shop, first branch, owner profile and optional
 * products through the create_shop_for_new_owner database function.
 * Input is validated here and again by the function (trust boundary).
 */
export async function createShopAction(
  rawInput: OnboardingInput
): Promise<ActionResult<CreateShopResultData>> {
  const parsed = onboardingSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue ? firstIssue.message : 'Please check the form');
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return errorResult('UNAUTHORIZED', 'Please sign in again to set up your shop.');
  }

  // shortcut: untyped rpc until lib/supabase/database.types.ts is regenerated after the migration is applied; then use supabase.rpc directly
  const rpcUntyped = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data: storeCode, error } = await rpcUntyped('create_shop_for_new_owner', {
    p_shop_name: parsed.data.shopName,
    p_branch_name: parsed.data.branchName,
    p_products: parsed.data.products.map((product) => ({
      name: product.name,
      category: product.category,
      sellingPrice: product.sellingPrice,
      costPrice: product.costPrice,
      lowStockThreshold: product.lowStockThreshold,
    })),
  });

  if (error) {
    if (error.message.includes('already_onboarded')) {
      return errorResult('ALREADY_ONBOARDED', 'This account already has a shop.');
    }
    return errorResult('DB_ERROR', 'Could not set up your shop. Please try again.');
  }

  return successResult({ redirectTo: '/dashboard', storeCode: String(storeCode) });
}
