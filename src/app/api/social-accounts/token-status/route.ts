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
    const backendPath = `${cleanBackendUrl}/api/v1/social-accounts/token-status`;

    const response = await fetch(backendPath, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message = data?.message ?? data?.error ?? `Request failed (${response.status})`;
      return NextResponse.json(
        { error: typeof message === "string" ? message : "Request failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[token-status]", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to load token status" },
      { status: 500 }
    );
  }
}
