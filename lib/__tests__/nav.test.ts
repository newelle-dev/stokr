import { describe, it, expect } from 'vitest';
import {
  OWNER_TABS,
  MORE_ITEMS,
  SIDEBAR_ITEMS,
  staffTabsFor,
  isActive,
  isMoreActive,
  parentRoute,
  pageTitle,
  canPullRefresh,
  canSwipeBack,
} from '@/lib/nav';

describe('tabs', () => {
  it('owner bar has Dashboard, Sales, Stock (More is rendered by the shell)', () => {
    expect(OWNER_TABS.map((t) => t.label)).toEqual(['Dashboard', 'Sales', 'Stock']);
  });

  it('More holds Sell, Products, Team, Settings', () => {
    expect(MORE_ITEMS.map((t) => t.href)).toEqual(['/sell', '/products', '/team', '/settings']);
  });

  it('desktop sidebar keeps its seven entries with Reports disabled', () => {
    expect(SIDEBAR_ITEMS.map((t) => t.label)).toEqual([
      'Dashboard', 'Products', 'Team', 'Settings', 'Stock', 'Sales', 'Reports',
    ]);
    expect(SIDEBAR_ITEMS.find((t) => t.label === 'Reports')?.enabled).toBe(false);
  });

  it('staff never get an owner-only link', () => {
    expect(staffTabsFor('staff').map((t) => t.href)).toEqual(['/sell', '/my-sales']);
  });

  it('owner in the staff view also gets the Owner tab', () => {
    expect(staffTabsFor('owner').map((t) => t.href)).toEqual(['/sell', '/my-sales', '/dashboard']);
  });
});

describe('isActive', () => {
  it('matches the route itself and nested routes', () => {
    expect(isActive('/sales', '/sales')).toBe(true);
    expect(isActive('/stock/count', '/stock')).toBe(true);
  });

  it('does not match a route that only shares a prefix', () => {
    expect(isActive('/salesforce', '/sales')).toBe(false);
  });

  it('More is active under products, team and settings only', () => {
    expect(isMoreActive('/team')).toBe(true);
    expect(isMoreActive('/products')).toBe(true);
    expect(isMoreActive('/dashboard')).toBe(false);
  });
});

describe('parentRoute', () => {
  it.each([
    ['/products', '/dashboard'],
    ['/team', '/dashboard'],
    ['/settings', '/dashboard'],
    ['/stock/opening', '/stock'],
    ['/stock/count', '/stock'],
    ['/stock/count/', '/stock'],
    ['/sales/replace/abc', '/sales'],
  ])('%s goes back to %s', (path, parent) => {
    expect(parentRoute(path)).toBe(parent);
  });

  it.each(['/dashboard', '/sales', '/stock', '/sell', '/my-sales', '/nope'])(
    '%s has no back arrow',
    (path) => {
      expect(parentRoute(path)).toBeNull();
    },
  );
});

describe('pageTitle', () => {
  it.each([
    ['/products', 'Products'],
    ['/team', 'Team'],
    ['/settings', 'Settings'],
    ['/stock/opening', 'Opening stock'],
    ['/stock/count', 'Stock count'],
    ['/sales/replace/abc', 'Replacement sale'],
  ])('%s is titled %s', (path, title) => {
    expect(pageTitle(path)).toBe(title);
  });

  it('top-level routes have no sub-page title', () => {
    expect(pageTitle('/dashboard')).toBeNull();
  });
});

describe('gesture permissions', () => {
  it.each(['/dashboard', '/sales', '/my-sales', '/stock'])('pull-to-refresh on %s', (p) => {
    expect(canPullRefresh(p)).toBe(true);
  });

  it.each(['/stock/count', '/stock/opening', '/sales/replace/abc', '/sell', '/products'])(
    'no pull-to-refresh on %s',
    (p) => {
      expect(canPullRefresh(p)).toBe(false);
    },
  );

  it.each(['/products', '/team', '/settings'])('swipe-back on %s', (p) => {
    expect(canSwipeBack(p)).toBe(true);
  });

  it.each(['/stock/count', '/stock/opening', '/sales/replace/abc', '/sell', '/dashboard'])(
    'no swipe-back on %s',
    (p) => {
      expect(canSwipeBack(p)).toBe(false);
    },
  );
});
