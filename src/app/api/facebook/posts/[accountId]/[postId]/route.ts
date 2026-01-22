import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string; postId: string }> }
) {
  try {
    const { accountId, postId } = await params;
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
    
    if (!accountId || !postId) {
      return NextResponse.json(
        { error: "Account ID and Post ID are required" },
        { status: 400 }
      );
    }

    console.log(`[Facebook API] Deleting post ${postId} for account: ${accountId}`);
    
    const response = await fetch(`${cleanBackendUrl}/facebook/posts/${accountId}/${postId}`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || data?.error || "Failed to delete post" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Facebook delete post API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

