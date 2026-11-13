import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Menu,
  ShoppingBag,
  Receipt,
  Package,
  Users,
  Settings,
  BarChart3,
  ClipboardCheck,
  PackagePlus,
  User,
} from 'lucide-react';
import type { NavIcon } from '@/lib/nav';

export const NAV_ICONS: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  sales: ShoppingCart,
  stock: Boxes,
  more: Menu,
  sell: ShoppingBag,
  mySales: Receipt,
  owner: LayoutDashboard,
  products: Package,
  team: Users,
  settings: Settings,
  reports: BarChart3,
  count: ClipboardCheck,
  opening: PackagePlus,
  profile: User,
};
