"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { UpcomingPosts } from "@/components/dashboard/UpcomingPosts";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { ConnectedAccounts } from "@/components/dashboard/ConnectedAccounts";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  TrendingUp,
  Eye,
  Plus,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    scheduled: 0,
    posted: 0,
    connectedAccounts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch social accounts
        const accountsRes = await fetch("/api/social-accounts", {
          headers: { Authorization: `Bearer ${token}` },
        });

        let accounts: any[] = [];
        if (accountsRes.ok) {
          accounts = await accountsRes.json();
        }

        // Fetch scheduled posts
        const postsRes = await fetch("/api/scheduled-posts", {
          headers: { Authorization: `Bearer ${token}` },
        });

        let allPosts: any[] = [];
        let scheduledCount = 0;
        let postedCount = 0;
        if (postsRes.ok) {
          allPosts = await postsRes.json();
          // Count scheduled and posted
          allPosts.forEach((post: any) => {
            if (post.status === "scheduled" || post.status === "pending" || 
                (post.scheduledAt && new Date(post.scheduledAt) > new Date())) {
              scheduledCount++;
            } else if (post.status === "success" || post.postedAt) {
              postedCount++;
            }
          });
        }

        setStats({
          scheduled: scheduledCount,
          posted: postedCount,
          connectedAccounts: accounts.length,
        });
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <MainLayout title="Dashboard" subtitle="Loading your social media overview...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Welcome back! Here's your social media overview."
    >
      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/post">
          <Button variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </Link>
        <Link href="/schedule">
          <Button variant="outline" className="gap-2">
            <Zap className="h-4 w-4" />
            Quick Schedule
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Connected Accounts"
          value={stats.connectedAccounts}
          icon={Users}
          delay={0}
        />
        <StatCard
          title="Scheduled Posts"
          value={stats.scheduled}
          change={stats.scheduled > 0 ? 8 : undefined}
          icon={Calendar}
          delay={50}
        />
        <StatCard
          title="Total Engagement"
          value="24.8K"
          change={12}
          icon={TrendingUp}
          delay={100}
        />
        <StatCard
          title="Total Views"
          value="128K"
          change={-3}
          icon={Eye}
          delay={150}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Charts & Posts */}
        <div className="space-y-6 lg:col-span-2">
          <ActivityChart />
          <UpcomingPosts />
        </div>

        {/* Right Column - Connected Accounts */}
        <div className="lg:col-span-1">
          <ConnectedAccounts />
        </div>
      </div>
    </MainLayout>
  );
}
