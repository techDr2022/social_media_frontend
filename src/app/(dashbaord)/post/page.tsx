"use client";

import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Instagram, Facebook, Youtube, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PostPage() {
  const router = useRouter();

  const platforms = [
    {
      id: "instagram",
      name: "Instagram",
      description: "Create Instagram posts and reels",
      icon: Instagram,
      color: "from-pink-500 to-purple-500",
      hoverColor: "hover:border-pink-500/50",
      route: "/instagram",
    },
    {
      id: "facebook",
      name: "Facebook",
      description: "Create Facebook posts",
      icon: Facebook,
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:border-blue-500/50",
      route: "/facebook",
    },
    {
      id: "youtube",
      name: "YouTube",
      description: "Upload YouTube videos",
      icon: Youtube,
      color: "from-red-500 to-red-600",
      hoverColor: "hover:border-red-500/50",
      route: "/youtube",
    },
  ];

  return (
    <MainLayout
      title="Create Post"
      subtitle="Select a platform to create a post"
    >
      <div className="max-w-5xl mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <Card
                key={platform.id}
                onClick={() => router.push(platform.route)}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-slate-900 border border-slate-800 text-white shadow-sm hover:bg-slate-800",
                  platform.hoverColor
                )}
              >
                <CardHeader>
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br mb-4",
                    platform.color
                  )}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    {platform.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-300">
                    {platform.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-primary text-sm font-medium group">
                    Create Post
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
