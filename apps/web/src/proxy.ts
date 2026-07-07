import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/pricing',
  '/features',
  '/solutions',
  '/about',
  '/blog',
  '/webinar',
  '/terms',
  '/privacy',
  '/contact',
  '/join',   // ← public attendee join page — no login required
];

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('zonvo_access_token')?.value;
  const isAuthenticated = !!token;

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/'),
  );

  const isAuthPath = AUTH_PATHS.some((path) => pathname === path);

  // Logged-in user trying to access auth pages → redirect to dashboard
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protected route without token → redirect to login
  if (!isPublicPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default proxy;


export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
