import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    // Use NEXT_PUBLIC_API_URL if available, otherwise fallback to other env vars or localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    // Backend uses /api/v1 prefix (set in main.ts)
    const backendPath = `${cleanBackendUrl}/api/v1/users/profile`;
    console.log(`[Users Profile API] Proxying to: ${backendPath}`);
    
    let response;
    try {
      response = await fetch(backendPath, {
        method: "PUT",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (fetchError: any) {
      console.error('[Users Profile API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to connect to backend: ${fetchError.message}. Is the backend running on ${cleanBackendUrl}?` },
        { status: 503 }
      );
    }

    // Read response as text first
    let responseText: string;
    try {
      responseText = await response.text();
      console.log('[Users Profile API] Backend response status:', response.status);
    } catch (textError: any) {
      console.error('[Users Profile API] Failed to read response text:', textError);
      return NextResponse.json(
        { error: `Backend error (${response.status}): Unable to read response` },
        { status: response.status || 500 }
      );
    }

    // Try to parse as JSON
    let data: any;
    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[Users Profile API] Failed to parse JSON:', parseError);
        return NextResponse.json(
          { error: `Backend returned invalid JSON: ${responseText.substring(0, 200)}` },
          { status: 500 }
        );
      }
    } else {
      data = {};
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Users Profile API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
















