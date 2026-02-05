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

    // Use NEXT_PUBLIC_API_URL if available, otherwise fallback to other env vars or localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    
    // Backend uses /api/v1 prefix (set in main.ts)
    const backendPath = `${cleanBackendUrl}/api/v1/scheduled-posts`;
    console.log(`[Scheduled Posts API] Fetching scheduled posts from: ${backendPath}`);
    
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
      console.error('[Scheduled Posts API] Fetch error:', fetchError);
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
      console.error('[Scheduled Posts API] JSON parse error:', jsonError);
      return NextResponse.json(
        { error: `Backend error (${response.status}): Unable to parse response` },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Failed to load scheduled posts (${response.status})`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Scheduled Posts API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use NEXT_PUBLIC_API_URL if available, otherwise fallback to other env vars or localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    
    // Check if request is FormData or JSON
    const contentType = req.headers.get("content-type") || "";
    let body: FormData | string;
    let headers: Record<string, string> = {
      Authorization: authHeader,
    };

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData
      const formData = await req.formData();
      body = formData;
      // Don't set Content-Type header for FormData - browser will set it with boundary
    } else {
      // Handle JSON
      const jsonBody = await req.json();
      body = JSON.stringify(jsonBody);
      headers["Content-Type"] = "application/json";
    }
    
    // Backend uses /api/v1 prefix (set in main.ts)
    const backendPath = `${cleanBackendUrl}/api/v1/scheduled-posts`;
    console.log(`[Scheduled Posts API] Creating scheduled post at: ${backendPath}`);
    
    let response;
    try {
      response = await fetch(backendPath, {
        method: "POST",
        headers,
        body: body as any,
      });
    } catch (fetchError: any) {
      console.error('[Scheduled Posts API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to connect to backend: ${fetchError.message}. Is the backend running on ${cleanBackendUrl}?` },
        { status: 503 }
      );
    }

    let data;
    let responseText: string | undefined;
    try {
      responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return NextResponse.json(
          { error: `Server returned empty response (${response.status})` },
          { status: response.status || 500 }
        );
      }
      data = JSON.parse(responseText);
    } catch (jsonError: any) {
      console.error('[Scheduled Posts API] JSON parse error:', jsonError);
      console.error('[Scheduled Posts API] Response text:', responseText ?? '(unavailable)');
      return NextResponse.json(
        { error: `Backend error (${response.status}): Unable to parse response.${responseText ? ` Response: ${responseText.substring(0, 200)}` : ''}` },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Failed to create scheduled post (${response.status})`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Scheduled Posts API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}








