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
    
    // Forward the request to the NestJS backend
    const backendUrl = `http://localhost:3000/youtube/upload/${accountId}`;
    
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
    const response = await fetch(backendUrl, {
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

