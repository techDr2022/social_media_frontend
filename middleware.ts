import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // For upload routes, we need to allow large bodies
  // The route handler will process it
  if (request.nextUrl.pathname.startsWith('/api/youtube/upload')) {
    // Let it pass through to the route handler
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};














