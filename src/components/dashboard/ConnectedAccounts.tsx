"use client";

import { useEffect, useState } from "react";
import { Instagram, Facebook, Youtube, Building2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { supabase } from "@/lib/supabaseclient";

const platformIcons: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  gmb: Building2,
};

const platformColors: Record<string, string> = {
  instagram: "from-pink-500 to-purple-500",
  facebook: "from-blue-500 to-blue-600",
  youtube: "from-red-500 to-red-600",
  gmb: "from-blue-500 to-blue-600",
};

interface SocialAccount {
  id: string;
  platform: string;
  displayName?: string;
  username?: string;
  isActive: boolean;
}

export function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch("/api/social-accounts", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const socialAccounts = await res.json();
          
          // Group accounts by platform and get unique platforms
          const platformMap = new Map<string, SocialAccount>();
          
          socialAccounts.forEach((acc: SocialAccount) => {
            const platform = acc.platform?.toLowerCase() || "";
            if (!platformMap.has(platform)) {
              platformMap.set(platform, acc);
            }
          });

          // Get all available platforms (instagram, facebook, youtube, gmb)
          const allPlatforms = ["instagram", "facebook", "youtube", "gmb"];
          const accountsList = allPlatforms.map(platform => {
            const account = platformMap.get(platform);
            return {
              platform: platform.charAt(0).toUpperCase() + platform.slice(1),
              icon: platformIcons[platform] || Instagram,
              username: account?.username || account?.displayName || `@${platform}`,
              connected: !!account,
              accountId: account?.id,
              color: platformColors[platform] || platformColors.instagram,
            };
          });

          setAccounts(accountsList as any);
        }
      } catch (err) {
        console.error("Failed to load accounts:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAccounts();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Connected Accounts</h3>
            <p className="text-sm text-muted-foreground">Manage your social profiles</p>
          </div>
        </div>
        <div className="p-5 text-center text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card animate-fade-in-up" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Connected Accounts</h3>
          <p className="text-sm text-muted-foreground">Manage your social profiles</p>
        </div>
        <Link href="/connect">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </Link>
      </div>

      <div className="p-5 space-y-4">
        {accounts.map((account: any, index) => {
          const Icon = account.icon;
          return (
            <div
              key={account.platform}
              className={cn(
                "group flex items-center gap-4 rounded-lg border border-border p-4 transition-all duration-200 hover:border-primary/30",
                !account.connected && "opacity-60"
              )}
              style={{ animationDelay: `${500 + index * 100}ms` }}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br",
                  account.color
                )}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {account.platform}
                  </span>
                  {account.connected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {account.username}
                </p>
              </div>

              {!account.connected ? (
                <Link href={`/connect/${account.platform.toLowerCase()}`}>
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                </Link>
              ) : (
                <Link href={`/${account.platform.toLowerCase()}`}>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
