import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import {
  createAuthSessionDb,
  createAuthUserDb,
  deleteAuthSessionByTokenHashDb,
  deleteExpiredAuthSessionsDb,
  getAuthSessionWithUserByTokenHashDb,
  getAuthUserByEmailDb,
  hasAuthUsersDb,
} from '@/lib/db';
import { AuthUser } from '@/types';

const scryptAsync = promisify(scrypt);

export const AUTH_COOKIE_NAME = 'marnagement_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algo, salt, digest] = storedHash.split(':');
  if (algo !== 'scrypt' || !salt || !digest) return false;

  const expected = Buffer.from(digest, 'hex');
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function createUserAccount(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const userId = randomBytes(16).toString('hex');

  await createAuthUserDb({
    id: userId,
    email,
    passwordHash,
    name: input.name?.trim() || '',
  });

  return {
    id: userId,
    email,
    name: input.name?.trim() || '',
    role: 'user',
  };
}

export async function createUserSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  if (Math.random() < 0.1) {
    await deleteExpiredAuthSessionsDb();
  }

  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await createAuthSessionDb({
    id: randomBytes(16).toString('hex'),
    userId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}

function toSafeUser(user: { id: string; email: string; name: string; role: string }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    role: user.role || 'user',
  };
}

export async function authenticateWithEmailPassword(email: string, password: string): Promise<AuthUser | null> {
  const user = await getAuthUserByEmailDb(normalizeEmail(email));
  if (!user) return null;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  return toSafeUser(user);
}

export async function canSelfRegister(): Promise<boolean> {
  const hasUsers = await hasAuthUsersDb();
  if (!hasUsers) return true;
  return process.env.AUTH_ALLOW_SIGNUP === 'true';
}

export async function getAuthUserFromToken(token: string | null | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  const result = await getAuthSessionWithUserByTokenHashDb(hashToken(token));
  if (!result) return null;
  return toSafeUser(result.user);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return getAuthUserFromToken(token);
}

export async function getCurrentUserFromRequest(request: NextRequest | Request): Promise<AuthUser | null> {
  const token =
    request instanceof NextRequest
      ? request.cookies.get(AUTH_COOKIE_NAME)?.value
      : getCookieValue(request.headers.get('cookie'), AUTH_COOKIE_NAME);

  return getAuthUserFromToken(token);
}

export async function deleteSessionByToken(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await deleteAuthSessionByTokenHashDb(hashToken(token));
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }
  return null;
}
