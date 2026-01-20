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

    console.log(`[Facebook API] Proxying to: ${cleanBackendUrl}/facebook/post/${accountId}`);
    
    let response;
    try {
      response = await fetch(`${cleanBackendUrl}/facebook/post/${accountId}`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (fetchError: any) {
      console.error('[Facebook API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to connect to backend: ${fetchError.message}. Is the backend running on ${cleanBackendUrl}?` },
        { status: 503 }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Backend error (${response.status}): ${text}` },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      // NestJS InternalServerErrorException returns: { message: string, error: string, statusCode: number }
      // The 'message' field contains the detailed error message
      // The 'error' field is just the error type (e.g., "Internal Server Error")
      const errorMessage = data?.message || data?.error?.message || data?.error || "Failed to post";
      
      console.error('[Facebook API] Backend error response:', {
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
    console.error('Facebook post API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

