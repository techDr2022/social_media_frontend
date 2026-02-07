"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, Loader2, MapPin, RefreshCw, Plus, MessageSquare, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type GmbAccount = {
  id: string;
  displayName: string;
  externalId: string;
  platform: string;
  isActive: boolean;
};

type GmbLocation = {
  id: string;
  name: string;
  gmbLocationId: string;
  phoneNumber: string | null;
  address: string | null;
};

export default function GmbAccountPage({ params }: any) {
  const router = useRouter();
  const [account, setAccount] = useState<GmbAccount | null>(null);
  const [locations, setLocations] = useState<GmbLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("");

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setError("");

      // Get accountId from params (handle both sync and async)
      let id: string;
      try {
        if (params && typeof params === 'object' && 'accountId' in params) {
          id = params.accountId;
        } else if (params && typeof params.then === 'function') {
          const resolvedParams = await params;
          id = resolvedParams.accountId;
        } else {
          console.error("Params structure:", params);
          setError("Invalid account ID - params not found");
          setLoading(false);
          return;
        }

        if (!id) {
          setError("Account ID is missing");
          setLoading(false);
          return;
        }

        setAccountId(id);
      } catch (err: any) {
        console.error("Error parsing params:", err);
        setError("Error parsing account ID: " + err.message);
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }

      try {
        // Load account details
        const res = await fetch("/api/social-accounts", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorText = await res.text();
          setError(`Failed to load account: ${errorText}`);
          setLoading(false);
          return;
        }

        const json = await res.json();
        
        // Filter for GMB accounts
        const gmbAccounts = json.filter(
          (a: any) => a.platform === "gmb"
        );
        
        const foundAccount = gmbAccounts.find((a: any) => a.id === id);
        
        if (!foundAccount) {
          setError("GMB account not found");
          setLoading(false);
          return;
        }

        setAccount(foundAccount);
        setAccountId(id);

        // Load locations (pass id directly - setState is async so accountId wouldn't be ready yet)
        await loadLocations(token, id);
      } catch (err: any) {
        console.error("Error loading account:", err);
        setError(`Failed to load account: ${err.message}`);
        setLoading(false);
      }
    }

    loadAccount();
  }, [params]);

  async function loadLocations(token: string, accountIdParam?: string) {
    const idToUse = accountIdParam ?? accountId;
    if (!idToUse) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/v1/gmb/locations?accountId=${idToUse}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        setStatus(`Failed to load locations: ${errorText}`);
        setLoading(false);
        return;
      }

      const json = await res.json();
      setLocations(json || []);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading locations:", err);
      setStatus(`Failed to load locations: ${err.message}`);
      setLoading(false);
    }
  }

  async function syncLocations() {
    if (!account) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    setSyncing(true);
    setStatus("Syncing locations from Google My Business...");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/v1/gmb/locations/sync`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ socialAccountId: account.id }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        setStatus(`Failed to sync locations: ${errorText}`);
        setSyncing(false);
        return;
      }

      const result = await res.json();
      setStatus(`Successfully synced ${result.processed || 0} locations`);
      setSyncing(false);

      // Reload locations
      await loadLocations(token, account.id);
    } catch (err: any) {
      console.error("Error syncing locations:", err);
      setStatus(`Failed to sync locations: ${err.message}`);
      setSyncing(false);
    }
  }

  async function deleteLocation(locId: string) {
    if (!confirm("Delete this location? You can sync again to re-display it.")) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setDeletingLocationId(locId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/v1/gmb/locations/${locId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setStatus("Failed to delete location");
        return;
      }

      setLocations((prev) => prev.filter((l) => l.id !== locId));
    } catch (err: any) {
      setStatus(`Failed: ${err.message}`);
    } finally {
      setDeletingLocationId(null);
    }
  }

  async function deleteAccount() {
    if (!account) return;
    if (!confirm(`Delete this GMB account "${account.displayName}"? You can reconnect and sync again later.`)) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("You must be logged in.");
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await fetch(`/api/social-accounts/${account.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(err.message || `Failed to delete account (${res.status})`);
        setDeletingAccount(false);
        return;
      }

      router.push("/gmb");
    } catch (err: any) {
      setStatus(`Failed to delete: ${err.message}`);
      setDeletingAccount(false);
    }
  }

  if (loading) {
    return (
      <MainLayout title="Loading..." subtitle="Loading GMB account">
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading account...</p>
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (error || !account) {
    return (
      <MainLayout title="Error" subtitle="Failed to load GMB account">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Account not found"}</p>
            <Button
              onClick={() => router.push("/gmb")}
              variant="outline"
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to GMB
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={account.displayName || "Google My Business"}
      subtitle={`This location group (ID: ${account.externalId}) — locations listed below are only for this group`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <Button
            onClick={() => router.push("/gmb")}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to GMB
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={syncLocations}
              disabled={syncing}
              className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Locations
                </>
              )}
            </Button>
            <Button
              onClick={deleteAccount}
              disabled={deletingAccount}
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deletingAccount ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <Card className={cn(
            status.startsWith("Failed") || status.startsWith("Error")
              ? "border-destructive"
              : "border-green-500/50 bg-green-500/10"
          )}>
            <CardContent className="pt-6">
              <p className={cn(
                "text-sm",
                status.startsWith("Failed") || status.startsWith("Error")
                  ? "text-destructive"
                  : "text-green-700 dark:text-green-300"
              )}>
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Locations Grid */}
        {locations.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="max-w-md mx-auto text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-10 h-10 text-blue-500" />
                </div>
                <CardTitle className="mb-2">No locations found</CardTitle>
                <CardDescription className="mb-6">
                  {syncing
                    ? "Syncing locations from Google My Business..."
                    : "Click 'Sync Locations' to fetch your Google My Business locations."}
                </CardDescription>
                <p className="text-xs text-muted-foreground mb-4">
                  If you have several GMB accounts, open each card on the GMB hub and click Sync once. If sync fails, enable &quot;My Business Business Information API&quot; in Google Cloud Console.
                </p>
                <Button
                  onClick={syncLocations}
                  disabled={syncing}
                  className="gap-2"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Sync Locations
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-2xl font-bold">Locations ({locations.length})</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or address..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              {locations
                .filter(
                  (loc) =>
                    !locationSearch.trim() ||
                    loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
                    (loc.address?.toLowerCase().includes(locationSearch.toLowerCase()) ?? false)
                )
                .map((location) => (
                <div
                  key={location.id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border p-4 hover:bg-muted/50"
                >
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{location.name}</span>
                    {location.address && (
                      <span className="ml-2 text-sm text-muted-foreground">• {location.address}</span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/gmb/${account.id}/locations/${location.id}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      View Posts
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/gmb/${account.id}/locations/${location.id}?create=1`)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Post Now
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteLocation(location.id)}
                      disabled={deletingLocationId === location.id}
                    >
                      {deletingLocationId === location.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
