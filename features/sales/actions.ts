'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuthAction, requireOwnerAction } from '@/lib/auth';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import {
  recordSaleInputSchema,
  replacementSaleInputSchema,
  voidSaleInputSchema,
  type RecordSaleInput,
} from './schemas';
import { saleErrorFor } from './sale-errors';

export type RecordSaleResult = {
  saleId: string;
  totalCentavos: number;
  isDuplicate: boolean;
  flaggedProducts: string[];
};

// Calls record_sale for already-validated input. correctsSaleId is set only for the owner's replacement sale.
async function callRecordSale(
  input: RecordSaleInput,
  correctsSaleId?: string
): Promise<ActionResult<RecordSaleResult>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('record_sale', {
    p_branch_id: input.branchId,
    p_payment_method: input.paymentMethod,
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_client_request_id: input.clientRequestId,
    ...(correctsSaleId ? { p_corrects_sale_id: correctsSaleId } : {}),
  });

  if (error) {
    // Logged on the server only; the user sees the friendly message
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
  revalidatePath('/sales');

  return successResult({
    saleId: res.sale_id,
    totalCentavos: res.total_centavos,
    isDuplicate: res.duplicate,
    flaggedProducts: res.flagged_products ?? [],
  });
}

export async function recordSaleAction(rawInput: unknown): Promise<ActionResult<RecordSaleResult>> {
  const authCheck = await requireAuthAction();
  if (!authCheck.ok) return authCheck;

  // Input comes from the browser, so it is checked here, not trusted
  const parsed = recordSaleInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid sale data');
  }

  return callRecordSale(parsed.data);
}

/** Owner only: records a replacement for a voided sale. The database keeps the original seller as sold_by. */
export async function recordReplacementSaleAction(
  rawInput: unknown
): Promise<ActionResult<RecordSaleResult>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;

  const parsed = replacementSaleInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid sale data');
  }

  const { correctsSaleId, ...sale } = parsed.data;
  return callRecordSale(sale, correctsSaleId);
}

/** Owner only: voids a sale with a reason. Stock returns inside the database function. */
export async function voidSaleAction(rawInput: unknown): Promise<ActionResult<{ saleId: string }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;

  const parsed = voidSaleInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid void request');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('void_sale', {
    p_sale_id: parsed.data.saleId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    console.error('void_sale failed:', error.message);
    const mapped = saleErrorFor(error.message);
    return errorResult(mapped.code, mapped.message);
  }

  revalidatePath('/my-sales');
  revalidatePath('/sales');
  revalidatePath('/stock');

  return successResult({ saleId: parsed.data.saleId });
}
