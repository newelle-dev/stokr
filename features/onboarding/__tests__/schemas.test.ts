import { describe, it, expect } from 'vitest';
import { onboardingSchema } from '@/features/onboarding/schemas';

const product = {
  name: 'Mango Salt 30ml',
  category: 'liquid',
  sellingPrice: '₱450',
  costPrice: '210.50',
  lowStockThreshold: 5,
};

const valid = { shopName: 'Cloud Haven', branchName: 'Main', products: [product] };

describe('onboardingSchema', () => {
  it('accepts a shop with no products', () => {
    expect(onboardingSchema.safeParse({ ...valid, products: [] }).success).toBe(true);
  });

  it('rejects a blank shop name', () => {
    expect(onboardingSchema.safeParse({ ...valid, shopName: '   ' }).success).toBe(false);
  });

  it('rejects a branch name over 80 characters', () => {
    expect(onboardingSchema.safeParse({ ...valid, branchName: 'x'.repeat(81) }).success).toBe(false);
  });

  it('turns peso text into integer centavos', () => {
    const result = onboardingSchema.parse(valid);
    expect(result.products[0]?.sellingPrice).toBe(45000);
    expect(result.products[0]?.costPrice).toBe(21050);
  });

  it('rejects a selling price of zero', () => {
    const bad = { ...valid, products: [{ ...product, sellingPrice: '0' }] };
    expect(onboardingSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a price with three decimal places', () => {
    const bad = { ...valid, products: [{ ...product, costPrice: '12.345' }] };
    expect(onboardingSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects more than 50 products', () => {
    const many = Array.from({ length: 51 }, () => product);
    expect(onboardingSchema.safeParse({ ...valid, products: many }).success).toBe(false);
  });
});
