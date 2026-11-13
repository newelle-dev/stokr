import { describe, expect, it, vi, beforeEach } from 'vitest';

class Redirected extends Error {
  constructor(public to: string) {
    super(to);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));

let sessionUser: { role: 'owner' | 'staff'; mustChangePassword: boolean } | null = null;
let authUser: { id: string } | null = null;
let profileRow: { id: string } | null = null;

vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => sessionUser }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authUser } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profileRow }) }) }),
    }),
  }),
}));

import HomePage from '@/app/page';

async function target(): Promise<string> {
  try {
    await HomePage();
  } catch (e) {
    if (e instanceof Redirected) return e.to;
    throw e;
  }
  return 'no redirect';
}

describe('HomePage role dispatcher', () => {
  beforeEach(() => {
    sessionUser = null;
    authUser = null;
    profileRow = null;
  });

  it('sends a logged-out visitor to /login', async () => {
    expect(await target()).toBe('/login');
  });

  it('sends a signed-in user with no profile to /onboarding (no redirect loop)', async () => {
    authUser = { id: 'u1' };
    expect(await target()).toBe('/onboarding');
  });

  it('sends a signed-in user with an inactive profile to /login', async () => {
    authUser = { id: 'u1' };
    profileRow = { id: 'u1' };
    expect(await target()).toBe('/login');
  });

  it('sends an active owner to /dashboard and active staff to /sell', async () => {
    sessionUser = { role: 'owner', mustChangePassword: false };
    expect(await target()).toBe('/dashboard');
    sessionUser = { role: 'staff', mustChangePassword: false };
    expect(await target()).toBe('/sell');
  });
});
