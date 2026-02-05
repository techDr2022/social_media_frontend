"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Instagram, 
  Facebook, 
  Youtube, 
  Clock, 
  MoreHorizontal, 
  Calendar,
  Loader2,
  Trash2,
  Edit,
  Plus,
  X,
  StopCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

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

const platformBgColors = {
  instagram: "bg-pink-500/10 border-pink-500/20",
  facebook: "bg-blue-500/10 border-blue-500/20",
  youtube: "bg-red-500/10 border-red-500/20",
};

interface Post {
  id: string;
  platform: "instagram" | "facebook" | "youtube";
  caption: string;
  scheduledTime: string;
  status: "scheduled" | "draft" | "published" | "pending" | "success";
  image?: string;
  scheduledAt: string;
  content: string;
  mediaUrl?: string;
  socialAccount?: {
    displayName?: string;
    username?: string;
  };
}

export default function UpcomingPostsPage() {
  const router = useRouter();
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
        
        // Deduplicate posts by ID first
        const uniquePostsMap = new Map<string, any>();
        scheduledPosts.forEach((post: any) => {
          if (!uniquePostsMap.has(post.id)) {
            uniquePostsMap.set(post.id, post);
          }
        });
        const uniquePosts = Array.from(uniquePostsMap.values());
        
        // Transform backend data to component format
        const transformedPosts: Post[] = uniquePosts
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
              content: post.content || "No caption",
              scheduledTime,
              status: post.status === "pending" ? "scheduled" : (post.status === "success" && post.platform?.toLowerCase() === "youtube" ? "scheduled" : post.status),
              image: post.mediaUrl,
              mediaUrl: post.mediaUrl,
              scheduledAt: post.scheduledAt,
              socialAccount: post.socialAccount,
            };
          })
          // Sort by scheduledAt - earliest first
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
    
    // Reschedule only works for Instagram posts with 'pending' status (Redis scheduled)
    if (reschedulePost.platform !== "instagram" || reschedulePost.status !== "pending") {
      alert("Reschedule is only available for Instagram posts scheduled through the app. Facebook and YouTube posts are scheduled natively and cannot be rescheduled here.");
      return;
    }
    
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
    // YouTube scheduled posts cannot be deleted (already uploaded and scheduled natively)
    if (post.platform === "youtube" && post.status === "success") {
      alert("YouTube scheduled posts cannot be deleted. They are already uploaded and scheduled on YouTube. You can delete them directly from YouTube Studio.");
      return;
    }
    
    const confirmMessage = post.platform === "facebook" && post.status === "scheduled"
      ? "Delete this scheduled post? It will be removed from the database, but the post scheduled on Facebook will still be published. This cannot be undone."
      : "Delete this scheduled post? This cannot be undone.";
    
    if (!confirm(confirmMessage)) return;
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
      <MainLayout
        title="Upcoming Posts"
        subtitle="Your scheduled content"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading upcoming posts...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Upcoming Posts"
      subtitle="View and manage all your scheduled posts"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {posts.length} Upcoming Post{posts.length !== 1 ? "s" : ""}
            </h2>
            <p className="text-muted-foreground mt-1">
              Posts are sorted by earliest scheduled time first
            </p>
          </div>
          <Button onClick={() => router.push("/create-post")} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </div>

        {/* Posts List */}
        {posts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Upcoming Scheduled Posts</h3>
              <p className="text-muted-foreground text-center mb-6">
                You don't have any posts scheduled yet. Create your first post to get started!
              </p>
              <Button onClick={() => router.push("/create-post")} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const PlatformIcon = platformIcons[post.platform];
              const platformColor = platformColors[post.platform];
              const platformBg = platformBgColors[post.platform];

              return (
                <Card key={post.id} className={cn("transition-all hover:shadow-md", platformBg)}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Platform Icon */}
                      <div className={cn(
                        "p-3 rounded-lg bg-background/50",
                        platformColor
                      )}>
                        <PlatformIcon className={cn("h-6 w-6", platformColor)} />
                      </div>

                      {/* Post Content */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold capitalize">{post.platform}</h3>
                              {post.socialAccount?.displayName || post.socialAccount?.username ? (
                                <Badge variant="secondary" className="text-xs">
                                  {post.socialAccount.displayName || post.socialAccount.username}
                                </Badge>
                              ) : null}
                              <Badge variant="outline" className="text-xs">
                                {post.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {post.caption}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Cancel Button - Only for Instagram (Redis scheduled posts) */}
                            {post.platform === "instagram" && (post.status === "pending" || post.status === "scheduled") && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancel(post)}
                                disabled={cancelLoadingId === post.id}
                                className="gap-2"
                              >
                                {cancelLoadingId === post.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Canceling...
                                  </>
                                ) : (
                                  <>
                                    <StopCircle className="h-4 w-4" />
                                    Cancel
                                  </>
                                )}
                              </Button>
                            )}

                            {/* Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {/* Reschedule - Only for Instagram pending posts */}
                                {post.platform === "instagram" && post.status === "pending" ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const date = new Date(post.scheduledAt);
                                      setRescheduleAt(date.toISOString().slice(0, 16));
                                      setReschedulePost(post);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Reschedule
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    disabled
                                    className="opacity-50 cursor-not-allowed"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Reschedule (Not available)
                                  </DropdownMenuItem>
                                )}
                                
                                {/* Delete - Not available for YouTube scheduled posts */}
                                {post.platform === "youtube" && post.status === "success" ? (
                                  <DropdownMenuItem
                                    disabled
                                    className="opacity-50 cursor-not-allowed text-muted-foreground"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete (Not available)
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(post)}
                                    className="text-destructive"
                                    disabled={deleteLoadingId === post.id}
                                  >
                                    {deleteLoadingId === post.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Media Preview */}
                        {post.mediaUrl && (
                          <div className="rounded-lg overflow-hidden max-w-xs">
                            {post.mediaUrl.match(/\.(mp4|mov|avi)$/i) ? (
                              <video
                                src={post.mediaUrl}
                                className="w-full h-auto max-h-48 object-cover rounded-lg"
                                controls
                              />
                            ) : (
                              <img
                                src={post.mediaUrl}
                                alt="Post media"
                                className="w-full h-auto max-h-48 object-cover rounded-lg"
                              />
                            )}
                          </div>
                        )}

                        {/* Scheduled Time */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{post.scheduledTime}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Reschedule Modal */}
        {reschedulePost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Reschedule Post</CardTitle>
                <CardDescription>
                  Choose a new date and time for this post
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="rescheduleAt">New Scheduled Time</Label>
                  <Input
                    id="rescheduleAt"
                    type="datetime-local"
                    value={rescheduleAt}
                    onChange={(e) => setRescheduleAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="mt-2"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReschedulePost(null);
                      setRescheduleAt("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReschedule}
                    disabled={rescheduleLoading || !rescheduleAt}
                  >
                    {rescheduleLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Rescheduling...
                      </>
                    ) : (
                      "Reschedule"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
