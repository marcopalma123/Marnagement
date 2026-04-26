import { NextRequest, NextResponse } from 'next/server';
import {
  canSelfRegister,
  createUserAccount,
  createUserSession,
  setSessionCookie,
} from '@/lib/auth';
import { getAuthUserByEmailDb } from '@/lib/db';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return badRequest('Invalid JSON body');

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    if (password.length < 10) {
      return badRequest('Password must be at least 10 characters');
    }

    const signupAllowed = await canSelfRegister();
    if (!signupAllowed) {
      return NextResponse.json(
        { error: 'Sign-up is disabled. Set AUTH_ALLOW_SIGNUP=true to allow new registrations.' },
        { status: 403 }
      );
    }

    const existing = await getAuthUserByEmailDb(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const user = await createUserAccount({ name, email, password });
    const { token, expiresAt } = await createUserSession(user.id);

    const response = NextResponse.json({ user });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
