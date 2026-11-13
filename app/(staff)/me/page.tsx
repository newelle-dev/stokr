import { requireStaffOrOwnerPage } from '@/lib/auth';
import { ProfileView } from '@/components/shell/profile-view';

export const dynamic = 'force-dynamic';

export default async function StaffProfilePage() {
  return <ProfileView user={await requireStaffOrOwnerPage()} />;
}
