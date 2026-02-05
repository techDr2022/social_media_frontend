"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseclient";

type AuthContextType = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);

  const syncEndpoint = useMemo(() => {
    // Always use Next.js API route to avoid CORS issues when frontend is on ngrok
    // The Next.js rewrite will proxy to backend server-side
    return "/api/auth/sync";
  }, []);

  const syncUser = useCallback(async (session: Session) => {
    if (synced) return;

    try {
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(syncEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("User sync failed:", response.status, errorText);
        // Set synced to true even on error to prevent infinite retries
        // The user is authenticated via Supabase, backend sync failure shouldn't block login
        setSynced(true);
        return;
      }

      setSynced(true);
    } catch (err: any) {
      // Network error or fetch failed
      const errorMessage = err?.message || "Unknown error";
      
      // If aborted (timeout), log warning but don't block login
      if (err.name === 'AbortError') {
        console.warn("User sync timed out after 10s. User is authenticated but backend sync failed.");
        setSynced(true); // Allow login to proceed even if sync times out
        return;
      }

      console.error("User sync failed - network error:", errorMessage);
      // Only log if backend is actually unreachable (not just a 401/403)
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        console.warn("Backend may be unreachable. Check if backend is running and NEXT_PUBLIC_BACKEND_URL is correct.");
      }
      // Set synced to true to prevent infinite retries - user can still use the app
      setSynced(true);
    }
  }, [synced, syncEndpoint]);

  useEffect(() => {
    // Get initial session - set loading to false quickly so components don't wait
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false); // Set loading to false immediately, don't wait for sync
      if (data.session) {
        // Sync in background, don't block loading state
        syncUser(data.session).catch(err => {
          console.error("Background sync error:", err);
        });
      }
    });

    // Listen for auth state changes (including magic link callbacks)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("[AuthProvider] Auth state changed:", event, {
          hasSession: !!newSession,
          userId: newSession?.user?.id,
          email: newSession?.user?.email,
        });
        setSession(newSession);
        setLoading(false); // Always set loading to false when auth state changes
        
        if (newSession) {
          console.log("[AuthProvider] ✅ Session established, syncing with backend...");
          // Reset synced flag for new session
          setSynced(false);
          // Sync in background, don't block
          syncUser(newSession).catch(err => {
            console.error("Background sync error:", err);
          });
        } else {
          // Signed out
          console.log("[AuthProvider] Session cleared");
          setSynced(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [syncUser]);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}




























