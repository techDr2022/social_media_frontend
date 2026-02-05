import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    console.log('[Instagram API] Received body:', JSON.stringify(body, null, 2));

    // Use NEXT_PUBLIC_API_URL if available, otherwise fallback to other env vars or localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Backend uses /api/v1 prefix (set in main.ts)
    const backendPath = `${cleanBackendUrl}/api/v1/instagram/post/${accountId}`;
    console.log(`[Instagram API] Proxying to: ${backendPath}`);
    
    let response;
    try {
      // Increase timeout for video processing (10 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutes
      
      response = await fetch(backendPath, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log(`[Instagram API] Backend response status: ${response.status} ${response.statusText}`);
      console.log(`[Instagram API] Backend response headers:`, Object.fromEntries(response.headers.entries()));
    } catch (fetchError: any) {
      console.error('[Instagram API] Fetch error:', fetchError);
      
      // Check if it's a timeout (abort) error
      if (fetchError.name === 'AbortError') {
        console.log('[Instagram API] Request timed out - backend may still be processing');
        return NextResponse.json(
          { 
            error: 'Request timed out, but processing may continue in background. Check your posts in a few minutes.',
            timeout: true,
            message: 'Video processing takes time. Your post may still be created successfully.'
          },
          { status: 202 } // 202 Accepted - processing in background
        );
      }
      
      return NextResponse.json(
        { error: `Failed to connect to backend: ${fetchError.message}. Is the backend running on ${cleanBackendUrl}?` },
        { status: 503 }
      );
    }

    // Read response as text first (we can only read the stream once)
    let responseText: string;
    try {
      responseText = await response.text();
      console.log(`[Instagram API] Backend response status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);
      console.log('[Instagram API] Backend response text (first 500 chars):', responseText.substring(0, 500));
      
      // Check if response is HTML (error page) or plain text error
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('[Instagram API] Backend returned HTML instead of JSON - this should not happen!');
        return NextResponse.json(
          { 
            error: `Backend returned HTML error page (${response.status}). This indicates a NestJS error. Check backend logs.`,
            rawResponse: responseText.substring(0, 500)
          },
          { status: 500 }
        );
      }
      
      // Check if response is plain text error (like "Internal Server Error")
      if (!response.ok && (responseText.includes('Internal Server Error') || responseText.includes('Error'))) {
        console.error('[Instagram API] Backend returned plain text error instead of JSON');
        return NextResponse.json(
          { 
            error: `Backend error (${response.status}): ${responseText.trim().substring(0, 200)}. Check backend logs for details.`
          },
          { status: response.status || 500 }
        );
      }
    } catch (textError: any) {
      console.error('[Instagram API] Failed to read response text:', textError);
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
      } catch (jsonError: any) {
        // Response is not valid JSON - might be HTML error page
        console.error('[Instagram API] Response is not valid JSON:', jsonError.message);
        console.error('[Instagram API] Response text:', responseText.substring(0, 500));
        return NextResponse.json(
          { 
            error: `Backend returned non-JSON response (${response.status}): ${responseText.substring(0, 200)}`,
            rawResponse: responseText.substring(0, 500)
          },
          { status: response.status || 500 }
        );
      }
    } else {
      // Empty response
      if (!response.ok) {
        return NextResponse.json(
          { error: `Backend error (${response.status}): Empty response` },
          { status: response.status || 500 }
        );
      }
      data = {};
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error?.message || data?.error || `Failed to post (${response.status})`;
      
      console.error('[Instagram API] Backend error response:', {
        status: response.status,
        message: data?.message,
        error: data?.error,
        fullData: data
      });
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Instagram post API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


