"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { UpcomingPosts } from "@/components/dashboard/UpcomingPosts";
import { ConnectedAccounts } from "@/components/dashboard/ConnectedAccounts";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  Plus,
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
        <Link href="/create-post">
          <Button variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
      </div>

      {/* Analytics Placeholder */}
      <div className="mb-8">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No analytics available</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Posts */}
        <div className="space-y-6 lg:col-span-2">
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
