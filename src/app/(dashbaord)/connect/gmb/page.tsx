"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, Loader2, Calendar, ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type GmbAccount = {
  id: string;
  displayName: string;
  externalId: string;
  createdAt: string;
  platform: string;
};

export default function ConnectGmbPage() {
  const [accounts, setAccounts] = useState<GmbAccount[]>([]);
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
      const gmbAccounts = json.filter(
        (a: any) => a.platform?.toLowerCase() === "gmb"
      );

      setAccounts(gmbAccounts);
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

  async function connectGmb() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    setConnecting(true);
    setStatus("Redirecting to Google My Business...");

    try {
      const res = await fetch("/api/social-accounts/connect/gmb", {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        redirect: "manual",
      });

      // Check if it's a redirect response (3xx status)
      if (res.status >= 300 && res.status < 400) {
        const redirectUrl = res.headers.get("location");
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
      }

      // If not a redirect, try to get the URL from response
      const redirectUrl = res.headers.get("location");
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      // If response is OK, try to parse as JSON (in case backend returns URL)
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.url || data?.redirectUrl) {
          window.location.href = data.url || data.redirectUrl;
          return;
        }
      }

      // If we get here, something went wrong
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

  return (
    <MainLayout
      title="Google My Business"
      subtitle="Connect and manage your Google My Business locations"
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
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Connect Google My Business</CardTitle>
                <CardDescription>
                  Link your Google My Business account to schedule posts and manage reviews
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={connectGmb}
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
                  <Building2 className="h-4 w-4" />
                  Connect Google My Business
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
                No Google My Business accounts connected yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Click the button above to connect your Google My Business account.
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
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{acc.displayName}</CardTitle>
                          <CardDescription className="text-xs">
                            Account ID: {acc.externalId}
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
                      <Link href={`/gmb/${acc.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <MapPin className="h-4 w-4" />
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
