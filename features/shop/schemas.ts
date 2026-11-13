import { z } from 'zod';

export const updateShopNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Shop name is required')
    .max(80, 'Shop name is too long'),
});

export type UpdateShopNameInput = z.infer<typeof updateShopNameSchema>;
