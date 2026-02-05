"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  // 🚨 REDIRECT LOGGED-IN USERS
  useEffect(() => {
    if (!authLoading && session) {
      router.replace("/dashboard");
    }
  }, [authLoading, session, router]);

  // ⏳ Prevent flicker
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  // 🔒 If logged in, don't render login UI
  if (session) {
    return null;
  }

  async function signInWithEmail() {
    if (!email) {
      setStatus("Please enter a valid email address");
      setStatusType("error");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus("Please enter a valid email address");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setStatus("Sending magic link...");
    setStatusType("info");
    
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setStatus(error.message);
      setStatusType("error");
    } else {
      setStatus("Check your email for the login link. It may take a few moments to arrive.");
      setStatusType("success");
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    setStatus("Redirecting to Google...");
    setStatusType("info");
    
    try {
      // Get current origin - ensure it includes protocol
      const origin = window.location.origin;
      const protocol = window.location.protocol; // http: or https:
      const host = window.location.host; // localhost:3001
      
      // Construct redirect URL explicitly with protocol
      // This ensures we always have a valid URL
      const redirectUrl = `${protocol}//${host}/auth/callback`;
      
      console.log('[Google OAuth] Debug Info:', {
        origin,
        protocol,
        host,
        redirectUrl,
        fullUrl: window.location.href,
      });
      
      // Validate URL format
      if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
        const errorMsg = `Invalid redirect URL: ${redirectUrl}. Must include protocol.`;
        console.error('[Google OAuth]', errorMsg);
        throw new Error(errorMsg);
      }
      
      // CRITICAL: Ensure redirect URL is absolute and includes protocol
      // Supabase sometimes ignores redirectTo if Site URL is misconfigured
      // So we double-check the URL format
      const finalRedirectUrl = redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')
        ? redirectUrl
        : `http://${redirectUrl}`;
      
      console.log('[Google OAuth] Calling signInWithOAuth with redirectTo:', finalRedirectUrl);
      console.log('[Google OAuth] ⚠️ CRITICAL: If you see "Failed to launch localhost:3001?code=..." error:');
      console.log('[Google OAuth] ⚠️ 1. Go to Supabase Dashboard → Authentication → URL Configuration');
      console.log('[Google OAuth] ⚠️ 2. Set Site URL to: http://localhost:3001 (MUST include http://)');
      console.log('[Google OAuth] ⚠️ 3. Add Redirect URL: http://localhost:3001/auth/callback');
      console.log('[Google OAuth] ⚠️ 4. Save and wait 2-3 minutes');
      console.log('[Google OAuth] ⚠️ 5. Clear browser cache and try again');
      
      // Log the actual OAuth URL that Supabase generates
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: finalRedirectUrl,
          queryParams: {
            // Ensure redirect_uri is explicitly set
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      // Log the response to see what URL Supabase generated
      if (data?.url) {
        console.log('[Google OAuth] Supabase generated OAuth URL:', data.url);
        // Check if the redirect_uri in the URL is correct
        try {
          const urlObj = new URL(data.url);
          const redirectUri = urlObj.searchParams.get('redirect_uri');
          console.log('[Google OAuth] Redirect URI in OAuth URL:', redirectUri);
          if (redirectUri && !redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
            console.error('[Google OAuth] ⚠️ ERROR: Redirect URI in OAuth URL is missing protocol!', redirectUri);
            console.error('[Google OAuth] ⚠️ This means Supabase Dashboard Site URL is wrong!');
            console.error('[Google OAuth] ⚠️ Fix Site URL in Supabase Dashboard NOW!');
          }
        } catch (e) {
          console.error('[Google OAuth] Could not parse OAuth URL:', e);
        }
      }
      
      if (error) {
        console.error('[Google OAuth] Error from Supabase:', error);
        setLoading(false);
        setStatus(`OAuth error: ${error.message}`);
        setStatusType("error");
      } else {
        console.log('[Google OAuth] OAuth initiated successfully:', data);
        // Note: If successful, user will be redirected to Google, then back to /auth/callback
        // Don't set loading to false here - the redirect happens immediately
      }
    } catch (err: any) {
      console.error('[Google OAuth] Exception:', err);
      setLoading(false);
      setStatus(`OAuth error: ${err.message || "Unknown error"}`);
      setStatusType("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      <Card className="relative w-full max-w-md glass animate-fade-in-up shadow-2xl border-border/50 backdrop-blur-xl">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-50 blur-xl -z-10"></div>
        
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="flex justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/30">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Sign in to continue to your dashboard
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email Address
            </label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status) setStatus(null);
                }}
                placeholder="you@example.com"
                className="h-12 pl-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    signInWithEmail();
                  }
                }}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Magic Link Button */}
          <Button
            onClick={signInWithEmail}
            disabled={loading}
            variant="gradient"
            size="lg"
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 mr-2" />
                Send Magic Link
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-4 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <Button
            onClick={signInWithGoogle}
            disabled={loading}
            variant="outline"
            size="lg"
            className="w-full h-12 text-base font-medium border-border/50 hover:bg-secondary/50 hover:border-primary/30 transition-all"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Status Message */}
          {status && (
            <div
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border animate-fade-in",
                statusType === "success" &&
                  "bg-success/10 border-success/20 text-success",
                statusType === "error" &&
                  "bg-destructive/10 border-destructive/20 text-destructive",
                statusType === "info" &&
                  "bg-primary/10 border-primary/20 text-primary"
              )}
            >
              {statusType === "success" && (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              {statusType === "error" && (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              {statusType === "info" && (
                <Loader2 className="h-5 w-5 flex-shrink-0 mt-0.5 animate-spin" />
              )}
              <p className="text-sm font-medium leading-relaxed">{status}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


/*"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [userRow, setUserRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Build backend sync URL:
  // If you configured Next rewrites to proxy /api/* -> backend, use '/api/auth/sync'.
  // Otherwise set NEXT_PUBLIC_API_URL in .env.local and it will call explicitly.
  const syncEndpoint = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/auth/sync`
    : "/api/auth/sync";

  async function signInWithEmail() {
    if (!email) {
      setStatus("Enter a valid email");
      return;
    }
    setLoading(true);
    setStatus("Sending magic link — check your email...");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setStatus("Error sending magic link: " + error.message);
      } else {
        setStatus("Magic link sent. Click the link in your email to sign in.");
      }
    } catch (err: any) {
      setStatus("Unexpected error: " + String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setStatus("Redirecting to Google...");
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // optional: return URL after auth; Supabase uses its callback and then redirects back.
          redirectTo: window.location.origin,
        },
      });
      // The redirect happens — on return onAuthStateChange will handle session.
    } catch (err: any) {
      setStatus("OAuth error: " + (err.message ?? err));
    }
  }

  // Listen for session changes and call backend sync when an access token is available.
  useEffect(() => {
    let mounted = true;
    const doSync = async (session: any | null) => {
      if (!session?.access_token) return;
      setStatus("Logged in — syncing with backend...");
      setLoading(true);
      try {
        const res = await fetch(syncEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          setStatus("Sync failed: " + text);
          console.error("sync failed", text);
          setUserRow(null);
        } else {
          const json = await res.json();
          setStatus("Sync successful");
          if (mounted) setUserRow(json.user ?? json);
        }
      } catch (err: any) {
        console.error(err);
        setStatus("Sync error: " + (err.message ?? String(err)));
        setUserRow(null);
      } finally {
        setLoading(false);
      }
    };

    // initial session (in case user already signed in)
    supabase.auth.getSession().then(({ data }) => {
      doSync(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      doSync(session ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEndpoint]);

  async function signOut() {
    await supabase.auth.signOut();
    setUserRow(null);
    setStatus("Signed out");
  }

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <h1>Sign in</h1>

      <section style={{ margin: "1rem 0" }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Email (magic link)
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ padding: 8, width: "100%", maxWidth: 400 }}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={signInWithEmail} disabled={loading}>
            Send magic link
          </button>
        </div>
      </section>

      <section style={{ margin: "1rem 0" }}>
        <div>Or sign in with</div>
        <button onClick={signInWithGoogle} disabled={loading} style={{ marginTop: 8 }}>
          Continue with Google
        </button>
      </section>

      <section style={{ marginTop: 20 }}>
        <div>
          <strong>Status:</strong> {status ?? "idle"}
        </div>
        {loading && <div>Loading…</div>}
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>User</h3>
        {userRow ? (
          <div>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(userRow, null, 2)}</pre>
            <button onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <div>No user synced yet.</div>
        )}
      </section>
    </main>
  );
}
*/