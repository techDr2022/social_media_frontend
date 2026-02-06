"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Instagram, 
  Facebook, 
  Youtube, 
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface MediaItem {
  id: string;
  platform: string;
  mediaUrl: string;
  caption: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
  accountName: string;
  accountId?: string;
}

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

export default function MediaLibraryPage() {
  const router = useRouter();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/scheduled-posts/media/all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const media = await res.json();
        setMediaItems(media);
      }
    } catch (err) {
      console.error("Failed to load media:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(mediaItem: MediaItem) {
    if (!confirm(`Delete this ${mediaItem.platform} media? This will also delete the associated post.`)) {
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setDeletingIds((prev) => new Set(prev).add(mediaItem.id));

    try {
      const res = await fetch(`/api/scheduled-posts/${mediaItem.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await loadMedia();
      } else {
        const err = await res.json();
        alert(err?.error || "Failed to delete media");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete media");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(mediaItem.id);
        return next;
      });
    }
  }

  function getPlatformRoute(platform: string, accountId?: string) {
    if (!accountId) {
      return `/${platform}`;
    }
    return `/${platform}/${accountId}`;
  }

  function isVideo(url: string) {
    return /\.(mp4|mov|avi|webm)$/i.test(url);
  }

  if (loading) {
    return (
      <MainLayout
        title="Media Library"
        subtitle="All your uploaded media files"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading media library...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Media Library"
      subtitle="View and manage all your uploaded media files"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {mediaItems.length} Media File{mediaItems.length !== 1 ? "s" : ""}
            </h2>
            <p className="text-muted-foreground mt-1">
              All media files uploaded to Instagram, Facebook, and YouTube
            </p>
          </div>
        </div>

        {/* Media Grid */}
        {mediaItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Media Files</h3>
              <p className="text-muted-foreground text-center mb-6">
                You haven't uploaded any media files yet. Create a post to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaItems.map((item) => {
              const PlatformIcon = platformIcons[item.platform as keyof typeof platformIcons] || Instagram;
              const platformColor = platformColors[item.platform as keyof typeof platformColors] || platformColors.instagram;
              const platformBg = platformBgColors[item.platform as keyof typeof platformBgColors] || platformBgColors.instagram;
              const isDeleting = deletingIds.has(item.id);
              const isVideoFile = isVideo(item.mediaUrl);

              return (
                <Card key={item.id} className={cn("overflow-hidden", platformBg)}>
                  {/* Media Preview */}
                  <div className="relative aspect-video bg-black">
                    {isVideoFile ? (
                      <video
                        src={item.mediaUrl}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <img
                        src={item.mediaUrl}
                        alt={item.caption || "Media"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = 
                            '<div class="w-full h-full flex items-center justify-center bg-secondary"><ImageIcon class="h-12 w-12 text-muted-foreground" /></div>';
                        }}
                      />
                    )}
                    {/* Platform Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge className={cn("gap-1", platformColor)}>
                        <PlatformIcon className="h-3 w-3" />
                        {item.platform}
                      </Badge>
                    </div>
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={
                          item.status === "success"
                            ? "default"
                            : item.status === "pending" || item.status === "scheduled"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Account Name */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{item.accountName}</p>
                    </div>

                    {/* Caption Preview */}
                    {item.caption && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.caption}
                      </p>
                    )}

                    {/* Date */}
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(getPlatformRoute(item.platform, item.accountId))}
                        className="flex-1 gap-2"
                      >
                        <ArrowRight className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item)}
                        disabled={isDeleting}
                        className="gap-2"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
