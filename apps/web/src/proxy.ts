import { type NextRequest, NextResponse } from 'next/server';
import { SANDBOX_COOKIE } from '@/lib/api/sandbox';

/**
 * Gives every browser its own sandbox before the first API call goes out. Doing it
 * here rather than in the API route avoids parallel first requests each minting a
 * different id.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.has(SANDBOX_COOKIE)) {
    response.cookies.set(SANDBOX_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|healthz).*)'],
};
