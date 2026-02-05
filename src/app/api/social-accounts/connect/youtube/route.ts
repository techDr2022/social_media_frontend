import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error('[YouTube Connect API] No authorization header');
      return NextResponse.json(
        { error: "Unauthorized - No authorization header" },
        { status: 401 }
      );
    }

    // Use NEXT_PUBLIC_API_URL if available, otherwise fallback to other env vars or localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    // Backend uses /api/v1 prefix (set in main.ts)
    const targetUrl = `${cleanBackendUrl}/api/v1/social-accounts/connect/youtube`;
    
    console.log(`[YouTube Connect API] Starting request`);
    console.log(`[YouTube Connect API] Backend URL: ${cleanBackendUrl}`);
    console.log(`[YouTube Connect API] Target URL: ${targetUrl}`);
    console.log(`[YouTube Connect API] Has auth header: ${!!authHeader}`);
    
    let response;
    try {
      // Follow redirects manually to get the OAuth URL
      response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        redirect: "manual", // Don't follow redirects automatically
      });
      
      console.log(`[YouTube Connect API] Backend response status: ${response.status}`);
      console.log(`[YouTube Connect API] Backend response headers:`, Object.fromEntries(response.headers.entries()));
    } catch (fetchError: any) {
      console.error('[YouTube Connect API] Fetch error caught:', fetchError);
      console.error('[YouTube Connect API] Error name:', fetchError.name);
      console.error('[YouTube Connect API] Error message:', fetchError.message);
      console.error('[YouTube Connect API] Error stack:', fetchError.stack);
      
      // Return a more helpful error
      const errorMessage = fetchError.message || 'Unknown error';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED');
      
      return NextResponse.json(
        { 
          error: isNetworkError 
            ? `Cannot connect to backend at ${cleanBackendUrl}. Make sure: 1) Backend is running, 2) NEXT_PUBLIC_API_URL is correct, 3) No firewall blocking. Error: ${errorMessage}`
            : `Backend request failed: ${errorMessage}`
        },
        { status: 503 }
      );
    }

    // If backend returns a redirect (302/301), extract the location header
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        console.log('[YouTube Connect API] Redirecting to:', redirectUrl);
        // Return JSON with URL so frontend can handle the redirect
        return NextResponse.json({ url: redirectUrl, redirectUrl });
      }
    }

    // If backend returns JSON with a URL
    if (response.ok) {
      try {
        const data = await response.json();
        if (data?.url || data?.redirectUrl) {
          return NextResponse.redirect(data.url || data.redirectUrl);
        }
      } catch (jsonError) {
        // If not JSON, might be a redirect
        const redirectUrl = response.headers.get("location");
        if (redirectUrl) {
          return NextResponse.redirect(redirectUrl);
        }
      }
    }

    // If we get here, something went wrong
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('[YouTube Connect API] Unexpected response:', response.status, errorText);
    return NextResponse.json(
      { error: `Unexpected response from backend (${response.status}): ${errorText}` },
      { status: response.status || 500 }
    );
  } catch (error: any) {
    console.error('YouTube connect API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
