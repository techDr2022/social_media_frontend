"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Instagram,
  Facebook,
  Youtube,
  Calendar,
  BarChart3,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function HomeContent() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Check if this is an Instagram OAuth callback (redirected to root)
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    
    if (code && state) {
      // This is an Instagram OAuth callback - redirect to the proper callback handler
      console.log("[Root Page] Detected Instagram OAuth callback, redirecting to callback handler");
      router.replace(`/social-accounts/callback/instagram?code=${code}&state=${state}`);
      return;
    }

    // Check if this is a Google OAuth callback (Supabase OAuth uses ?code=... without state)
    // If it's a Supabase OAuth callback, redirect to auth callback handler
    if (code && !state) {
      // This might be a Supabase OAuth callback (Google login)
      // Redirect to auth callback to handle it properly
      console.log("[Root Page] Detected Supabase OAuth callback, redirecting to auth callback");
      router.replace(`/auth/callback?code=${code}`);
      return;
    }

    // Check if URL is malformed (missing protocol) - this happens when Supabase redirects incorrectly
    // Example: localhost:3001?code=... instead of http://localhost:3001/auth/callback?code=...
    const currentUrl = window.location.href;
    if (currentUrl.includes('localhost:3001?code=') && !currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
      console.error("[Root Page] ⚠️ Malformed redirect URL detected! Fixing...");
      // Extract the code parameter
      const codeMatch = currentUrl.match(/code=([^&]+)/);
      if (codeMatch) {
        const extractedCode = codeMatch[1];
        console.log("[Root Page] Extracted code, redirecting to proper callback URL");
        // Redirect to proper callback URL with protocol
        window.location.replace(`http://localhost:3001/auth/callback?code=${extractedCode}`);
        return;
      }
    }

    // If user is logged in, show redirecting message then redirect to dashboard
    if (!authLoading && session) {
      setShouldRedirect(true);
      // Show redirecting message for at least 1.5 seconds before redirecting
      const timer = setTimeout(() => {
        router.replace("/dashboard");
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [authLoading, session, router, searchParams]);

  // Show redirecting message if logged in
  if (shouldRedirect || (!authLoading && session)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/30">
              <Sparkles className="h-8 w-8 text-primary-foreground animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
              Redirecting to Dashboard...
            </h2>
            <p className="text-muted-foreground">Taking you to your social media hub</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Calendar,
      title: "Schedule Posts",
      description: "Plan and schedule your content across all platforms in advance. Set it and forget it.",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Track your performance with detailed analytics and engagement metrics.",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Zap,
      title: "Quick Publishing",
      description: "Create and publish content instantly across multiple platforms simultaneously.",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      icon: Users,
      title: "Multi-Account Management",
      description: "Manage multiple social media accounts from one centralized dashboard.",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  const platforms = [
    {
      name: "Instagram",
      icon: Instagram,
      description: "Post photos, videos, and reels. Schedule content and manage your Instagram presence.",
      gradient: "from-pink-500 to-purple-500",
    },
    {
      name: "Facebook",
      icon: Facebook,
      description: "Manage Facebook pages, publish posts, and engage with your audience.",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      name: "YouTube",
      icon: Youtube,
      description: "Upload videos, manage your channel, and schedule content releases.",
      gradient: "from-red-500 to-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center space-y-6 mb-16 animate-fade-in-up">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/30">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            Social Media Manager
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Manage, schedule, and analyze all your social media content from one powerful platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/login">
              <Button size="lg" variant="gradient" className="text-lg px-8 h-12 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 h-12 border-border/50 hover:bg-secondary/50">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Powerful features to streamline your social media workflow
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="glass border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-2", feature.bgColor)}>
                      <Icon className={cn("h-6 w-6", feature.color)} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Platforms Section */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Supported Platforms
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Connect and manage your accounts across the most popular social media platforms
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {platforms.map((platform, index) => {
              const Icon = platform.icon;
              return (
                <Card
                  key={index}
                  className="glass border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02] animate-fade-in-up group"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <CardHeader>
                    <div className={cn("w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg", platform.gradient)}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{platform.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{platform.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="glass border-border/50 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl mb-2">Ready to Get Started?</CardTitle>
              <CardDescription className="text-lg">
                Join thousands of creators and businesses managing their social media efficiently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button size="lg" variant="gradient" className="text-lg px-8 h-12 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30">
                  Start Managing Your Social Media
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {" · "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}


/*
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      console.error("API URL is not set");
      return;
    }

    // health check
    fetch(`${baseUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(JSON.stringify(data)))
      .catch(() => setHealth("error"));

    // list users
    fetch(`${baseUrl}/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error(err));
  }, []); */
