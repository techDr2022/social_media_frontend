"use client";

import { useEffect, useState, useCallback } from "react";
import { Instagram, Facebook, Youtube, Clock, MoreHorizontal, Calendar, StopCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [reschedulePost, setReschedulePost] = useState<Post | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);

  const loadScheduledPosts = useCallback(async () => {
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
            .filter((post: any) => {
              if (!post.scheduledAt) return false;
              
              // Only show scheduled/pending posts that are in the future
              // Compare full date including year, month, day, hour, minute, second
              const scheduledDate = new Date(post.scheduledAt);
              const now = new Date();
              
              // Check if scheduled date is in the future (includes year check)
              const isFuture = scheduledDate.getTime() > now.getTime();
              
              // Include posts with scheduled/pending status
              // For YouTube: also include "success" status if scheduledAt is in future (YouTube uses native scheduling)
              const isScheduled = post.status === "scheduled" || 
                                post.status === "pending" ||
                                (post.status === "success" && post.platform?.toLowerCase() === "youtube" && isFuture);
              
              return isScheduled && isFuture;
            })
            .slice(0, 5) // Show only next 5 posts
            .map((post: any) => {
              const scheduledDate = new Date(post.scheduledAt);
              const now = new Date();
              
              // Check if scheduled date is today, tomorrow, or later
              const scheduledDateStr = scheduledDate.toDateString();
              const todayStr = now.toDateString();
              const tomorrow = new Date(now);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const tomorrowStr = tomorrow.toDateString();

              let scheduledTime = "";
              if (scheduledDateStr === todayStr) {
                scheduledTime = `Today, ${scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
              } else if (scheduledDateStr === tomorrowStr) {
                scheduledTime = `Tomorrow, ${scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
              } else {
                scheduledTime = scheduledDate.toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric",
                  year: scheduledDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
                  hour: "numeric",
                  minute: "2-digit"
                });
              }

              // Parse YouTube content (stored as JSON)
              let caption = post.content || "No caption";
              if (post.platform?.toLowerCase() === "youtube") {
                try {
                  const contentData = JSON.parse(post.content);
                  caption = contentData.title || contentData.description || "YouTube Video";
                } catch (e) {
                  // Keep original content if not JSON
                }
              }

              return {
                id: post.id,
                platform: post.platform?.toLowerCase() || "instagram",
                caption: caption,
                scheduledTime,
                status: post.status === "pending" ? "scheduled" : (post.status === "success" && post.platform?.toLowerCase() === "youtube" ? "scheduled" : post.status),
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
  }, []);

  useEffect(() => {
    loadScheduledPosts();
  }, [loadScheduledPosts]);

  async function handleReschedule() {
    if (!reschedulePost || !rescheduleAt) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setRescheduleLoading(true);
    try {
      const res = await fetch(`/api/scheduled-posts/${reschedulePost.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scheduledAt: new Date(rescheduleAt).toISOString() }),
      });
      if (res.ok) {
        setReschedulePost(null);
        setRescheduleAt("");
        await loadScheduledPosts();
      } else {
        const err = await res.json();
        alert(err?.error || "Failed to reschedule");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to reschedule");
    } finally {
      setRescheduleLoading(false);
    }
  }

  async function handleDelete(post: Post) {
    if (!confirm("Delete this scheduled post? This cannot be undone.")) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setDeleteLoadingId(post.id);
    try {
      const res = await fetch(`/api/scheduled-posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadScheduledPosts();
      } else {
        const err = await res.json();
        alert(err?.error || "Failed to delete");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  async function handleCancel(post: Post) {
    if (!confirm(`Cancel this scheduled ${post.platform} post? The Redis job will be removed and the post will not be published.`)) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setCancelLoadingId(post.id);
    try {
      const res = await fetch(`/api/scheduled-posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadScheduledPosts();
      } else {
        const err = await res.json();
        alert(err?.error || "Failed to cancel scheduled post");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to cancel scheduled post");
    } finally {
      setCancelLoadingId(null);
    }
  }

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
        <Link href="/upcoming-posts">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </div>

      {reschedulePost && (
        <div className="border-b border-border p-4 bg-muted/40 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Reschedule post
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="reschedule-datetime" className="text-xs">New date & time</Label>
              <Input
                id="reschedule-datetime"
                type="datetime-local"
                value={rescheduleAt}
                onChange={(e) => setRescheduleAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-[220px]"
              />
            </div>
            <Button size="sm" onClick={handleReschedule} disabled={rescheduleLoading}>
              {rescheduleLoading ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setReschedulePost(null); setRescheduleAt(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="p-5 text-center text-muted-foreground">
          <p className="mb-2">No upcoming scheduled posts</p>
          <Link href="/create-post">
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
                <div className="flex items-center gap-1">
                  {/* Cancel Button - Only for Instagram (Redis scheduled posts) */}
                  {post.platform === "instagram" && (post.status === "pending" || post.status === "scheduled") && (
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleCancel(post)}
                      disabled={cancelLoadingId === post.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Cancel scheduled post (remove Redis job)"
                    >
                      {cancelLoadingId === post.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <StopCircle className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
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
                      <DropdownMenuItem onClick={() => { setReschedulePost(post); setRescheduleAt(new Date(post.scheduledAt).toISOString().slice(0, 16)); }}>
                        Reschedule
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(post)}
                        disabled={deleteLoadingId === post.id}
                      >
                        {deleteLoadingId === post.id ? "Deleting…" : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
