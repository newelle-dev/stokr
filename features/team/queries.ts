import { createClient } from '@/lib/supabase/server';
import { requireOwnerPage } from '@/lib/auth';
import type { TeamMemberItem } from './types';
import type { UserRole } from '@/lib/supabase/database.types';

export async function getTeamMembers(): Promise<{
  staffMembers: TeamMemberItem[];
  storeCode: string;
  branches: { id: string; name: string }[];
}> {
  const owner = await requireOwnerPage();
  const supabase = await createClient();

  // 1. Fetch store_code
  const { data: shop } = await supabase
    .from('shops')
    .select('store_code')
    .eq('id', owner.shopId)
    .single();

  // 2. Fetch active branches for dropdown assignment
  const { data: branchesData } = await supabase
    .from('branches')
    .select('id, name')
    .eq('shop_id', owner.shopId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  const branchMap = new Map<string, string>();
  if (branchesData) {
    for (const b of branchesData) {
      branchMap.set(b.id, b.name);
    }
  }

  // 3. Fetch all staff profiles in the shop
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name, username, role, branch_id, is_active, must_change_password, created_at')
    .eq('shop_id', owner.shopId)
    .eq('role', 'staff')
    .order('created_at', { ascending: false });

  const staffMembers: TeamMemberItem[] = (profilesData ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    username: p.username,
    role: p.role as UserRole,
    branchId: p.branch_id,
    branchName: p.branch_id ? branchMap.get(p.branch_id) ?? 'Unknown Branch' : null,
    isActive: p.is_active,
    mustChangePassword: p.must_change_password,
    createdAt: p.created_at,
  }));

  return {
    staffMembers,
    storeCode: shop?.store_code ?? '',
    branches: branchesData ?? [],
  };
}
