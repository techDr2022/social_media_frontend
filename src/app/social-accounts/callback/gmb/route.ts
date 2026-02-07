import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    console.log("[GMB Callback] Received params:", {
      code: code ? `${code.substring(0, 20)}...` : null,
      state: state || null,
      allParams: Object.fromEntries(searchParams.entries()),
    });

    // Handle OAuth errors
    if (error) {
      console.error('[GMB Callback] OAuth error:', error);
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
      return NextResponse.redirect(`${frontendUrl}/connect/gmb?error=${encodeURIComponent(error)}`);
    }

    // Validate required parameters
    if (!code) {
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
      return NextResponse.redirect(
        `${frontendUrl}/connect/gmb?error=${encodeURIComponent("Invalid OAuth callback - missing code")}`
      );
    }

    if (!state) {
      console.warn("[GMB Callback] Warning: state parameter is missing.");
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
      return NextResponse.redirect(
        `${frontendUrl}/connect/gmb?error=${encodeURIComponent("Invalid OAuth callback - missing state")}`
      );
    }

    // Use NEXT_PUBLIC_API_URL if available, otherwise fallback to other env vars or localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    // Backend uses /api/v1 prefix (set in main.ts)
    // Build callback URL with code and state (both required for GMB)
    const callbackUrl = `${cleanBackendUrl}/api/v1/social-accounts/callback/gmb?code=${code}&state=${state}`;

    console.log("[GMB Callback] Proxying to backend:", callbackUrl);

    try {
      const response = await fetch(callbackUrl, {
        method: "GET",
        redirect: "manual",
      });

      // Backend should return a redirect to the frontend
      if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.get("location");
        if (redirectUrl) {
          console.log("[GMB Callback] Backend redirected to:", redirectUrl);
          return NextResponse.redirect(redirectUrl);
        }
      }

      // If backend returns a redirect in the response
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        console.log("[GMB Callback] Backend redirected to:", redirectUrl);
        return NextResponse.redirect(redirectUrl);
      }

      // If we get here, something went wrong
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[GMB Callback] Unexpected response:", response.status, errorText);
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
      return NextResponse.redirect(
        `${frontendUrl}/connect/gmb?error=${encodeURIComponent("OAuth callback failed")}`
      );
    } catch (fetchError: any) {
      console.error("[GMB Callback] Fetch error:", fetchError);
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
      return NextResponse.redirect(
        `${frontendUrl}/connect/gmb?error=${encodeURIComponent(`Failed to connect to backend: ${fetchError.message}`)}`
      );
    }
  } catch (error: any) {
    console.error("[GMB Callback] Error:", error);
    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
    return NextResponse.redirect(
      `${frontendUrl}/connect/gmb?error=${encodeURIComponent(error.message || "Internal server error")}`
    );
  }
}
