"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Check, Loader2, RefreshCw, ArrowRight, PenSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type InstagramAccount = {
  id: string;
  displayName: string;
  username?: string;
  externalId: string;
};

export default function InstagramHubPage() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        const errorText = await res.text().catch(() => "Unknown error");
        console.error("Failed to load accounts:", res.status, errorText);
        setStatus(`Failed to load accounts (${res.status}): ${errorText}`);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const instagramAccounts = json.filter(
        (a: any) => a.platform?.toLowerCase() === "instagram"
      );

      setAccounts(instagramAccounts);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading accounts:", err);
      setStatus(`Error loading accounts: ${err.message || "Network error. Check if backend is running."}`);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
    
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      setStatus(`❌ ${decodeURIComponent(error)}`);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      const timer = setTimeout(() => {
        loadAccounts();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  async function connectInstagram() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    setConnecting(true);
    setStatus("Connecting to Instagram...");

    try {
      const res = await fetch("/api/social-accounts/connect/instagram", {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        redirect: "manual",
      }).catch((fetchErr) => {
        throw new Error(`Network error: ${fetchErr.message}`);
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
        try {
          const data = await res.json();
          if (data?.url || data?.redirectUrl) {
            window.location.href = data.url || data.redirectUrl;
            return;
          }
        } catch (jsonError) {
          console.log('Response is not JSON');
        }
      }

      const errorText = await res.text().catch(() => '');
      if (res.status === 0) {
        setStatus("❌ Network error: Could not connect to backend. Is the backend running?");
      } else {
        setStatus(`Failed to start Instagram OAuth (${res.status}): ${errorText || 'Unknown error'}`);
      }
      setConnecting(false);
    } catch (err: any) {
      console.error('OAuth error:', err);
      setStatus(`Failed to start Instagram OAuth: ${err.message || 'Network error. Check if backend is running.'}`);
      setConnecting(false);
    }
  }

  async function deleteAccount(accountId: string, accountName: string) {
    if (!confirm(`Are you sure you want to delete "${accountName}"? This action cannot be undone.`)) {
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("❌ You must be logged in.");
      return;
    }

    setDeletingId(accountId);
    setStatus("");

    try {
      const res = await fetch(`/api/social-accounts/${accountId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMessage = data?.message || data?.error || `Failed to delete account (${res.status})`;
        setStatus(`❌ ${errorMessage}`);
        setDeletingId(null);
        return;
      }

      setStatus(`✅ Account "${accountName}" deleted successfully`);
      // Remove the account from the list
      setAccounts(accounts.filter(acc => acc.id !== accountId));
      setDeletingId(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      setStatus(`❌ Failed to delete account: ${err.message || "Network error"}`);
      setDeletingId(null);
    }
  }

  return (
    <MainLayout
      title="Instagram"
      subtitle="Manage your Instagram Business and Creator accounts and post content"
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
            onClick={connectInstagram}
            disabled={connecting}
            className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Instagram className="h-4 w-4" />
                Connect Instagram
              </>
            )}
          </Button>
        </div>

        {/* Status Message */}
        {status && (
          <Card className={cn(
            status.startsWith("❌") || status.startsWith("Failed") || status.startsWith("Error") 
              ? "border-destructive" 
              : "border-border"
          )}>
            <CardContent className="pt-6">
              <p className={cn(
                "text-sm",
                status.startsWith("❌") || status.startsWith("Failed") || status.startsWith("Error")
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
                <p className="text-muted-foreground">Loading accounts...</p>
              </div>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="max-w-md mx-auto text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Instagram className="w-10 h-10 text-pink-500" />
                </div>
                <CardTitle className="mb-2">No Instagram accounts connected</CardTitle>
                <CardDescription className="mb-6">
                  Connect your Instagram Business or Creator account to start posting and scheduling content.
                  <br />
                  <span className="text-xs mt-2 block">
                    Note: Your Instagram account must be a Business or Creator account.
                  </span>
                </CardDescription>
                <Button
                  onClick={connectInstagram}
                  disabled={connecting}
                  className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Instagram className="h-4 w-4" />
                      Connect Your First Account
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
              <Card
                key={acc.id}
                className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-200 group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Instagram className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-success/10 text-success border-success/20">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteAccount(acc.id, acc.displayName);
                        }}
                        disabled={deletingId === acc.id}
                        title="Delete account"
                      >
                        {deletingId === acc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {acc.displayName}
                  </CardTitle>
                  {acc.username && (
                    <CardDescription>@{acc.username}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Button
                      asChild
                      variant="default"
                      className="w-full gap-2"
                    >
                      <Link href={`/instagram/${acc.id}`}>
                        <PenSquare className="h-4 w-4" />
                        Manage
                      </Link>
                    </Button>
                    <Link
                      href={`/instagram/post/${acc.id}`}
                      className="flex items-center justify-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Create post
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
