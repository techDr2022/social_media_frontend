"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseclient";


export default function SignInPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function signInWithGoogle() {
    setStatus("Redirecting to Google...");
    // This will redirect user to Google consent and back to Supabase callback
    await supabase.auth.signInWithOAuth({ provider: "google" });
  }

  useEffect(() => {
    // Listen to auth state changes (fires on redirect back)
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.access_token) {
          setStatus("Logged in — syncing with backend...");
          try {
            const res = await fetch("/api/auth/sync", {
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
            } else {
              const json = await res.json();
              console.log("synced user:", json);
              setStatus("Sync successful! Redirecting...");
              // Redirect to home page after successful login
              router.push("/");
            }
          } catch (err) {
            console.error(err);
            setStatus("Sync error (check console)");
          }
        }
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Sign in with Google</h2>
      <button onClick={signInWithGoogle}>Continue with Google</button>
      <div style={{ marginTop: 12 }}>{status}</div>
    </div>
  );
}
