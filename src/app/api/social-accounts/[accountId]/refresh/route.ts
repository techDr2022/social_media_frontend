import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = () => {
  const u =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:3000";
  return u.replace(/\/$/, "");
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = typeof accountId === "string" ? accountId.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const backendUrl = getBackendUrl();
    const backendPath = `${backendUrl}/api/v1/social-accounts/${id}/refresh`;
    const response = await fetch(backendPath, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    let data: { message?: string; error?: string; tokenExpiresAt?: string } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (!response.ok) {
        return NextResponse.json(
          { error: "Refresh failed" },
          { status: response.status }
        );
      }
    }

    if (!response.ok) {
      const message = data?.message ?? data?.error ?? "Refresh failed";
      return NextResponse.json(
        { error: typeof message === "string" ? message : "Refresh failed" },
        { status: response.status }
      );
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[refresh token]", error);
    return NextResponse.json(
      { error: error?.message ?? "Refresh failed" },
      { status: 500 }
    );
  }
}
