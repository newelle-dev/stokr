'use server';

import { createClient } from '@/lib/supabase/server';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import { onboardingSchema, type OnboardingInput } from './schemas';

export interface CreateShopResultData {
  redirectTo: string;
  storeCode: string;
}

/**
 * Sets the signed-in user's new password, then creates their shop, first branch
 * and owner profile through the create_shop_for_new_owner database function.
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

  // Only a user with no profile may set up a shop. Check before touching the
  // password: this action is callable by any signed-in user, and a voluntary
  // password change elsewhere requires the current password.
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError) {
    return errorResult('DB_ERROR', 'Could not set up your shop. Please try again.');
  }
  if (existingProfile) {
    return errorResult('ALREADY_ONBOARDED', 'This account already has a shop.');
  }

  // Password first: if shop creation then fails, a retry hits the same-password
  // error below, which is safe to ignore. The other order could leave a shop
  // behind with the temporary password still active.
  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  const isSamePassword =
    passwordError &&
    (passwordError.message.toLowerCase().includes('different from the old password') ||
      (passwordError as { code?: string }).code === 'same_password');
  if (passwordError && !isSamePassword) {
    return errorResult('AUTH_ERROR', 'Could not set your password. Please try again.');
  }

  // shortcut: untyped rpc until lib/supabase/database.types.ts is regenerated after the migration is applied; then use supabase.rpc directly
  const rpcUntyped = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data: storeCode, error } = await rpcUntyped('create_shop_for_new_owner', {
    p_shop_name: parsed.data.shopName,
    p_branch_name: parsed.data.branchName,
    p_products: [],
  });

  if (error) {
    if (error.message.includes('already_onboarded')) {
      return errorResult('ALREADY_ONBOARDED', 'This account already has a shop.');
    }
    return errorResult('DB_ERROR', 'Could not set up your shop. Please try again.');
  }

  return successResult({ redirectTo: '/dashboard', storeCode: String(storeCode) });
}
