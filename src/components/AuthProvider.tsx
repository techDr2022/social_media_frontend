"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  const syncedRef = useRef(false);

  const syncEndpoint = useMemo(() => {
    // Always use Next.js API route to avoid CORS issues when frontend is on ngrok
    // The Next.js rewrite will proxy to backend server-side
    return "/api/auth/sync";
  }, []);

  const syncUser = useCallback(async (session: Session) => {
    if (syncedRef.current) return;
    syncedRef.current = true;

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
        syncedRef.current = false;
        return;
      }
    } catch (err: any) {
      // Network error or fetch failed
      const errorMessage = err?.message || "Unknown error";
      
      // If aborted (timeout), log warning but don't block login
      if (err.name === 'AbortError') {
        console.warn("User sync timed out.");
      } else {
        console.error("User sync failed - network error:", errorMessage);
      }
      syncedRef.current = false;
    }
  }, [syncEndpoint]);

  useEffect(() => {
    // Get initial session - set loading to false quickly so components don't wait
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false); // Set loading to false immediately, don't wait for sync
      if (data.session && !syncedRef.current) {
        syncUser(data.session).catch(err => {
          console.error("Background sync error:", err);
        });
      }
    });

    // Listen for auth state changes (including magic link callbacks)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Only sync on SIGNED_IN. Do NOT sync on INITIAL_SESSION (fires every time we subscribe) or TOKEN_REFRESHED
        setSession(newSession);
        setLoading(false);
        if (newSession && event === "SIGNED_IN") {
          syncedRef.current = false;
          syncUser(newSession).catch(err => console.error("Background sync error:", err));
        } else if (!newSession) {
          syncedRef.current = false;
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




























