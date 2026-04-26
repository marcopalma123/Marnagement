import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateWithEmailPassword,
  createUserSession,
  setSessionCookie,
} from '@/lib/auth';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return badRequest('Invalid JSON body');

    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    const user = await authenticateWithEmailPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const { token, expiresAt } = await createUserSession(user.id);
    const response = NextResponse.json({ user });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
