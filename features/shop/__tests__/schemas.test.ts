import { describe, it, expect } from 'vitest';
import { updateShopNameSchema } from '../schemas';

describe('updateShopNameSchema', () => {
  it('trims the shop name', () => {
    expect(updateShopNameSchema.parse({ name: '  Cloud Haven  ' }).name).toBe('Cloud Haven');
  });

  it('rejects a blank name', () => {
    expect(updateShopNameSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rejects a name over 80 characters', () => {
    expect(updateShopNameSchema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false);
  });
});
