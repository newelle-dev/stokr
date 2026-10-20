'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireOwnerAction } from '@/lib/auth';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import {
  createProductSchema,
  updateProductSchema,
  toggleProductActiveSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type ToggleProductActiveInput,
} from './schemas';
import type { ProductItem } from './types';
import type { ProductCategory } from '@/lib/supabase/database.types';

export async function createProductAction(
  rawInput: CreateProductInput
): Promise<ActionResult<ProductItem>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = createProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid product data');
  }

  const supabase = await createClient();

  const { data: newProduct, error: insertErr } = await supabase
    .from('products')
    .insert({
      shop_id: owner.shopId,
      name: parsed.data.name,
      category: parsed.data.category,
      selling_price_centavos: parsed.data.sellingPriceCentavos,
      cost_price_centavos: parsed.data.costPriceCentavos,
      low_stock_threshold: parsed.data.lowStockThreshold,
      is_active: true,
    })
    .select('id, shop_id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold, is_active, created_at')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505' || insertErr.message.includes('uq_products_shop_name_ci')) {
      return errorResult(
        'DUPLICATE_PRODUCT',
        'A product with this name already exists in your shop.'
      );
    }
    return errorResult('DB_ERROR', 'Failed to create product. Please try again.');
  }

  revalidatePath('/products');

  return successResult({
    id: newProduct.id,
    shopId: newProduct.shop_id,
    name: newProduct.name,
    category: newProduct.category as ProductCategory,
    sellingPriceCentavos: newProduct.selling_price_centavos,
    costPriceCentavos: newProduct.cost_price_centavos,
    lowStockThreshold: newProduct.low_stock_threshold,
    isActive: newProduct.is_active,
    createdAt: newProduct.created_at,
  });
}

export async function updateProductAction(
  rawInput: UpdateProductInput
): Promise<ActionResult<ProductItem>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = updateProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid product data');
  }

  const supabase = await createClient();

  const { data: updatedProduct, error: updateErr } = await supabase
    .from('products')
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      selling_price_centavos: parsed.data.sellingPriceCentavos,
      cost_price_centavos: parsed.data.costPriceCentavos,
      low_stock_threshold: parsed.data.lowStockThreshold,
    })
    .eq('id', parsed.data.id)
    .eq('shop_id', owner.shopId)
    .select('id, shop_id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold, is_active, created_at')
    .single();

  if (updateErr) {
    if (updateErr.code === '23505' || updateErr.message.includes('uq_products_shop_name_ci')) {
      return errorResult(
        'DUPLICATE_PRODUCT',
        'A product with this name already exists in your shop.'
      );
    }
    return errorResult('DB_ERROR', 'Failed to update product. Please try again.');
  }

  revalidatePath('/products');

  return successResult({
    id: updatedProduct.id,
    shopId: updatedProduct.shop_id,
    name: updatedProduct.name,
    category: updatedProduct.category as ProductCategory,
    sellingPriceCentavos: updatedProduct.selling_price_centavos,
    costPriceCentavos: updatedProduct.cost_price_centavos,
    lowStockThreshold: updatedProduct.low_stock_threshold,
    isActive: updatedProduct.is_active,
    createdAt: updatedProduct.created_at,
  });
}

export async function toggleProductActiveAction(
  rawInput: ToggleProductActiveInput
): Promise<ActionResult<{ id: string; isActive: boolean }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = toggleProductActiveSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', 'Invalid product data');
  }

  const supabase = await createClient();

  const { error: toggleErr } = await supabase
    .from('products')
    .update({ is_active: parsed.data.isActive })
    .eq('id', parsed.data.id)
    .eq('shop_id', owner.shopId);

  if (toggleErr) {
    return errorResult('DB_ERROR', 'Failed to change product status. Please try again.');
  }

  revalidatePath('/products');

  return successResult({
    id: parsed.data.id,
    isActive: parsed.data.isActive,
  });
}
