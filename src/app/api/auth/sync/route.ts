import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth Sync API Route
 * 
 * Proxies authentication sync request to backend
 * This route runs server-side to avoid CORS issues
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Get backend URL from environment
    // In development, Next.js rewrite handles /api/* -> backend
    // In production, we call backend directly
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    const isLocalhost = !apiUrl || apiUrl.includes('localhost');
    
    let syncUrl: string;
    
    if (isLocalhost) {
      // In development with rewrite: /api/auth/sync -> http://localhost:3000/api/v1/auth/sync
      // But since rewrite already handles /api/*, we can use relative path
      // However, to be safe, we'll call backend directly
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const cleanBackendUrl = backendUrl.replace(/\/$/, '');
      syncUrl = `${cleanBackendUrl}/api/v1/auth/sync`;
    } else {
      // In production, call backend directly
      const cleanBackendUrl = apiUrl.replace(/\/$/, '');
      syncUrl = `${cleanBackendUrl}/api/v1/auth/sync`;
    }

    // Proxy request to backend
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Backend sync failed: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: errorText || 'Backend sync failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Auth sync proxy error:', error);
    
    // Handle timeout
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Backend sync timeout - backend may be unreachable' },
        { status: 504 }
      );
    }

    // Handle network errors
    if (error.message?.includes('fetch') || error.message?.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Backend unreachable - check if backend is running' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
