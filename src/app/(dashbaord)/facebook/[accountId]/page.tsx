"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, ArrowLeft, Plus, Calendar, Loader2 } from "lucide-react";

type FacebookAccount = {
  id: string;
  displayName: string;
  externalId: string;
  platform: string;
  isActive: boolean;
  createdAt: string;
};

export default function FacebookAccountPage({ params }: any) {
  const router = useRouter();
  const [account, setAccount] = useState<FacebookAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accountId, setAccountId] = useState<string>("");

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setError("");

      let id: string;
      try {
        if (params && typeof params === 'object' && 'accountId' in params) {
          id = params.accountId;
        } else if (params && typeof params.then === 'function') {
          const resolvedParams = await params;
          id = resolvedParams.accountId;
        } else {
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
        const facebookAccounts = json.filter(
          (a: any) => a.platform === "facebook"
        );
        
        const foundAccount = facebookAccounts.find(
          (a: any) => String(a.id).trim() === String(id).trim()
        );

        if (!foundAccount) {
          setError(`Account not found. Looking for: ${id}`);
          setLoading(false);
          return;
        }

        setAccount(foundAccount);
      } catch (err: any) {
        setError("Error loading account: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [params]);

  if (loading) {
    return (
      <MainLayout title="Loading..." subtitle="Loading Facebook page...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading page...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !account) {
    return (
      <MainLayout title="Error" subtitle="Failed to load Facebook page">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p className="text-destructive mb-4">{error || "Account not found"}</p>
            <Button asChild variant="outline">
              <Link href="/facebook">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Facebook
              </Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={account.displayName}
      subtitle={`Page ID: ${account.externalId}`}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          href="/facebook"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Facebook
        </Link>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant={account.isActive ? "default" : "secondary"}
            className={account.isActive ? "bg-success/10 text-success border-success/20" : ""}
          >
            {account.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Post Now</CardTitle>
                  <CardDescription>Create and publish immediately</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push(`/facebook/post/${account.id}`)}
                className="w-full gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                size="lg"
              >
                <Facebook className="h-4 w-4" />
                Post Now
              </Button>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-muted-foreground">Schedule</CardTitle>
                  <CardDescription>Schedule posts for later</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                disabled
                variant="outline"
                className="w-full"
                size="lg"
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
