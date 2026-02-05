import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl() {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:3000";
  return backendUrl.replace(/\/$/, "");
}

function getAuthHeader(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("NO_AUTH");
  }
  return authHeader;
}

async function proxyJson(
  req: NextRequest,
  url: string,
  method: "GET" | "POST" | "DELETE"
) {
  let authHeader: string;
  try {
    authHeader = getAuthHeader(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let init: RequestInit = {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  };

  if (method === "POST") {
    const body = await req.json();
    init = { ...init, body: JSON.stringify(body) };
  }

  console.log(`[Facebook API] Proxying ${method} ${url}`);

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (fetchError: any) {
    console.error("[Facebook API] Fetch error:", fetchError);
    return NextResponse.json(
      {
        error: `Failed to connect to backend: ${fetchError.message}. Is the backend running on ${getBackendBaseUrl()}?`,
      },
      { status: 503 }
    );
  }

  let data: any;
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
    const errorMessage =
      data?.message ||
      data?.error?.message ||
      data?.error ||
      `Backend error (${response.status})`;

    console.error("[Facebook API] Backend error response:", {
      status: response.status,
      message: data?.message,
      error: data?.error,
      fullData: data,
    });

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    const baseUrl = getBackendBaseUrl();
    // Backend uses /api/v1 prefix (set in main.ts)
    const url = `${baseUrl}/api/v1/facebook/post/${accountId}`;
    return await proxyJson(req, url, "POST");
  } catch (error: any) {
    if (error?.message === "NO_AUTH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Facebook post API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    const baseUrl = getBackendBaseUrl();
    // Backend uses /api/v1 prefix (set in main.ts)
    const url = `${baseUrl}/api/v1/facebook/posts/${accountId}`;
    return await proxyJson(req, url, "GET");
  } catch (error: any) {
    if (error?.message === "NO_AUTH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Facebook list posts API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const postId = req.nextUrl.searchParams.get("postId");

    if (!accountId || !postId) {
      return NextResponse.json(
        { error: "Account ID and postId are required" },
        { status: 400 }
      );
    }

    const baseUrl = getBackendBaseUrl();
    // Backend uses /api/v1 prefix (set in main.ts)
    const url = `${baseUrl}/api/v1/facebook/posts/${accountId}/${postId}`;
    return await proxyJson(req, url, "DELETE");
  } catch (error: any) {
    if (error?.message === "NO_AUTH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Facebook delete post API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

