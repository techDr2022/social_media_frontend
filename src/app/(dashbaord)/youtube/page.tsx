"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Youtube, Check, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type YoutubeAccount = {
  id: string;
  displayName: string;
  externalId: string;
};

export default function YoutubeHubPage() {
  const [accounts, setAccounts] = useState<YoutubeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);

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
      const youtubeAccounts = json.filter(
        (a: any) => a.platform?.toLowerCase() === "youtube"
      );

      setAccounts(youtubeAccounts);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading accounts:", err);
      setStatus(`Error loading accounts: ${err.message || "Network error"}`);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function connectYoutube() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    setConnecting(true);
    setStatus("Connecting to YouTube...");

    try {
      const res = await fetch("/api/social-accounts/connect/youtube", {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        redirect: "manual",
      });

      if (res.status >= 300 && res.status < 400) {
        const redirectUrl = res.headers.get("location");
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
      }

      const redirectUrl = res.headers.get("location");
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.url || data?.redirectUrl) {
          window.location.href = data.url || data.redirectUrl;
          return;
        }
      }

      const errorText = await res.text().catch(() => '');
      console.error('OAuth error:', res.status, errorText);
      setStatus(`Failed to start YouTube OAuth (${res.status})`);
      setConnecting(false);
    } catch (err: any) {
      console.error('OAuth error:', err);
      setStatus(`Failed to start YouTube OAuth: ${err.message}`);
      setConnecting(false);
    }
  }

  return (
    <MainLayout
      title="YouTube"
      subtitle="Manage your YouTube channels and upload videos"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <Button
            onClick={loadAccounts}
            variant="outline"
            size="sm"
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={connectYoutube}
            disabled={connecting}
            className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Youtube className="h-4 w-4" />
                Connect YouTube
              </>
            )}
          </Button>
        </div>

        {/* Status Message */}
        {status && (
          <Card className={cn(
            status.startsWith("Failed") || status.startsWith("Error")
              ? "border-destructive"
              : "border-border"
          )}>
            <CardContent className="pt-6">
              <p className={cn(
                "text-sm",
                status.startsWith("Failed") || status.startsWith("Error")
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}>
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading channels...</p>
              </div>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="max-w-md mx-auto text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Youtube className="w-10 h-10 text-red-500" />
                </div>
                <CardTitle className="mb-2">No YouTube channels connected</CardTitle>
                <CardDescription className="mb-6">
                  Connect your YouTube channel to start uploading and managing videos.
                </CardDescription>
                <Button
                  onClick={connectYoutube}
                  disabled={connecting}
                  className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Youtube className="h-4 w-4" />
                      Connect Your First Channel
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Accounts Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((acc) => (
              <Link
                key={acc.id}
                href={`/youtube/${acc.id}`}
                className="group"
              >
                <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Youtube className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="default" className="bg-success/10 text-success border-success/20">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {acc.displayName}
                    </CardTitle>
                    <CardDescription>Channel ID: {acc.externalId}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm font-medium text-primary group-hover:text-primary/80">
                      Manage channel
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
