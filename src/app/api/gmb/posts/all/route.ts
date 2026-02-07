import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, "");
    const backendPath = `${cleanBackendUrl}/api/v1/gmb/posts/all`;

    const response = await fetch(backendPath, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => []);
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error("[GMB Posts All API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch GMB posts" },
      { status: 500 }
    );
  }
}
