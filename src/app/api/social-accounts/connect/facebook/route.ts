import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
    
    console.log(`[Facebook Connect API] Proxying to: ${backendUrl}/social-accounts/connect/facebook`);
    
    let response;
    try {
      // Follow redirects manually to get the OAuth URL
      response = await fetch(`${backendUrl}/social-accounts/connect/facebook`, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
        redirect: "manual", // Don't follow redirects automatically
      });
    } catch (fetchError: any) {
      console.error('[Facebook Connect API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to connect to backend: ${fetchError.message}. Is the backend running on ${backendUrl}?` },
        { status: 503 }
      );
    }

    // If backend returns a redirect (302/301), extract the location header
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        console.log('[Facebook Connect API] Redirecting to:', redirectUrl);
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
    console.error('[Facebook Connect API] Unexpected response:', response.status, errorText);
    return NextResponse.json(
      { error: `Unexpected response from backend (${response.status}): ${errorText}` },
      { status: response.status || 500 }
    );
  } catch (error: any) {
    console.error('Facebook connect API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

