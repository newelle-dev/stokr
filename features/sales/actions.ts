'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuthAction } from '@/lib/auth';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import { recordSaleInputSchema } from './schemas';
import { saleErrorFor } from './sale-errors';

export type RecordSaleResult = {
  saleId: string;
  totalCentavos: number;
  isDuplicate: boolean;
  flaggedProducts: string[];
};

export async function recordSaleAction(rawInput: unknown): Promise<ActionResult<RecordSaleResult>> {
  const authCheck = await requireAuthAction();
  if (!authCheck.ok) return authCheck;

  // Input comes from the browser, so it is checked here, not trusted
  const parsed = recordSaleInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid sale data');
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('record_sale', {
    p_branch_id: parsed.data.branchId,
    p_payment_method: parsed.data.paymentMethod,
    p_items: parsed.data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_client_request_id: parsed.data.clientRequestId,
  });

  if (error) {
    // Logged on the server only; the shop worker sees the friendly message
    console.error('record_sale failed:', error.message);
    const mapped = saleErrorFor(error.message);
    return errorResult(mapped.code, mapped.message);
  }

  const res = data as {
    sale_id: string;
    total_centavos: number;
    duplicate: boolean;
    flagged_products?: string[];
  };

  revalidatePath('/my-sales');

  return successResult({
    saleId: res.sale_id,
    totalCentavos: res.total_centavos,
    isDuplicate: res.duplicate,
    flaggedProducts: res.flagged_products ?? [],
  });
}
