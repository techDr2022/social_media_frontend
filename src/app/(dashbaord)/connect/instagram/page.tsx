"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Check, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type InstagramAccount = {
  id: string;
  displayName: string;
  username?: string;
  externalId: string;
  createdAt: string;
  platform: string;
};

export default function ConnectInstagramPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      setStatus(
        `Connection failed: ${decodeURIComponent(err)}. Please try again or reconnect.`
      );
    }
  }, [searchParams]);

  async function loadAccounts() {
    setLoading(true);
    setStatus("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("You must be logged in.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/social-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setStatus("Failed to load accounts");
        setLoading(false);
        return;
      }

      const json = await res.json();
      const instagramAccounts = json.filter(
        (a: any) => a.platform?.toLowerCase() === "instagram"
      );

      setAccounts(instagramAccounts);
    } catch (err: any) {
      console.error("Failed to load accounts:", err);
      setStatus("Error loading accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function connectInstagram() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    setConnecting(true);
    setStatus("Redirecting to Instagram...");

    try {
      const res = await fetch("/api/social-accounts/connect/instagram", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        setStatus(`Failed to connect: ${errorData.error || "Unknown error"}`);
        setConnecting(false);
        return;
      }

      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setStatus("No redirect URL received from server.");
        setConnecting(false);
      }
    } catch (err: any) {
      console.error("Instagram connect error", err);
      setStatus("Error connecting Instagram: " + (err.message ?? String(err)));
      setConnecting(false);
    }
  }

  return (
    <MainLayout
      title="Instagram Accounts"
      subtitle="Connect and manage your Instagram Business or Creator accounts"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Connect Button */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-500">
                <Instagram className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Connect Instagram Account</CardTitle>
                <CardDescription>
                  Link your Instagram Business or Creator account to start scheduling posts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={connectInstagram}
              disabled={connecting}
              className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              size="lg"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Instagram className="h-4 w-4" />
                  Connect Instagram Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Status Message */}
        {status && (
          <Card className={status.startsWith("Failed") || status.startsWith("Error") || status.startsWith("Connection failed") ? "border-destructive" : "border-border"}>
            <CardContent className="pt-6 flex flex-col gap-3">
              <p className={cn(
                "text-sm",
                status.startsWith("Failed") || status.startsWith("Error") || status.startsWith("Connection failed") ? "text-destructive" : "text-muted-foreground"
              )}>
                {status}
              </p>
              {(status.startsWith("Failed") || status.startsWith("Error") || status.startsWith("Connection failed")) && (
                <Button variant="outline" size="sm" onClick={() => setStatus("")}>
                  Try again
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Connected Accounts */}
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading accounts...</span>
              </div>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                No Instagram accounts connected yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Click the button above to connect your first Instagram account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Connected Accounts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <Card key={acc.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-500">
                          <Instagram className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{acc.displayName || acc.username || "Instagram Account"}</CardTitle>
                          <CardDescription className="text-xs">
                            {acc.username ? `@${acc.username}` : acc.externalId}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-success/10 text-success border-success/20">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Link href={`/instagram/${acc.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Calendar className="h-4 w-4" />
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
