import { createClient } from '@/lib/supabase/server';
import { requireOwnerPage } from '@/lib/auth';
import type { BranchItem } from './types';

export async function getOwnerBranches(): Promise<{
  branches: BranchItem[];
  storeCode: string;
  shopName: string;
}> {
  const owner = await requireOwnerPage();
  const supabase = await createClient();

  // 1. Get shop info
  const { data: shop } = await supabase
    .from('shops')
    .select('name, store_code')
    .eq('id', owner.shopId)
    .single();

  // 2. Get branches
  const { data: branchesData, error: branchesErr } = await supabase
    .from('branches')
    .select('id, shop_id, name, is_active, created_at')
    .eq('shop_id', owner.shopId)
    .order('created_at', { ascending: true });

  if (branchesErr || !branchesData) {
    return {
      branches: [],
      storeCode: shop?.store_code ?? '',
      shopName: shop?.name ?? 'My Shop',
    };
  }

  // 3. Get active staff counts per branch
  const { data: activeStaff } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('shop_id', owner.shopId)
    .eq('role', 'staff')
    .eq('is_active', true);

  const staffCountByBranch = new Map<string, number>();
  if (activeStaff) {
    for (const staff of activeStaff) {
      if (staff.branch_id) {
        staffCountByBranch.set(
          staff.branch_id,
          (staffCountByBranch.get(staff.branch_id) ?? 0) + 1
        );
      }
    }
  }

  const branches: BranchItem[] = branchesData.map((b) => ({
    id: b.id,
    shopId: b.shop_id,
    name: b.name,
    isActive: b.is_active,
    createdAt: b.created_at,
    activeStaffCount: staffCountByBranch.get(b.id) ?? 0,
  }));

  return {
    branches,
    storeCode: shop?.store_code ?? '',
    shopName: shop?.name ?? 'My Shop',
  };
}
