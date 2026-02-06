import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    
    // Backend uses /api/v1 prefix
    const backendPath = `${cleanBackendUrl}/api/v1/alerts/${id}/read`;
    console.log(`[Alerts API] Marking alert ${id} as read at: ${backendPath}`);
    
    let response;
    try {
      response = await fetch(backendPath, {
        method: "PUT",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError: any) {
      console.error('[Alerts API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to connect to backend: ${fetchError.message}` },
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
      const errorMessage = data?.message || data?.error || `Failed to mark alert as read (${response.status})`;
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    
    // Backend uses /api/v1 prefix
    const backendPath = `${cleanBackendUrl}/api/v1/alerts/${id}`;
    console.log(`[Alerts API] Deleting alert ${id} at: ${backendPath}`);
    
    let response;
    try {
      response = await fetch(backendPath, {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError: any) {
      console.error('[Alerts API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to connect to backend: ${fetchError.message}` },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const responseText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: `Backend error (${response.status})` };
      }
      const errorMessage = errorData?.message || errorData?.error || `Failed to delete alert (${response.status})`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
