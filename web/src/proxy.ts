import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session';
export function proxy(request: NextRequest) {
  if (!request.cookies.has(ACCESS_COOKIE) && !request.cookies.has(REFRESH_COOKIE)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
export const config = { matcher: ['/app/:path*', '/onboarding/:path*'] };
