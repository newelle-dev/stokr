import { z } from 'zod';

export const productCategoryEnum = z.enum(['liquid', 'device', 'cartridge', 'other']);

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(100, 'Product name cannot exceed 100 characters'),
  category: productCategoryEnum,
  sellingPriceCentavos: z
    .number()
    .int('Selling price must be an integer in centavos')
    .min(0, 'Selling price cannot be negative'),
  costPriceCentavos: z
    .number()
    .int('Cost price must be an integer in centavos')
    .min(0, 'Cost price cannot be negative'),
  lowStockThreshold: z
    .number()
    .int('Threshold must be an integer')
    .min(0, 'Threshold cannot be negative')
    .default(5),
});

export const updateProductSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(100, 'Product name cannot exceed 100 characters'),
  category: productCategoryEnum,
  sellingPriceCentavos: z
    .number()
    .int('Selling price must be an integer in centavos')
    .min(0, 'Selling price cannot be negative'),
  costPriceCentavos: z
    .number()
    .int('Cost price must be an integer in centavos')
    .min(0, 'Cost price cannot be negative'),
  lowStockThreshold: z
    .number()
    .int('Threshold must be an integer')
    .min(0, 'Threshold cannot be negative'),
});

export const productIdSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

export const toggleProductActiveSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
  isActive: z.boolean(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductIdInput = z.infer<typeof productIdSchema>;
export type ToggleProductActiveInput = z.infer<typeof toggleProductActiveSchema>;
