import { z } from 'zod';

// guid(): accepts the all-zero seed ids too (see tracker, Unit 6 open item 4)
export const saveStockCountSchema = z.object({
  branchId: z.guid('Please select a branch'),
  note: z.string().trim().max(500, 'Note cannot exceed 500 characters').optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.guid('Invalid product'),
        countedQty: z
          .number()
          .int('Counted quantity must be a whole number')
          .min(0, 'Counted quantity cannot be negative')
          .max(100000, 'Maximum quantity is 100,000'),
      })
    )
    .min(1, 'Enter a count for at least one product')
    .max(500, 'At most 500 products per count')
    .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, {
      message: 'A product appears twice in this count',
    }),
});
export type SaveStockCountInput = z.infer<typeof saveStockCountSchema>;

export const stockCountIdSchema = z.object({ countId: z.guid('Invalid count') });
