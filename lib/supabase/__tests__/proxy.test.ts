import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '../proxy';

describe('updateSession / proxy route guard', () => {
  it('redirects unauthenticated users to /login on protected routes', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = await updateSession(req);

    expect(res.status).toBe(307); // NextResponse.redirect default status
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('allows access to public home page (/) without redirecting', async () => {
    const req = new NextRequest('http://localhost:3000/');
    const res = await updateSession(req);

    expect(res.headers.get('location')).toBeNull();
  });

  it('allows access to /login page without redirecting', async () => {
    const req = new NextRequest('http://localhost:3000/login');
    const res = await updateSession(req);

    expect(res.headers.get('location')).toBeNull();
  });
});
