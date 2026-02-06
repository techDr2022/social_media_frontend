"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Facebook, Youtube, RefreshCw, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseclient";
import { cn } from "@/lib/utils";

type TokenStatus = "healthy" | "expiring_soon" | "expired" | "disconnected";

interface TokenStatusItem {
  id: string;
  platform: string;
  displayName: string | null;
  username: string | null;
  tokenExpiresAt: string | null;
  expiresInHuman: string;
  status: TokenStatus;
  canRefresh: boolean;
  reconnectPath: string;
}

const platformIcons: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

const statusConfig: Record<
  TokenStatus,
  { label: string; className: string }
> = {
  healthy: { label: "Healthy", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  expiring_soon: { label: "Expiring soon", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  expired: { label: "Expired", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  disconnected: { label: "Disconnected", className: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
};

export default function YourKeysPage() {
  const [items, setItems] = useState<TokenStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  async function loadTokenStatus() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Please sign in to view your keys.");
        setItems([]);
        return;
      }
      const res = await fetch("/api/social-accounts/token-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataJson = await res.json();
      if (!res.ok) {
        setError(dataJson?.error || "Failed to load token status.");
        setItems([]);
        return;
      }
      setItems(Array.isArray(dataJson) ? dataJson : []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTokenStatus();
  }, []);

  async function handleRefresh(accountId: string) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    setRefreshingId(accountId);
    try {
      const res = await fetch(`/api/social-accounts/${accountId}/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const dataJson = await res.json();
      if (!res.ok) {
        const msg = dataJson?.error || dataJson?.message || "Refresh failed.";
        alert(res.status === 404 ? `${msg} Use Reconnect to link the account again.` : msg);
        return;
      }
      await loadTokenStatus();
    } catch (e: any) {
      alert(e?.message || "Refresh failed.");
    } finally {
      setRefreshingId(null);
    }
  }

  return (
    <MainLayout
      title="Your keys"
      subtitle="Token expiry and status. Keys are never shown here."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Automatic refresh info */}
        <Card className="bg-muted/30 border-muted-foreground/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How token refresh works</CardTitle>
            <CardDescription className="text-sm">
              You usually don’t need to do anything. Tokens are refreshed automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>Automatic refresh</strong> runs about once an hour. It finds tokens that are expiring soon and refreshes them in the background. No manual action needed.
            </p>
            <p>
              <strong>YouTube</strong> tokens typically expire in about 1 hour. When you upload or use the app, the system refreshes them as needed. The expiry time shown here is the next refresh window.
            </p>
            <p>
              <strong>Facebook &amp; Instagram</strong> use long-lived tokens (about 60 days). They are refreshed automatically when they get close to expiry. Manual refresh is optional.
            </p>
            <p className="text-muted-foreground">
              If something shows &quot;Expired&quot; or &quot;Disconnected&quot;, use <strong>Reconnect</strong> to link the account again. If manual Refresh says &quot;not found&quot;, use Reconnect.
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-4">
              <p className="text-destructive text-center">{error}</p>
              <Button variant="outline" onClick={() => loadTokenStatus()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No connected accounts</CardTitle>
              <CardDescription>
                Connect an account from Accounts to see its token status and expiry here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/connect">Go to Accounts</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Token status</CardTitle>
              <CardDescription>
                Expiry is shown; tokens are not displayed. Automatic refresh handles most cases; use Refresh only if you want to refresh now, or Reconnect if the account is disconnected or expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => {
                  const Icon = platformIcons[item.platform?.toLowerCase()] ?? Instagram;
                  const status = statusConfig[item.status];
                  const name = item.displayName || item.username || item.platform || "Account";
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex flex-wrap items-center gap-4 rounded-lg border p-4",
                        "bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{name}</p>
                          <p className="text-sm text-muted-foreground">
                            {platformLabels[item.platform?.toLowerCase()] || item.platform}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {item.status === "disconnected"
                            ? "—"
                            : item.expiresInHuman === "expired"
                              ? "Expired"
                              : `Expires in ${item.expiresInHuman}`}
                        </span>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        {item.canRefresh && item.status !== "disconnected" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefresh(item.id)}
                            disabled={refreshingId === item.id}
                          >
                            {refreshingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Refresh
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={item.reconnectPath}>
                            <Link2 className="h-4 w-4 mr-1" />
                            Reconnect
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
