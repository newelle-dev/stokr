import { requireOwnerPage } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export const instant = false;

export const metadata = {
  title: 'Dashboard | Stokr',
  description: 'Owner management dashboard for Stokr.',
};

export default async function DashboardPage() {
  // Invariant: Mandatory page-level owner guard
  const user = await requireOwnerPage();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Owner Dashboard
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Welcome back, {user.fullName}. You have full owner permissions across all branches.
        </p>
      </div>

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--success)]/10 px-3 py-1 text-xs font-semibold text-[var(--success)] w-fit mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            Unit 2 Verified: Login & Roles
          </div>
          <CardTitle className="text-xl">Authentication & Role Routing Confirmed</CardTitle>
          <CardDescription>
            You are securely authenticated as an <strong>Owner</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
          <p>
            • <strong>Page Guards:</strong> Only active owner profiles can view this dashboard or other owner pages.
          </p>
          <p>
            • <strong>Next Milestone:</strong> Unit 3 will build branch and product catalog management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
