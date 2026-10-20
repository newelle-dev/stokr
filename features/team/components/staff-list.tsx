'use client';

import * as React from 'react';
import {
  UserPlus,
  KeyRound,
  Store,
  Copy,
  Check,
  Ban,
  Users,
  MapPin,
  Clock,
} from 'lucide-react';
import type { TeamMemberItem } from '../types';
import { Button } from '@/components/ui/button';
import { CreateStaffModal } from './create-staff-modal';
import { ResetPasswordModal } from './reset-password-modal';
import { DeactivateStaffModal } from './deactivate-staff-modal';
import { ReassignBranchModal } from './reassign-branch-modal';

interface StaffListProps {
  staffMembers: TeamMemberItem[];
  storeCode: string;
  branches: { id: string; name: string }[];
}

export function StaffList({
  staffMembers,
  storeCode,
  branches,
}: StaffListProps) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [resetStaff, setResetStaff] = React.useState<TeamMemberItem | null>(null);
  const [deactivateStaff, setDeactivateStaff] = React.useState<TeamMemberItem | null>(null);
  const [reassignStaff, setReassignStaff] = React.useState<TeamMemberItem | null>(null);
  const [copiedStoreCode, setCopiedStoreCode] = React.useState(false);

  const handleCopyStoreCode = async () => {
    try {
      await navigator.clipboard.writeText(storeCode);
      setCopiedStoreCode(true);
      setTimeout(() => setCopiedStoreCode(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const activeStaff = staffMembers.filter((s) => s.isActive);
  const inactiveStaff = staffMembers.filter((s) => !s.isActive);

  return (
    <div className="space-y-6">
      {/* Store Code Informational Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted)]/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10 text-[var(--primary)]">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              Store Code: <span className="font-mono">{storeCode}</span>
            </h4>
            <p className="text-xs text-[var(--muted-foreground)]">
              Staff enter this store code and their username on the login screen.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyStoreCode}
          className="h-8 gap-1.5 self-start sm:self-auto text-xs"
        >
          {copiedStoreCode ? (
            <>
              <Check className="h-3.5 w-3.5 text-[var(--success)]" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Store Code</span>
            </>
          )}
        </Button>
      </div>

      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            Staff Accounts ({activeStaff.length} Active)
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage who can log in to record sales at your shop branches.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={branches.length === 0}
          className="flex items-center gap-1.5 self-start sm:self-auto font-medium"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Staff Member</span>
        </Button>
      </div>

      {branches.length === 0 && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-3.5 text-sm text-[var(--foreground)]"
        >
          You must have at least one active branch before adding staff members. Please configure branches in Settings.
        </div>
      )}

      {activeStaff.length === 0 && inactiveStaff.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-12 text-center">
          <Users className="h-10 w-10 text-[var(--muted-foreground)]/60 mb-2" />
          <h4 className="font-semibold text-[var(--foreground)]">No staff accounts yet</h4>
          <p className="text-sm text-[var(--muted-foreground)] mt-1 max-w-sm">
            Create staff accounts so your team can log sales on their phones.
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            disabled={branches.length === 0}
          >
            <UserPlus className="h-4 w-4" />
            <span>Add First Staff Account</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeStaff.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-[var(--foreground)] text-base">
                          {staff.fullName}
                        </h4>
                        <span className="font-mono text-xs text-[var(--muted-foreground)]">
                          @{staff.username}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-medium shrink-0 bg-[var(--success)]/10 text-[var(--success)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                        Active
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 text-xs rounded-[var(--radius-sm)] bg-[var(--muted)] px-2 py-0.5 text-[var(--foreground)]">
                        <MapPin className="h-3 w-3 text-[var(--muted-foreground)]" />
                        <span>{staff.branchName ?? 'Unassigned'}</span>
                      </span>

                      {staff.mustChangePassword && (
                        <span className="inline-flex items-center gap-1 text-[11px] rounded-[var(--radius-sm)] bg-[var(--warning)]/15 px-2 py-0.5 font-medium text-[var(--warning)]">
                          <Clock className="h-3 w-3" />
                          <span>Password Change Required</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-1 border-t border-[var(--border)]/60 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReassignStaff(staff)}
                      className="h-8 gap-1 text-xs"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Branch</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResetStaff(staff)}
                      className="h-8 gap-1 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/10"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Reset Password</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeactivateStaff(staff)}
                      className="h-8 gap-1 text-xs text-[var(--destructive)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Deactivate</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]/20 p-6 text-center text-sm text-[var(--muted-foreground)]">
              No active staff accounts.
            </div>
          )}

          {/* Deactivated Staff Members */}
          {inactiveStaff.length > 0 && (
            <div className="pt-4 border-t border-[var(--border)] space-y-3">
              <h4 className="text-sm font-semibold text-[var(--muted-foreground)]">
                Deactivated Staff ({inactiveStaff.length})
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {inactiveStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted)]/20 p-4 opacity-75"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-[var(--foreground)] text-base line-through decoration-[var(--muted-foreground)]">
                          {staff.fullName}
                        </h4>
                        <span className="font-mono text-xs text-[var(--muted-foreground)]">
                          @{staff.username}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)]" />
                        Deactivated
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-[var(--muted-foreground)]">
                      <span>Branch: {staff.branchName ?? 'Unassigned'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateStaffModal
        branches={branches}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <ResetPasswordModal
        staff={resetStaff}
        storeCode={storeCode}
        isOpen={!!resetStaff}
        onClose={() => setResetStaff(null)}
      />
      <DeactivateStaffModal
        staff={deactivateStaff}
        isOpen={!!deactivateStaff}
        onClose={() => setDeactivateStaff(null)}
      />
      <ReassignBranchModal
        staff={reassignStaff}
        branches={branches}
        isOpen={!!reassignStaff}
        onClose={() => setReassignStaff(null)}
      />
    </div>
  );
}
