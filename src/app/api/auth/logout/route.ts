import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, clearSessionCookie, deleteSessionByToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  await deleteSessionByToken(token);

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
