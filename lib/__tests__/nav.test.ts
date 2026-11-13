import { describe, it, expect } from 'vitest';
import {
  OWNER_TABS,
  MORE_SECTIONS,
  SIDEBAR_ITEMS,
  staffTabsFor,
  isActive,
  isMoreActive,
  parentRoute,
  headerTitle,
  isTabActive,
  profileHref,
  canPullRefresh,
  canSwipeBack,
} from '@/lib/nav';

describe('tabs', () => {
  it('owner bar has Dashboard, Sales, Stock, More', () => {
    expect(OWNER_TABS.map((t) => t.href)).toEqual(['/dashboard', '/sales', '/stock', '/more']);
  });

  it('More page groups Store operations and Store management', () => {
    expect(MORE_SECTIONS.map((s) => s.title)).toEqual(['Store operations', 'Store management']);
    expect(MORE_SECTIONS[0].items.map((i) => i.href)).toEqual([
      '/sell', '/products', '/stock/count', '/stock/opening',
    ]);
    expect(MORE_SECTIONS[1].items.map((i) => i.href)).toEqual(['/settings', '/team']);
    MORE_SECTIONS.flatMap((s) => s.items).forEach((i) => expect(i.description.length).toBeGreaterThan(0));
  });

  it('profile lives at /profile for owners and /me for staff', () => {
    expect(profileHref('owner')).toBe('/profile');
    expect(profileHref('staff')).toBe('/me');
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

  it('More is active on /more and its pages, not the dashboard', () => {
    expect(isMoreActive('/more')).toBe(true);
    expect(isTabActive('/team', '/more')).toBe(true);
    expect(isTabActive('/stock', '/stock')).toBe(true);
    expect(isMoreActive('/team')).toBe(true);
    expect(isMoreActive('/products')).toBe(true);
    expect(isMoreActive('/dashboard')).toBe(false);
  });
});

describe('parentRoute', () => {
  it.each([
    ['/products', '/more'],
    ['/team', '/more'],
    ['/settings', '/more'],
    ['/stock/opening', '/more'],
    ['/stock/count', '/more'],
    ['/stock/count/', '/more'],
    ['/profile', '/dashboard'],
    ['/me', '/sell'],
    ['/sales/replace/abc', '/sales'],
  ])('%s goes back to %s', (path, parent) => {
    expect(parentRoute(path)).toBe(parent);
  });

  it.each(['/dashboard', '/sales', '/stock', '/more', '/sell', '/my-sales', '/nope'])(
    '%s has no back arrow',
    (path) => {
      expect(parentRoute(path)).toBeNull();
    },
  );
});

describe('headerTitle', () => {
  it.each([
    ['/dashboard', 'Dashboard'],
    ['/sales', 'Sales'],
    ['/stock', 'Stock'],
    ['/more', 'More'],
    ['/sell', 'Sell'],
    ['/my-sales', 'My sales'],
    ['/profile', 'Profile'],
    ['/me', 'Profile'],
    ['/products', 'Products'],
    ['/team', 'Team & staff'],
    ['/settings', 'Settings'],
    ['/stock/opening', 'Opening stock'],
    ['/stock/count', 'Stock count'],
    ['/sales/replace/abc', 'Replacement sale'],
  ])('%s is titled %s', (path, title) => {
    expect(headerTitle(path)).toBe(title);
  });

  it('unknown routes have no title', () => {
    expect(headerTitle('/nope')).toBeNull();
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
