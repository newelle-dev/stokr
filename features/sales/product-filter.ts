/**
 * Filters the sell screen's product list by category and by search text. Pure logic, no React,
 * so the rules are unit tested. Both filters combine: a product must match both to show.
 */
import type { SellProduct } from './queries';

export const CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'device', label: 'Device' },
  { value: 'cartridge', label: 'Cartridge' },
  { value: 'other', label: 'Other' },
] as const;

export type CategoryFilter = (typeof CATEGORY_FILTERS)[number]['value'];

export function filterProducts(
  products: SellProduct[],
  category: CategoryFilter,
  query: string
): SellProduct[] {
  const needle = query.trim().toLowerCase();
  return products.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (needle && !p.name.toLowerCase().includes(needle)) return false;
    return true;
  });
}
