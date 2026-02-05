"use client";

import { useEffect } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuthCallback } from "@/hooks/useAuthCallback";

/**
 * Magic Link Callback Page
 * 
 * Architecture: Thin UI wrapper that delegates to useAuthCallback hook
 * 
 * Flow:
 * 1. User clicks magic link → Redirects to /auth/callback#access_token=...
 * 2. useAuthCallback hook handles all logic
 * 3. AuthProvider processes Supabase events (event-driven, no polling)
 * 4. Hook detects session and redirects
 * 
 * Benefits:
 * - Separation of concerns (UI vs logic)
 * - Event-driven (no polling)
 * - Testable (hook can be tested independently)
 * - Reusable (hook can be used elsewhere)
 */
export default function AuthCallbackPage() {
  const { state, error, isProcessing } = useAuthCallback();

  // Fix malformed URLs that might come from Supabase redirects
  useEffect(() => {
    // Check if we're on a malformed URL (missing protocol in referrer or current URL)
    const currentUrl = window.location.href;
    
    // If URL doesn't have protocol but has code parameter, fix it
    if (currentUrl.includes('?code=') && !currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
      console.error("[Auth Callback] ⚠️ Malformed URL detected! Current URL:", currentUrl);
      // Extract code and redirect properly
      const urlObj = new URL(currentUrl, 'http://localhost:3001');
      const code = urlObj.searchParams.get('code');
      if (code) {
        console.log("[Auth Callback] Fixing malformed URL, redirecting to proper URL");
        window.location.replace(`http://localhost:3001/auth/callback?code=${code}`);
      }
    }
  }, []);

  // Determine UI state based on hook state
  const getStatusMessage = () => {
    switch (state) {
      case 'processing':
      case 'idle':
        return 'Processing authentication...';
      case 'success':
        return 'Authentication successful! Redirecting...';
      case 'error':
        return error || 'Authentication failed';
      case 'timeout':
        return 'Authentication timeout. Please try again.';
      default:
        return 'Processing authentication...';
    }
  };

  const statusType = 
    state === 'success' ? 'success' :
    state === 'error' || state === 'timeout' ? 'error' :
    'info';

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        {statusType === "info" && (
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        )}
        {statusType === "success" && (
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        )}
        {statusType === "error" && (
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        )}
        <p className="text-lg font-medium">{getStatusMessage()}</p>
        {statusType === "info" && (
          <p className="text-sm text-muted-foreground">
            Please wait while we verify your authentication...
          </p>
        )}
      </div>
    </div>
  );
}
