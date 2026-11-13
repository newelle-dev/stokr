// Single source of truth for phone and desktop navigation. Pure data and functions, no React.

export type NavIcon =
  | 'dashboard'
  | 'sales'
  | 'stock'
  | 'more'
  | 'sell'
  | 'mySales'
  | 'owner'
  | 'products'
  | 'team'
  | 'settings'
  | 'reports';

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
}

export const OWNER_TABS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Sales', href: '/sales', icon: 'sales' },
  { label: 'Stock', href: '/stock', icon: 'stock' },
];

export const MORE_ITEMS: NavItem[] = [
  { label: 'Sell', href: '/sell', icon: 'sell' },
  { label: 'Products', href: '/products', icon: 'products' },
  { label: 'Team', href: '/team', icon: 'team' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

export const SIDEBAR_ITEMS: (NavItem & { enabled: boolean; badge?: string })[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard', enabled: true },
  { label: 'Products', href: '/products', icon: 'products', enabled: true },
  { label: 'Team', href: '/team', icon: 'team', enabled: true },
  { label: 'Settings', href: '/settings', icon: 'settings', enabled: true },
  { label: 'Stock', href: '/stock', icon: 'stock', enabled: true },
  { label: 'Sales', href: '/sales', icon: 'sales', enabled: true },
  { label: 'Reports', href: '#', icon: 'reports', enabled: false, badge: 'Unit 5' },
];

export function staffTabsFor(role: 'owner' | 'staff'): NavItem[] {
  const tabs: NavItem[] = [
    { label: 'Sell', href: '/sell', icon: 'sell' },
    { label: 'My sales', href: '/my-sales', icon: 'mySales' },
  ];
  if (role === 'owner') tabs.push({ label: 'Owner', href: '/dashboard', icon: 'owner' });
  return tabs;
}

function normalize(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function isActive(pathname: string, href: string): boolean {
  const path = normalize(pathname);
  return path === href || path.startsWith(href + '/');
}

const MORE_ROUTES = ['/products', '/team', '/settings'];

export function isMoreActive(pathname: string): boolean {
  return MORE_ROUTES.some((route) => isActive(pathname, route));
}

// Fixed parent per sub-page, so back works after a refresh or deep link (no history needed).
const SUB_PAGES: { prefix: string; parent: string; title: string }[] = [
  { prefix: '/products', parent: '/dashboard', title: 'Products' },
  { prefix: '/team', parent: '/dashboard', title: 'Team' },
  { prefix: '/settings', parent: '/dashboard', title: 'Settings' },
  { prefix: '/stock/opening', parent: '/stock', title: 'Opening stock' },
  { prefix: '/stock/count', parent: '/stock', title: 'Stock count' },
  { prefix: '/sales/replace', parent: '/sales', title: 'Replacement sale' },
];

function subPage(pathname: string) {
  return SUB_PAGES.find((p) => isActive(pathname, p.prefix));
}

export function parentRoute(pathname: string): string | null {
  return subPage(pathname)?.parent ?? null;
}

export function pageTitle(pathname: string): string | null {
  return subPage(pathname)?.title ?? null;
}

const PULL_REFRESH_ROUTES = ['/dashboard', '/sales', '/my-sales', '/stock'];

// Exact match only: form pages such as /stock/count must never refresh by pulling.
export function canPullRefresh(pathname: string): boolean {
  return PULL_REFRESH_ROUTES.includes(normalize(pathname));
}

// Read-only sub-pages only: swiping back must never discard typed input.
const SWIPE_BACK_ROUTES = ['/products', '/team', '/settings'];

export function canSwipeBack(pathname: string): boolean {
  return SWIPE_BACK_ROUTES.includes(normalize(pathname));
}
