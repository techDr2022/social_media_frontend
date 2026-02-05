import { NextRequest, NextResponse } from 'next/server';

// Configure for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large uploads
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the form data from the request (this handles large files)
    const formData = await request.formData();
    
    // Use NEXT_PUBLIC_API_URL if available, otherwise fallback to other env vars or localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.BACKEND_URL || 
                       "http://localhost:3000";
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    
    // Backend uses /api/v1 prefix (set in main.ts)
    // Forward the request to the NestJS backend
    const targetUrl = `${cleanBackendUrl}/api/v1/youtube/upload/${accountId}`;
    
    // Create a new FormData for the backend
    const backendFormData = new FormData();
    
    // Copy all fields from the original form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        backendFormData.append(key, value);
      } else {
        backendFormData.append(key, value as string);
      }
    }

    // Forward to backend with proper timeout for large files
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: backendFormData,
      // Increase timeout for large files
      signal: AbortSignal.timeout(300000), // 5 minutes
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

