import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { errorResult, successResult, type ActionResult } from './errors';
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
 * Invariant: Deactivated accounts (is_active = false) immediately return null
 * and are treated as logged out on every request.
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
 * Page-level guard for Server Components and Layouts under (owner).
 * If unauthenticated, redirects to /login.
 * If staff, redirects to /sell.
 */
export async function requireOwnerPage(): Promise<UserSessionProfile> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'owner') {
    redirect('/sell');
  }
  return user;
}

/**
 * Page-level guard for Server Components and Layouts under (staff).
 * If unauthenticated, redirects to /login.
 */
export async function requireStaffOrOwnerPage(): Promise<UserSessionProfile> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Server Action guard requiring an authenticated user.
 * Invariant: Server action guards return an ActionResult with error code; they do not throw.
 */
export async function requireAuthAction(): Promise<ActionResult<UserSessionProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return errorResult(
      'UNAUTHORIZED',
      'You must be signed in to perform this action.'
    );
  }
  return successResult(user);
}

/**
 * Server Action guard requiring an owner user.
 * Invariant: Server action guards return an ActionResult with error code; they do not throw.
 */
export async function requireOwnerAction(): Promise<ActionResult<UserSessionProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return errorResult(
      'UNAUTHORIZED',
      'You must be signed in to perform this action.'
    );
  }
  if (user.role !== 'owner') {
    return errorResult(
      'FORBIDDEN',
      'You do not have permission to perform this action.'
    );
  }
  return successResult(user);
}
