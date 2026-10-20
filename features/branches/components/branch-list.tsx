'use client';

import * as React from 'react';
import { Plus, Edit2, Ban, CheckCircle2, Store, Users } from 'lucide-react';
import type { BranchItem } from '../types';
import { reactivateBranchAction } from '../actions';
import { Button } from '@/components/ui/button';
import { CreateBranchModal } from './create-branch-modal';
import { RenameBranchModal } from './rename-branch-modal';
import { DeactivateBranchModal } from './deactivate-branch-modal';

interface BranchListProps {
  branches: BranchItem[];
}

export function BranchList({ branches }: BranchListProps) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingBranch, setEditingBranch] = React.useState<BranchItem | null>(null);
  const [deactivatingBranch, setDeactivatingBranch] = React.useState<BranchItem | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleReactivate = async (branchId: string) => {
    setActionError(null);
    setIsProcessing(true);
    try {
      const result = await reactivateBranchAction({ id: branchId });
      if (!result.ok) {
        setActionError(result.error.message);
      }
    } catch {
      setActionError('Failed to reactivate branch.');
    } finally {
      setIsProcessing(false);
    }
  };

  const activeBranches = branches.filter((b) => b.isActive);
  const inactiveBranches = branches.filter((b) => !b.isActive);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Branch Locations
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your shop&apos;s physical branches and store points.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 self-start sm:self-auto font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>Add Branch</span>
        </Button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)] font-medium"
        >
          {actionError}
        </div>
      )}

      {/* Active Branches */}
      <div className="grid gap-3 sm:grid-cols-2">
        {activeBranches.map((branch) => (
          <div
            key={branch.id}
            className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xs hover:border-[var(--primary)]/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--foreground)]">
                    {branch.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {branch.activeStaffCount} active staff member
                      {branch.activeStaffCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--success)]/10 px-2 py-0.5 text-xs font-medium text-[var(--success)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                Active
              </span>
            </div>

            <div className="mt-4 flex items-center justify-end gap-1 border-t border-[var(--border)]/60 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingBranch(branch)}
                className="h-8 gap-1 text-xs"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Rename</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeactivatingBranch(branch)}
                className="h-8 gap-1 text-xs text-[var(--destructive)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Deactivate</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Inactive Branches (if any) */}
      {inactiveBranches.length > 0 && (
        <div className="pt-4 border-t border-[var(--border)] space-y-3">
          <h4 className="text-sm font-semibold text-[var(--muted-foreground)]">
            Deactivated Branches ({inactiveBranches.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {inactiveBranches.map((branch) => (
              <div
                key={branch.id}
                className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted)]/40 p-4 opacity-80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-[var(--foreground)] line-through decoration-[var(--muted-foreground)]">
                        {branch.name}
                      </h5>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Deactivated
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--border)]/60 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleReactivate(branch.id)}
                    className="h-8 gap-1 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                    <span>Reactivate</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateBranchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <RenameBranchModal
        branch={editingBranch}
        isOpen={!!editingBranch}
        onClose={() => setEditingBranch(null)}
      />
      <DeactivateBranchModal
        branch={deactivatingBranch}
        isOpen={!!deactivatingBranch}
        onClose={() => setDeactivatingBranch(null)}
      />
    </div>
  );
}
