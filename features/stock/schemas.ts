import { z } from 'zod';
import { ADJUSTMENT_REASONS } from './types';

export const bulkOpeningStockItemSchema = z.object({
  branchId: z.uuid('Invalid branch identifier'),
  productId: z.uuid('Invalid product identifier'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(100000, 'Maximum quantity is 100,000'),
});

export const bulkOpeningStockSchema = z.object({
  items: z
    .array(bulkOpeningStockItemSchema)
    .min(1, 'At least one product opening stock entry is required'),
});

export type BulkOpeningStockInput = z.infer<typeof bulkOpeningStockSchema>;

export const restockInputSchema = z.object({
  branchId: z.uuid('Please select a branch'),
  productId: z.uuid('Please select a product'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(100000, 'Maximum quantity is 100,000'),
  newCostPriceCentavos: z
    .number()
    .int('Cost price must be an integer number of centavos')
    .min(0, 'Cost price cannot be negative')
    .optional()
    .nullable(),
  note: z
    .string()
    .trim()
    .max(500, 'Note cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export type RestockInput = z.infer<typeof restockInputSchema>;

export const adjustmentReasonEnum = z.enum(ADJUSTMENT_REASONS);

export const adjustmentInputSchema = z.object({
  branchId: z.uuid('Please select a branch'),
  productId: z.uuid('Please select a product'),
  quantityChange: z
    .number()
    .int('Adjustment quantity must be a whole integer')
    .refine((val) => val !== 0, {
      message: 'Adjustment quantity cannot be 0',
    })
    .refine((val) => val >= -100000 && val <= 100000, {
      message: 'Adjustment quantity must be between -100,000 and 100,000',
    }),
  reason: adjustmentReasonEnum,
  note: z
    .string()
    .trim()
    .min(3, 'Adjustment explanation note is required (minimum 3 characters)')
    .max(500, 'Note cannot exceed 500 characters'),
});

export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>;
