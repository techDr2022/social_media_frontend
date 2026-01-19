"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Instagram, Facebook, Youtube, ArrowRight, Users, BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = {
  id: string;
  name: string;
  icon: any;
  route: string;
  connectedCount: number;
  description: string;
  color: string;
  hoverColor: string;
};

type SocialAccount = {
  id: string;
  platform: string;
  displayName?: string;
  username?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError("");

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

        let accounts: SocialAccount[] = [];
        if (res.ok) {
          accounts = await res.json();
        } else {
          console.warn("Failed to load accounts:", res.status);
        }

        const accountCounts: Record<string, number> = {};
        accounts.forEach((acc) => {
          const platform = acc.platform?.toLowerCase() || "";
          accountCounts[platform] = (accountCounts[platform] || 0) + 1;
        });

        const platformDefinitions: Platform[] = [
          {
            id: "youtube",
            name: "YouTube",
            icon: Youtube,
            route: "/youtube",
            connectedCount: accountCounts.youtube || 0,
            description: "Upload videos and manage your YouTube channel",
            color: "from-red-500 to-red-600",
            hoverColor: "hover:border-red-500/50",
          },
          {
            id: "instagram",
            name: "Instagram",
            icon: Instagram,
            route: "/instagram",
            connectedCount: accountCounts.instagram || 0,
            description: "Post photos, videos, and schedule content",
            color: "from-pink-500 to-purple-500",
            hoverColor: "hover:border-pink-500/50",
          },
          {
            id: "facebook",
            name: "Facebook",
            icon: Facebook,
            route: "/facebook",
            connectedCount: accountCounts.facebook || 0,
            description: "Manage Facebook pages and publish posts",
            color: "from-blue-500 to-blue-600",
            hoverColor: "hover:border-blue-500/50",
          },
        ];

        setPlatforms(platformDefinitions);
      } catch (err: any) {
        console.error("Error loading dashboard:", err);
        setError(`Failed to load dashboard: ${err.message || "Network error"}`);
        setPlatforms([
          {
            id: "youtube",
            name: "YouTube",
            icon: Youtube,
            route: "/youtube",
            connectedCount: 0,
            description: "Upload videos and manage your YouTube channel",
            color: "from-red-500 to-red-600",
            hoverColor: "hover:border-red-500/50",
          },
          {
            id: "instagram",
            name: "Instagram",
            icon: Instagram,
            route: "/instagram",
            connectedCount: 0,
            description: "Post photos, videos, and schedule content",
            color: "from-pink-500 to-purple-500",
            hoverColor: "hover:border-pink-500/50",
          },
          {
            id: "facebook",
            name: "Facebook",
            icon: Facebook,
            route: "/facebook",
            connectedCount: 0,
            description: "Manage Facebook pages and publish posts",
            color: "from-blue-500 to-blue-600",
            hoverColor: "hover:border-blue-500/50",
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <MainLayout title="Dashboard" subtitle="Loading your platforms...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const totalAccounts = platforms.reduce((sum, p) => sum + p.connectedCount, 0);

  return (
    <MainLayout
      title="Social Media Dashboard"
      subtitle="Connect, manage, and schedule content across all your social media platforms from one place"
    >
      <div className="space-y-6">
        {error && (
          <Card className="border-warning">
            <CardContent className="pt-6">
              <p className="text-sm text-warning">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Platform Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <Link
                key={platform.id}
                href={platform.route}
                className="group"
              >
                <Card className={cn(
                  "h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
                  platform.hoverColor
                )}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn(
                        "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center group-hover:scale-110 transition-transform",
                        platform.color
                      )}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge
                        variant={platform.connectedCount > 0 ? "default" : "secondary"}
                        className={cn(
                          platform.connectedCount > 0 && "bg-success/10 text-success border-success/20"
                        )}
                      >
                        {platform.connectedCount > 0
                          ? `${platform.connectedCount} ${platform.connectedCount === 1 ? "account" : "accounts"}`
                          : "Not connected"}
                      </Badge>
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {platform.name}
                    </CardTitle>
                    <CardDescription>{platform.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm font-medium text-primary group-hover:text-primary/80">
                      {platform.connectedCount > 0 ? "Manage accounts" : "Connect account"}
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Accounts</p>
                  <p className="text-3xl font-bold text-foreground">{totalAccounts}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Platforms Available</p>
                  <p className="text-3xl font-bold text-foreground">{platforms.length}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Quick Actions</p>
                  <Link
                    href="/schedule"
                    className="text-3xl font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    Schedule
                  </Link>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
