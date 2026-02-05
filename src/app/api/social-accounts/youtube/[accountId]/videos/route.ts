import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const authHeader = req.headers.get("authorization");
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Use NEXT_PUBLIC_API_URL if available, otherwise fallback to other env vars or localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    
    // Backend uses /api/v1 prefix (set in main.ts)
    const backendPath = `${cleanBackendUrl}/api/v1/social-accounts/youtube/${accountId}/videos?page=${page}&limit=${limit}`;
    console.log(`[YouTube Videos API] Fetching videos for account: ${accountId}, page: ${page}, limit: ${limit} from ${backendPath}`);
    
    let response;
    try {
      response = await fetch(backendPath, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError: any) {
      console.error('[YouTube Videos API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to connect to backend: ${fetchError.message}. Is the backend running on ${cleanBackendUrl}?` },
        { status: 503 }
      );
    }

    let data;
    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return NextResponse.json(
          { error: `Server returned empty response (${response.status})` },
          { status: response.status || 500 }
        );
      }
      data = JSON.parse(responseText);
    } catch (jsonError: any) {
      console.error('[YouTube Videos API] JSON parse error:', jsonError);
      return NextResponse.json(
        { error: `Backend error (${response.status}): Unable to parse response` },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Failed to load videos (${response.status})`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('YouTube Videos API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}








