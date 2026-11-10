import { z } from 'zod';

export const PAYMENT_METHODS = ['cash', 'gcash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const recordSaleInputSchema = z.object({
  branchId: z.string().uuid('Please select a branch'),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: 'Choose Cash or GCash' }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Please select a product'),
        quantity: z
          .number()
          .int('Quantity must be a whole number')
          .min(1, 'Quantity must be at least 1')
          .max(1000, 'Maximum 1,000 per item'),
      })
    )
    .min(1, 'Add at least one item')
    .max(50, 'A sale can have at most 50 items'),
  clientRequestId: z.string().trim().min(1, 'Missing request id').max(100),
});

export type RecordSaleInput = z.infer<typeof recordSaleInputSchema>;
