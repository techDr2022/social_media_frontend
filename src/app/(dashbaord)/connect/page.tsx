"use client";

import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Instagram, Facebook, Youtube, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConnectPage() {
  const router = useRouter();

  const platforms = [
    {
      name: "Instagram",
      description: "Connect your Instagram Business or Creator account",
      icon: Instagram,
      color: "from-pink-500 to-purple-500",
      hoverColor: "hover:border-pink-500/50",
      route: "/connect/instagram",
    },
    {
      name: "Facebook",
      description: "Connect your Facebook Pages",
      icon: Facebook,
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:border-blue-500/50",
      route: "/connect/facebook",
    },
    {
      name: "YouTube",
      description: "Connect your YouTube channel",
      icon: Youtube,
      color: "from-red-500 to-red-600",
      hoverColor: "hover:border-red-500/50",
      route: "/connect/youtube",
    },
  ];

  return (
    <MainLayout
      title="Connect Accounts"
      subtitle="Connect your social media accounts to start posting content"
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <Card
                key={platform.name}
                onClick={() => router.push(platform.route)}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
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
                  <CardTitle>{platform.name}</CardTitle>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-primary text-sm font-medium group">
                    Connect Account
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
