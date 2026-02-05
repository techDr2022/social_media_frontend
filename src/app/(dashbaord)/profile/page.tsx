"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Calendar, Shield, Loader2, Save, Edit2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function ProfilePage() {
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      // Wait for auth to finish loading
      if (authLoading) return;
      
      // If no session, don't try to load
      if (!session?.user?.id) {
        setLoading(false);
        loadedUserIdRef.current = null;
        return;
      }

      // If we've already loaded for this user, don't reload
      const currentUserId = session.user.id;
      if (loadedUserIdRef.current === currentUserId) {
        return;
      }

      setLoading(true);
      try {
        const { data: { user: userData } } = await supabase.auth.getUser();
        if (userData) {
          setUser(userData);
          setEmail(userData.email || "");
          setDisplayName(userData.user_metadata?.display_name || userData.user_metadata?.full_name || "");
          loadedUserIdRef.current = currentUserId;
        }
      } catch (err: any) {
        console.error("Failed to load profile:", err);
        setError("Failed to load profile information");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [session?.user?.id, authLoading]);

  async function handleSave() {
    if (!session) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Update Supabase Auth user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Also update PostgreSQL database via backend API
      const token = session.access_token;
      const backendResponse = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: displayName || undefined,
        }),
      });

      if (!backendResponse.ok) {
        const backendError = await backendResponse.json().catch(() => ({ error: "Failed to update database" }));
        console.warn("Backend update failed:", backendError);
        // Don't throw - Supabase update succeeded, just log the warning
      }

      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  // Show loading only if auth is loading or profile is loading
  if (authLoading || loading) {
    return (
      <MainLayout title="Profile" subtitle="Loading your profile...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const initials = displayName
    ? displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : email
    ? email[0].toUpperCase()
    : "U";

  return (
    <MainLayout
      title="Profile"
      subtitle="Manage your account information and preferences"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">
                  {displayName || "User"}
                </CardTitle>
                <CardDescription className="text-base">
                  {email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-success">
            <CardContent className="pt-6">
              <p className="text-sm text-success">{success}</p>
            </CardContent>
          </Card>
        )}

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-secondary"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Details
            </CardTitle>
            <CardDescription>
              View your account information and metadata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">User ID</Label>
                <p className="text-sm font-mono text-foreground break-all">
                  {user?.id || "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Account Created
                </Label>
                <p className="text-sm text-foreground">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Navigate to other account-related pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/settings">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/connect">
                  <User className="h-4 w-4 mr-2" />
                  Connected Accounts
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}



