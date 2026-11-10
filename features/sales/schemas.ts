import { z } from 'zod';

export const PAYMENT_METHODS = ['cash', 'gcash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const recordSaleInputSchema = z.object({
  branchId: z.string().guid('Please select a branch'),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: 'Choose Cash or GCash' }),
  items: z
    .array(
      z.object({
        productId: z.string().guid('Please select a product'),
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

export const voidSaleInputSchema = z.object({
  saleId: z.string().guid('Invalid sale'),
  reason: z.string().trim().min(1, 'Enter a reason for the void').max(200, 'Reason can be at most 200 characters'),
});

export type VoidSaleInput = z.infer<typeof voidSaleInputSchema>;

export const replacementSaleInputSchema = recordSaleInputSchema.extend({
  correctsSaleId: z.string().guid('Invalid original sale'),
});

export type ReplacementSaleInput = z.infer<typeof replacementSaleInputSchema>;

export const SALE_STATUSES = ['completed', 'voided'] as const;

const manilaDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-10');

// Owner sales list filters. Dates are Asia/Manila days; all fields optional (date defaults to today in the query).
export const ownerSalesFilterSchema = z.object({
  from: manilaDate.optional(),
  to: manilaDate.optional(),
  branchId: z.string().guid().optional(),
  staffId: z.string().guid().optional(),
  status: z.enum(SALE_STATUSES).optional(),
  page: z.number().int().min(1).max(10000).default(1),
});

export type OwnerSalesFilter = z.input<typeof ownerSalesFilterSchema>;
