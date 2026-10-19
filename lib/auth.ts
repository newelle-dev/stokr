import { createClient } from './supabase/server';
import type { UserRole } from './supabase/database.types';

export interface UserSessionProfile {
  id: string;
  shopId: string;
  fullName: string;
  role: UserRole;
  branchId: string | null;
  isActive: boolean;
  email: string | null;
}

/**
 * Retrieves the currently authenticated user and their active shop profile.
 * Returns null if unauthenticated or profile is inactive.
 */
export async function getCurrentUser(): Promise<UserSessionProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, shop_id, full_name, role, branch_id, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    return null;
  }

  return {
    id: profile.id,
    shopId: profile.shop_id,
    fullName: profile.full_name,
    role: profile.role,
    branchId: profile.branch_id,
    isActive: profile.is_active,
    email: user.email ?? null,
  };
}

/**
 * Requires an active owner session. Throws an error if unauthorized.
 */
export async function requireOwner(): Promise<UserSessionProfile> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'owner') {
    throw new Error('Unauthorized: Owner access required.');
  }
  return user;
}

/**
 * Requires an active staff or owner session. Throws an error if unauthorized.
 */
export async function requireStaffOrOwner(): Promise<UserSessionProfile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }
  return user;
}
