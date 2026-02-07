"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, Loader2, RefreshCw, ArrowRight, MapPin, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type GmbAccount = {
  id: string;
  displayName: string;
  externalId: string;
  accountType?: string;
};

export default function GmbHubPage() {
  const [accounts, setAccounts] = useState<GmbAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [warning, setWarning] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [removingAll, setRemovingAll] = useState(false);

  // Check for warning in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const warningParam = params.get('warning');
    if (warningParam) {
      setWarning(decodeURIComponent(warningParam));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
      const gmbAccounts = json.filter(
        (a: any) => a.platform?.toLowerCase() === "gmb"
      );

      setAccounts(gmbAccounts);
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

  async function connectGmb() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    setConnecting(true);
    setStatus("Connecting to Google My Business...");

    try {
      const res = await fetch("/api/social-accounts/connect/gmb", {
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
      setStatus(`Failed to start GMB OAuth (${res.status})`);
      setConnecting(false);
    } catch (err: any) {
      console.error('OAuth error:', err);
      setStatus(`Failed to start GMB OAuth: ${err.message}`);
      setConnecting(false);
    }
  }

  async function cleanupPlaceholders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    setCleaning(true);
    setStatus("Cleaning up placeholder accounts...");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/gmb/accounts/cleanup`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.text().catch(() => 'Failed to cleanup');
        setStatus(`Failed to cleanup: ${error}`);
        setCleaning(false);
        return;
      }

      const result = await res.json();
      setStatus(result.message || `Cleaned up ${result.deleted || 0} placeholder account(s)`);
      setCleaning(false);
      
      // Reload accounts after cleanup
      setTimeout(() => {
        loadAccounts();
      }, 1000);
    } catch (err: any) {
      console.error('Cleanup error:', err);
      setStatus(`Failed to cleanup: ${err.message}`);
      setCleaning(false);
    }
  }

  async function removeAllGmbAccounts() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    // Confirm before deleting all
    if (!confirm('Are you sure you want to remove ALL GMB accounts? This action cannot be undone.')) {
      return;
    }

    setRemovingAll(true);
    setStatus("Removing all GMB accounts...");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/gmb/accounts/remove-all`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.text().catch(() => 'Failed to remove all accounts');
        setStatus(`Failed to remove all: ${error}`);
        setRemovingAll(false);
        return;
      }

      const result = await res.json();
      setStatus(result.message || `Removed ${result.deleted || 0} GMB account(s)`);
      setRemovingAll(false);
      
      // Reload accounts after removal
      setTimeout(() => {
        loadAccounts();
      }, 1000);
    } catch (err: any) {
      console.error('Remove all error:', err);
      setStatus(`Failed to remove all: ${err.message}`);
      setRemovingAll(false);
    }
  }

  return (
    <MainLayout
      title="Google My Business"
      subtitle="Manage your Google My Business locations, posts, and reviews"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
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
            {accounts.some((acc) => acc.externalId.startsWith('pending-sync-') || acc.externalId.startsWith('gmb-')) && (
              <Button
                onClick={cleanupPlaceholders}
                variant="outline"
                size="sm"
                disabled={cleaning}
                className="gap-2 text-destructive hover:text-destructive"
              >
                {cleaning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Clean Up Placeholders
                  </>
                )}
              </Button>
            )}
            {accounts.length > 0 && (
              <Button
                onClick={removeAllGmbAccounts}
                variant="outline"
                size="sm"
                disabled={removingAll}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {removingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Remove All
                  </>
                )}
              </Button>
            )}
          </div>
          <Button
            onClick={connectGmb}
            disabled={connecting}
            className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4" />
                Connect GMB
              </>
            )}
          </Button>
        </div>

        {/* Warning Message (tokens saved but API not enabled) */}
        {warning && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-yellow-600 text-lg">⚠️</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    Connection Successful (Action Required)
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {warning}
                  </p>
                </div>
                <button
                  onClick={() => setWarning("")}
                  className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
                >
                  ✕
                </button>
              </div>
            </CardContent>
          </Card>
        )}

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
                <p className="text-muted-foreground">Loading accounts...</p>
              </div>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="max-w-md mx-auto text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-10 h-10 text-blue-500" />
                </div>
                <CardTitle className="mb-2">No Google My Business accounts connected</CardTitle>
                <CardDescription className="mb-6">
                  Connect your Google My Business account to start managing locations, scheduling posts, and responding to reviews.
                </CardDescription>
                <Button
                  onClick={connectGmb}
                  disabled={connecting}
                  className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4" />
                      Connect Your First Account
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Why multiple cards?</strong> One Google login can have several &quot;location groups&quot; (e.g. different businesses). Each card below is one group. Click a card → use &quot;Sync Locations&quot; to load <em>that</em> group&apos;s locations only. Locations are no longer mixed between cards.
                </p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((acc) => (
                <Link
                  key={acc.id}
                  href={`/gmb/${acc.id}`}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <Badge variant="default" className="bg-success/10 text-success border-success/20">
                          <Check className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      </div>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {acc.displayName || 'Google My Business'}
                      </CardTitle>
                      <CardDescription className="space-y-1">
                        <span className="block text-xs text-muted-foreground">
                          One location group — open and &quot;Sync Locations&quot; for this group only
                        </span>
                        <span className="block text-xs text-muted-foreground font-mono">
                          {acc.accountType === "LOCATION_GROUP" ? "Location group" : acc.accountType || "Account"} · {acc.externalId}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm font-medium text-primary group-hover:text-primary/80">
                        Manage locations
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
