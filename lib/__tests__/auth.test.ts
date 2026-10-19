import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getCurrentUser,
  requireAuthAction,
  requireOwnerAction,
  requireOwnerPage,
  requireStaffOrOwnerPage,
} from '../auth';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

// Mock Supabase server client
let mockUser: { id: string; email: string } | null = null;
let mockProfile: {
  id: string;
  shop_id: string;
  full_name: string;
  role: 'owner' | 'staff';
  branch_id: string | null;
  is_active: boolean;
} | null = null;
let mockAuthError: Error | null = null;
let mockProfileError: Error | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockUser },
        error: mockAuthError,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: mockProfile,
            error: mockProfileError,
          })),
        })),
      })),
    })),
  })),
}));

describe('lib/auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockProfile = null;
    mockAuthError = null;
    mockProfileError = null;
  });

  describe('getCurrentUser', () => {
    it('returns null when unauthenticated', async () => {
      mockUser = null;
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('returns null when profile is inactive (immediate lockout)', async () => {
      mockUser = { id: 'user-1', email: 'staff@shop.local' };
      mockProfile = {
        id: 'user-1',
        shop_id: 'shop-1',
        full_name: 'Deactivated Staff',
        role: 'staff',
        branch_id: 'branch-1',
        is_active: false,
      };

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('returns user session profile when authenticated and active', async () => {
      mockUser = { id: 'owner-1', email: 'owner@shop.local' };
      mockProfile = {
        id: 'owner-1',
        shop_id: 'shop-1',
        full_name: 'Shop Owner',
        role: 'owner',
        branch_id: null,
        is_active: true,
      };

      const user = await getCurrentUser();
      expect(user).toEqual({
        id: 'owner-1',
        shopId: 'shop-1',
        fullName: 'Shop Owner',
        role: 'owner',
        branchId: null,
        isActive: true,
        email: 'owner@shop.local',
      });
    });
  });

  describe('requireAuthAction', () => {
    it('returns UNAUTHORIZED ActionResult when unauthenticated (does not throw)', async () => {
      mockUser = null;
      const result = await requireAuthAction();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('returns success ActionResult when active user', async () => {
      mockUser = { id: 'staff-1', email: 'staff@shop.local' };
      mockProfile = {
        id: 'staff-1',
        shop_id: 'shop-1',
        full_name: 'Active Staff',
        role: 'staff',
        branch_id: 'branch-1',
        is_active: true,
      };

      const result = await requireAuthAction();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('staff-1');
      }
    });
  });

  describe('requireOwnerAction', () => {
    it('returns UNAUTHORIZED when unauthenticated (does not throw)', async () => {
      mockUser = null;
      const result = await requireOwnerAction();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('returns FORBIDDEN when user is staff (does not throw)', async () => {
      mockUser = { id: 'staff-1', email: 'staff@shop.local' };
      mockProfile = {
        id: 'staff-1',
        shop_id: 'shop-1',
        full_name: 'Active Staff',
        role: 'staff',
        branch_id: 'branch-1',
        is_active: true,
      };

      const result = await requireOwnerAction();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('returns success when user is owner', async () => {
      mockUser = { id: 'owner-1', email: 'owner@shop.local' };
      mockProfile = {
        id: 'owner-1',
        shop_id: 'shop-1',
        full_name: 'Shop Owner',
        role: 'owner',
        branch_id: null,
        is_active: true,
      };

      const result = await requireOwnerAction();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.role).toBe('owner');
      }
    });
  });

  describe('requireOwnerPage', () => {
    it('redirects to /login when unauthenticated', async () => {
      mockUser = null;
      await expect(requireOwnerPage()).rejects.toThrow('REDIRECT:/login');
    });

    it('redirects to /sell when user is staff', async () => {
      mockUser = { id: 'staff-1', email: 'staff@shop.local' };
      mockProfile = {
        id: 'staff-1',
        shop_id: 'shop-1',
        full_name: 'Active Staff',
        role: 'staff',
        branch_id: 'branch-1',
        is_active: true,
      };

      await expect(requireOwnerPage()).rejects.toThrow('REDIRECT:/sell');
    });

    it('returns profile when user is owner', async () => {
      mockUser = { id: 'owner-1', email: 'owner@shop.local' };
      mockProfile = {
        id: 'owner-1',
        shop_id: 'shop-1',
        full_name: 'Shop Owner',
        role: 'owner',
        branch_id: null,
        is_active: true,
      };

      const user = await requireOwnerPage();
      expect(user.role).toBe('owner');
    });
  });

  describe('requireStaffOrOwnerPage', () => {
    it('redirects to /login when unauthenticated', async () => {
      mockUser = null;
      await expect(requireStaffOrOwnerPage()).rejects.toThrow('REDIRECT:/login');
    });

    it('returns profile for staff user', async () => {
      mockUser = { id: 'staff-1', email: 'staff@shop.local' };
      mockProfile = {
        id: 'staff-1',
        shop_id: 'shop-1',
        full_name: 'Active Staff',
        role: 'staff',
        branch_id: 'branch-1',
        is_active: true,
      };

      const user = await requireStaffOrOwnerPage();
      expect(user.role).toBe('staff');
    });
  });
});
