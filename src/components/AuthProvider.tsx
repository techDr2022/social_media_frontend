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
      const response = await fetch(syncEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("User sync failed:", response.status, errorText);
        // Don't set synced to true if the request failed
        return;
      }

      setSynced(true);
    } catch (err: any) {
      // Network error or fetch failed
      const errorMessage = err?.message || "Unknown error";
      console.error("User sync failed - network error:", errorMessage);
      // Only log if backend is actually unreachable (not just a 401/403)
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        console.warn("Backend may be unreachable. Check if backend is running and NEXT_PUBLIC_BACKEND_URL is correct.");
      }
      // Don't set synced to true on error, so it can retry later
    }
  }, [synced, syncEndpoint]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) syncUser(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setSynced(false);
        if (newSession) syncUser(newSession);
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





















