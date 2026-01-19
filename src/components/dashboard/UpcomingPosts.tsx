"use client";

import { useEffect, useState } from "react";
import { Instagram, Facebook, Youtube, Clock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseclient";
import Link from "next/link";

const platformIcons = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};

const platformColors = {
  instagram: "text-pink-500",
  facebook: "text-blue-500",
  youtube: "text-red-500",
};

interface Post {
  id: string;
  platform: "instagram" | "facebook" | "youtube";
  caption: string;
  scheduledTime: string;
  status: "scheduled" | "draft" | "published" | "pending" | "success";
  image?: string;
  scheduledAt: string;
}

export function UpcomingPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScheduledPosts() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch("/api/scheduled-posts", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const scheduledPosts = await res.json();
          
          // Transform backend data to component format
          const transformedPosts: Post[] = scheduledPosts
            .filter((post: any) => 
              post.status === "scheduled" || 
              post.status === "pending" ||
              (post.scheduledAt && new Date(post.scheduledAt) > new Date())
            )
            .slice(0, 4) // Show only 4 most recent
            .map((post: any) => {
              const scheduledDate = new Date(post.scheduledAt);
              const now = new Date();
              const diffTime = scheduledDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              let scheduledTime = "";
              if (diffDays === 0) {
                scheduledTime = `Today, ${scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
              } else if (diffDays === 1) {
                scheduledTime = `Tomorrow, ${scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
              } else {
                scheduledTime = scheduledDate.toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                });
              }

              return {
                id: post.id,
                platform: post.platform?.toLowerCase() || "instagram",
                caption: post.content || "No caption",
                scheduledTime,
                status: post.status === "pending" ? "scheduled" : post.status,
                image: post.mediaUrl,
                scheduledAt: post.scheduledAt,
              };
            })
            .sort((a: Post, b: Post) => 
              new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
            );

          setPosts(transformedPosts);
        }
      } catch (err) {
        console.error("Failed to load scheduled posts:", err);
      } finally {
        setLoading(false);
      }
    }

    loadScheduledPosts();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Upcoming Posts</h3>
            <p className="text-sm text-muted-foreground">Your scheduled content</p>
          </div>
        </div>
        <div className="p-5 text-center text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card animate-fade-in-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Upcoming Posts</h3>
          <p className="text-sm text-muted-foreground">Your scheduled content</p>
        </div>
        <Link href="/schedule">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="p-5 text-center text-muted-foreground">
          <p className="mb-2">No upcoming posts scheduled</p>
          <Link href="/post">
            <Button variant="outline" size="sm">Create Your First Post</Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {posts.map((post, index) => {
            const PlatformIcon = platformIcons[post.platform];
            const platformColor = platformColors[post.platform];

            return (
              <div
                key={post.id}
                className="group flex items-start gap-4 p-5 transition-colors hover:bg-secondary/30"
                style={{ animationDelay: `${300 + index * 100}ms` }}
              >
                {/* Image or Platform Icon */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {post.image ? (
                    <img
                      src={post.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <PlatformIcon className={cn("h-6 w-6", platformColor)} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-card",
                      platformColor
                    )}
                  >
                    <PlatformIcon className="h-3 w-3" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-2 text-sm text-foreground">
                    {post.caption}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {post.scheduledTime}
                    </div>
                    <Badge
                      variant={post.status === "scheduled" ? "default" : "secondary"}
                      className={cn(
                        "text-xs capitalize",
                        post.status === "scheduled" && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      {post.status}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border">
                    <DropdownMenuItem>Edit Post</DropdownMenuItem>
                    <DropdownMenuItem>Reschedule</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
