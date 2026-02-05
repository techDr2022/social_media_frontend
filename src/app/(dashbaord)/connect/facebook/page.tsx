"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, Check, Loader2, Calendar, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type FacebookAccount = {
  id: string;
  displayName: string;
  externalId: string;
  createdAt: string;
  platform: string;
};

export default function ConnectFacebookPage() {
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

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
      const facebookAccounts = json.filter(
        (a: any) => a.platform?.toLowerCase() === "facebook"
      );

      setAccounts(facebookAccounts);
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

  async function connectFacebook() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    setConnecting(true);
    setStatus("Redirecting to Facebook...");

    try {
      const res = await fetch("/api/social-accounts/connect/facebook", {
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
      console.error("Facebook connect error", err);
      setStatus("Error connecting Facebook: " + (err.message ?? String(err)));
      setConnecting(false);
    }
  }

  async function deleteAccount(accountId: string, accountName: string) {
    if (!confirm(`Are you sure you want to delete "${accountName}"?\n\nThis will permanently remove the connection and you'll need to reconnect to use this Facebook Page again.`)) {
      return;
    }

    setDeletingAccountId(accountId);
    setStatus("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("You must be logged in.");
      setDeletingAccountId(null);
      return;
    }

    try {
      const res = await fetch(`/api/social-accounts/${accountId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let errorMessage = "Unknown error";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || `Failed to delete account (${res.status})`;
        } catch {
          const errorText = await res.text().catch(() => "");
          errorMessage = errorText || `Failed to delete account (${res.status})`;
        }
        setStatus(`Failed to delete account: ${errorMessage}`);
        setDeletingAccountId(null);
        return;
      }

      // Reload accounts list
      await loadAccounts();
      setStatus(`Successfully deleted "${accountName}"`);
      setTimeout(() => setStatus(""), 3000);
    } catch (err: any) {
      console.error("Delete account error", err);
      setStatus(`Error deleting account: ${err.message || "Network error"}`);
    } finally {
      setDeletingAccountId(null);
    }
  }

  return (
    <MainLayout
      title="Facebook Accounts"
      subtitle="Connect and manage your Facebook Pages"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href="/connect"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Connect
        </Link>

        {/* Connect Button */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                <Facebook className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Connect Facebook Account</CardTitle>
                <CardDescription>
                  Link your Facebook Pages to start posting and scheduling content
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={connectFacebook}
              disabled={connecting}
              className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              size="lg"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Facebook className="h-4 w-4" />
                  Connect Facebook Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Status Message */}
        {status && (
          <Card className={cn(
            status.startsWith("Failed") || status.startsWith("Error") ? "border-destructive" : "border-border"
          )}>
            <CardContent className="pt-6">
              <p className={cn(
                "text-sm",
                status.startsWith("Failed") || status.startsWith("Error") ? "text-destructive" : "text-muted-foreground"
              )}>
                {status}
              </p>
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
                No Facebook accounts connected yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Click the button above to connect your first Facebook Page.
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                          <Facebook className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{acc.displayName}</CardTitle>
                          <CardDescription className="text-xs">
                            Page ID: {acc.externalId}
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
                      <Link href={`/facebook/${acc.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Calendar className="h-4 w-4" />
                          Manage Page
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAccount(acc.id, acc.displayName)}
                        disabled={deletingAccountId === acc.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                      >
                        {deletingAccountId === acc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
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
