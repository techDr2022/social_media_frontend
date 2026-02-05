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

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    
    // Backend uses /api/v1 prefix
    const backendPath = `${cleanBackendUrl}/api/v1/alerts/unread-count`;
    console.log(`[Alerts API] Fetching unread count from: ${backendPath}`);
    
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
      const isRefused = fetchError?.cause?.code === 'ECONNREFUSED' || fetchError?.message?.includes('ECONNREFUSED');
      if (isRefused) {
        console.warn('[Alerts API] Backend unreachable (is it running?).', cleanBackendUrl);
      } else {
        console.error('[Alerts API] Fetch error:', fetchError);
      }
      return NextResponse.json(
        {
          error: isRefused
            ? 'Backend is not running or unreachable. Start the backend (e.g. npm run start:dev in ba/) and try again.'
            : `Failed to connect to backend: ${fetchError?.message || 'Unknown error'}`,
        },
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
      console.error('[Alerts API] JSON parse error:', jsonError);
      return NextResponse.json(
        { error: `Backend error (${response.status}): Unable to parse response` },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Failed to load unread count (${response.status})`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
