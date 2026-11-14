// Single source of truth for phone and desktop navigation. Pure data and functions, no React.

export type NavIcon =
  | 'dashboard'
  | 'sales'
  | 'stock'
  | 'more'
  | 'sell'
  | 'mySales'
  | 'products'
  | 'team'
  | 'settings'
  | 'reports'
  | 'count'
  | 'opening'
  | 'profile'
  | 'about'
  | 'branches'
  | 'help'
  | 'shop';

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
}

export const OWNER_TABS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Sales', href: '/sales', icon: 'sales' },
  { label: 'Stock', href: '/stock', icon: 'stock' },
  { label: 'More', href: '/more', icon: 'more' },
];

export interface MoreItem extends NavItem {
  description: string;
}

export const MORE_SECTIONS: { title: string; items: MoreItem[] }[] = [
  {
    title: 'Store operations',
    items: [
      { label: 'Sell', href: '/sell', icon: 'sell', description: 'Record a sale at the counter' },
      { label: 'Products', href: '/products', icon: 'products', description: 'Your catalog, prices and categories' },
      { label: 'Stock count', href: '/stock/count', icon: 'count', description: 'Count shelves and fix differences' },
      { label: 'Opening stock', href: '/stock/opening', icon: 'opening', description: 'Enter starting quantities per branch' },
    ],
  },
  {
    title: 'Store management',
    items: [
      { label: 'Branches', href: '/branches', icon: 'branches', description: 'Branch locations and the store code' },
      { label: 'Team & staff', href: '/team', icon: 'team', description: 'Add staff and manage their access' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'About Stokr', href: '/about', icon: 'about', description: 'What Stokr is and how it works' },
      { label: 'Help', href: '/help', icon: 'help', description: 'How to sell, count stock and add staff' },
    ],
  },
];

export const SIDEBAR_ITEMS: (NavItem & { enabled: boolean; badge?: string })[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard', enabled: true },
  { label: 'Products', href: '/products', icon: 'products', enabled: true },
  { label: 'Team', href: '/team', icon: 'team', enabled: true },
  { label: 'Branches', href: '/branches', icon: 'branches', enabled: true },
  { label: 'Stock', href: '/stock', icon: 'stock', enabled: true },
  { label: 'Sales', href: '/sales', icon: 'sales', enabled: true },
  { label: 'Reports', href: '#', icon: 'reports', enabled: false, badge: 'Unit 5' },
];

// Pages the phone reaches through More. Tablets (md to lg) have the sidebar and no tab bar, so the sidebar lists these too.
export const TABLET_EXTRA_ITEMS: NavItem[] = [
  { label: 'Sell', href: '/sell', icon: 'sell' },
  { label: 'Stock count', href: '/stock/count', icon: 'count' },
  { label: 'Opening stock', href: '/stock/opening', icon: 'opening' },
  { label: 'Shop details', href: '/shop', icon: 'shop' },
  { label: 'About Stokr', href: '/about', icon: 'about' },
  { label: 'Help', href: '/help', icon: 'help' },
];

// Same bar for staff and owners: owners use /me too, so opening Profile from Sell keeps the Sell tab bar.
export const STAFF_TABS: NavItem[] = [
  { label: 'Sell', href: '/sell', icon: 'sell' },
  { label: 'My sales', href: '/my-sales', icon: 'mySales' },
  { label: 'Profile', href: '/me', icon: 'profile' },
];

function normalize(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function isActive(pathname: string, href: string): boolean {
  const path = normalize(pathname);
  return path === href || path.startsWith(href + '/');
}

const MORE_ROUTES = ['/more', '/products', '/team', '/branches', '/shop', '/about', '/help'];

export function isMoreActive(pathname: string): boolean {
  return MORE_ROUTES.some((route) => isActive(pathname, route)) || parentRoute(pathname) === '/more';
}

// On a More page only the More tab is highlighted, even for sub-pages whose path starts like a tab (/stock/count).
export function isTabActive(pathname: string, href: string): boolean {
  if (href === '/more') return isMoreActive(pathname);
  return !isMoreActive(pathname) && isActive(pathname, href);
}

// Fixed parent per sub-page, so back works after a refresh or deep link (no history needed).
const SUB_PAGES: { prefix: string; parent: string; title: string }[] = [
  { prefix: '/products', parent: '/more', title: 'Products' },
  { prefix: '/team', parent: '/more', title: 'Team & staff' },
  { prefix: '/branches', parent: '/more', title: 'Branches' },
  { prefix: '/shop', parent: '/more', title: 'Shop details' },
  { prefix: '/about', parent: '/more', title: 'About Stokr' },
  { prefix: '/help', parent: '/more', title: 'Help' },
  { prefix: '/stock/opening', parent: '/more', title: 'Opening stock' },
  { prefix: '/stock/count', parent: '/more', title: 'Stock count' },
  { prefix: '/profile', parent: '/dashboard', title: 'Profile' },
  { prefix: '/sales/replace', parent: '/sales', title: 'Replacement sale' },
];

function subPage(pathname: string) {
  return SUB_PAGES.find((p) => isActive(pathname, p.prefix));
}

export function parentRoute(pathname: string): string | null {
  return subPage(pathname)?.parent ?? null;
}

const TOP_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales',
  '/stock': 'Stock',
  '/more': 'More',
  '/sell': 'Sell',
  '/my-sales': 'My sales',
  '/me': 'Profile',
};

export function headerTitle(pathname: string): string | null {
  return subPage(pathname)?.title ?? TOP_TITLES[normalize(pathname)] ?? null;
}

const PULL_REFRESH_ROUTES = ['/dashboard', '/sales', '/my-sales', '/stock'];

// Exact match only: form pages such as /stock/count must never refresh by pulling.
export function canPullRefresh(pathname: string): boolean {
  return PULL_REFRESH_ROUTES.includes(normalize(pathname));
}

// Read-only sub-pages only: swiping back must never discard typed input.
const SWIPE_BACK_ROUTES = ['/products', '/team', '/branches', '/shop', '/about', '/help'];

export function canSwipeBack(pathname: string): boolean {
  return SWIPE_BACK_ROUTES.includes(normalize(pathname));
}
