import { requireStaffOrOwnerPage } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export const instant = false;

export const metadata = {
  title: 'Sell | Stokr',
  description: 'Fast mobile sales counter for Stokr staff.',
};

export default async function SellPage() {
  const user = await requireStaffOrOwnerPage();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Sales Counter
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Logged in as {user.fullName} ({user.role})
        </p>
      </div>

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--success)]/10 px-3 py-1 text-xs font-semibold text-[var(--success)] w-fit mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            Unit 2 Verified: Staff Role Home
          </div>
          <CardTitle className="text-lg">Staff Home Page Verified</CardTitle>
          <CardDescription>
            You are securely authenticated and landed on the staff counter page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--muted-foreground)]">
          <p>
            • <strong>Branch Security:</strong> Staff members are locked to their assigned branch.
          </p>
          <p>
            • <strong>Next Milestone:</strong> Unit 5 will build the fast, multi-item counter interface for recording sales.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
