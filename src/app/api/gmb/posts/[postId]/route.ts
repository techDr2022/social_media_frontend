import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, "");
    const backendPath = `${cleanBackendUrl}/api/v1/gmb/posts/${postId}`;

    const response = await fetch(backendPath, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error("[GMB Delete Post API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete post" },
      { status: 500 }
    );
  }
}
