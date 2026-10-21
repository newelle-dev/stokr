import { describe, expect, it, vi, beforeEach } from 'vitest';
import { completePasswordChangeAction } from '../actions';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

interface MockUser {
  id: string;
  shopId: string;
  fullName?: string;
  username?: string | null;
  role: 'owner' | 'staff';
  branchId?: string | null;
  isActive?: boolean;
  mustChangePassword: boolean;
  email: string | null;
}

interface AuthErrorLike {
  message: string;
  status?: number;
  code?: string;
}

let mockUser: MockUser | null = null;
let mockUpdateUserError: AuthErrorLike | null = null;
let mockRpcError: { message: string } | null = null;
let rpcCalls: string[] = [];

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(async () => mockUser),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ error: mockUpdateUserError })),
    },
    rpc: vi.fn(async (funcName: string) => {
      rpcCalls.push(funcName);
      return { error: mockRpcError };
    }),
  })),
}));

describe('completePasswordChangeAction retry safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockUpdateUserError = null;
    mockRpcError = null;
    rpcCalls = [];
  });

  it('in forced mode, if updateUser returns same-password error, it still calls complete_password_change() and succeeds', async () => {
    mockUser = {
      id: 'staff-1',
      shopId: 'shop-1',
      role: 'staff',
      mustChangePassword: true,
      email: 'staff@example.com',
    };

    // Simulate GoTrue returning same-password error on retry
    mockUpdateUserError = {
      message: 'New password should be different from the old password.',
      status: 422,
    };

    const result = await completePasswordChangeAction({
      newPassword: 'BrandNewSecurePass123!',
      confirmPassword: 'BrandNewSecurePass123!',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.redirectTo).toBe('/sell');
    }
    expect(rpcCalls).toContain('complete_password_change');
  });

  it('in voluntary mode, if updateUser returns same-password error, it returns AUTH_ERROR', async () => {
    mockUser = {
      id: 'staff-1',
      shopId: 'shop-1',
      role: 'staff',
      mustChangePassword: false,
      email: 'staff@example.com',
    };

    mockUpdateUserError = {
      message: 'New password should be different from the old password.',
      status: 422,
    };

    const result = await completePasswordChangeAction({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'BrandNewSecurePass123!',
      confirmPassword: 'BrandNewSecurePass123!',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('AUTH_ERROR');
      expect(result.error.message).toMatch(/different from the old password/i);
    }
    expect(rpcCalls).not.toContain('complete_password_change');
  });
});
