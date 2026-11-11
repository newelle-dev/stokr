import { z } from 'zod';
import { parseMoneyInput } from '@/lib/money';

// Peso text (e.g. "₱1,234.50") becomes integer centavos; invalid text becomes an issue.
function pesosToCentavos(fieldName: string, minCentavos: number) {
  return z.string().transform((value, ctx) => {
    const result = parseMoneyInput(value, { minCentavos, fieldName });
    if (!result.success) {
      ctx.addIssue({ code: 'custom', message: result.error });
      return z.NEVER;
    }
    return result.centavos;
  });
}

export const onboardingProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(80, 'Product name is too long'),
  category: z.enum(['liquid', 'device', 'cartridge', 'other']),
  sellingPrice: pesosToCentavos('Selling price', 1),
  costPrice: pesosToCentavos('Cost price', 0),
  lowStockThreshold: z.coerce
    .number()
    .int('Low-stock threshold must be a whole number')
    .min(0)
    .max(10000),
});

export const onboardingSchema = z.object({
  shopName: z.string().trim().min(1, 'Shop name is required').max(80, 'Shop name is too long'),
  branchName: z.string().trim().min(1, 'Branch name is required').max(80, 'Branch name is too long'),
  products: z.array(onboardingProductSchema).max(50, 'Add at most 50 products at setup'),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingParsed = z.output<typeof onboardingSchema>;
