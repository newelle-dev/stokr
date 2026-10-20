import type { UserRole } from '@/lib/supabase/database.types';

export interface TeamMemberItem {
  id: string;
  fullName: string;
  username: string | null;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}
