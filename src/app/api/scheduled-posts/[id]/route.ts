import { NextRequest, NextResponse } from "next/server";

function getBackendUrl() {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:3000";
  return backendUrl.replace(/\/$/, "");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const backendPath = `${getBackendUrl()}/api/v1/scheduled-posts/${id}`;

    const response = await fetch(backendPath, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || data?.error || "Update failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data ?? {});
  } catch (error: any) {
    console.error("Scheduled post update error:", error);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const backendPath = `${getBackendUrl()}/api/v1/scheduled-posts/${id}`;

    const response = await fetch(backendPath, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    if (response.status === 204 || response.ok) {
      return NextResponse.json({ success: true });
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(
      { error: data?.message || data?.error || "Delete failed" },
      { status: response.status }
    );
  } catch (error: any) {
    console.error("Scheduled post delete error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
