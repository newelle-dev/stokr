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
    .min(1, 'Selling price must be at least ₱0.01')
    .max(100_000_000, 'Selling price cannot exceed ₱1,000,000.00'),
  costPriceCentavos: z
    .number()
    .int('Cost price must be an integer in centavos')
    .min(0, 'Cost price cannot be negative')
    .max(100_000_000, 'Cost price cannot exceed ₱1,000,000.00'),
  lowStockThreshold: z
    .number()
    .int('Threshold must be an integer')
    .min(0, 'Threshold cannot be negative')
    .max(100_000, 'Threshold cannot exceed 100,000')
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
    .min(1, 'Selling price must be at least ₱0.01')
    .max(100_000_000, 'Selling price cannot exceed ₱1,000,000.00'),
  costPriceCentavos: z
    .number()
    .int('Cost price must be an integer in centavos')
    .min(0, 'Cost price cannot be negative')
    .max(100_000_000, 'Cost price cannot exceed ₱1,000,000.00'),
  lowStockThreshold: z
    .number()
    .int('Threshold must be an integer')
    .min(0, 'Threshold cannot be negative')
    .max(100_000, 'Threshold cannot exceed 100,000'),
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
