"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Instagram,
  Facebook,
  Youtube,
  Building2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Download,
  Check,
  CheckSquare,
  Square,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  isGmb?: boolean;
}

const PLATFORM_KEYS = ["all", "instagram", "facebook", "youtube", "gmb"] as const;
type PlatformFilter = (typeof PLATFORM_KEYS)[number];

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  gmb: Building2,
};

const platformColors: Record<string, string> = {
  instagram: "text-pink-500",
  facebook: "text-blue-500",
  youtube: "text-red-500",
  gmb: "text-blue-600",
};

const platformLabels: Record<string, string> = {
  all: "All",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  gmb: "GMB",
};

export default function MediaLibraryPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

      const [scheduledRes, gmbRes] = await Promise.all([
        fetch("/api/scheduled-posts/media/all", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/gmb/posts/all", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const scheduled: MediaItem[] = scheduledRes.ok ? await scheduledRes.json() : [];
      const gmbRaw: Array<{
        id: string;
        content: string;
        imageUrl?: string | null;
        videoUrl?: string | null;
        scheduledAt: string;
        status: string;
        createdAt: string;
        location?: { name?: string };
      }> = gmbRes.ok ? await gmbRes.json() : [];

      const gmbItems: MediaItem[] = gmbRaw
        .filter((p) => p.imageUrl || p.videoUrl)
        .map((p) => ({
          id: p.id,
          platform: "gmb",
          mediaUrl: p.imageUrl || p.videoUrl || "",
          caption: p.content,
          scheduledAt: p.scheduledAt,
          status: p.status,
          createdAt: p.createdAt,
          accountName: p.location?.name || "GMB",
          isGmb: true,
        }));

      setMediaItems([...scheduled, ...gmbItems]);
    } catch (err) {
      console.error("Failed to load media:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    if (platformFilter === "all") {
      // In "All" don't show YouTube (video not stored — link only); show when YouTube is selected
      return mediaItems.filter((item) => (item.platform || "").toLowerCase() !== "youtube");
    }
    return mediaItems.filter((item) => item.platform.toLowerCase() === platformFilter);
  }, [mediaItems, platformFilter]);

  const selectedItems = useMemo(
    () => filteredItems.filter((item) => selectedIds.has(item.id)),
    [filteredItems, selectedIds]
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  }

  function openOrPlay(item: MediaItem) {
    if (selectMode) {
      toggleSelect(item.id);
      return;
    }
    window.open(item.mediaUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteSelected() {
    if (selectedItems.length === 0) return;
    if (!confirm(`Delete ${selectedItems.length} item(s)? This will also delete the associated post(s).`)) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setDeletingIds(new Set(selectedItems.map((i) => i.id)));

    for (const item of selectedItems) {
      try {
        const url = item.isGmb ? `/api/gmb/posts/${item.id}` : `/api/scheduled-posts/${item.id}`;
        await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      } catch (e) {
        console.error(e);
      }
    }

    await loadMedia();
    setSelectedIds(new Set());
    setDeletingIds(new Set());
    setSelectMode(false);
  }

  async function downloadSelected() {
    for (const item of selectedItems) {
      const isYoutube = (item.platform || "").toLowerCase() === "youtube";
      if (isYoutube) {
        window.open(item.mediaUrl, "_blank");
        continue;
      }
      try {
        const res = await fetch(item.mediaUrl, { mode: "cors" });
        const blob = await res.blob();
        const ext = (item.mediaUrl.split("?")[0].match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$/i) || ["", "png"])[1].toLowerCase();
        const name = `media-${item.id.slice(0, 8)}.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        window.open(item.mediaUrl, "_blank");
      }
    }
  }

  async function handleDelete(mediaItem: MediaItem) {
    if (!confirm("Delete this media? This will also delete the associated post.")) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setDeletingIds((prev) => new Set(prev).add(mediaItem.id));
    try {
      const url = mediaItem.isGmb ? `/api/gmb/posts/${mediaItem.id}` : `/api/scheduled-posts/${mediaItem.id}`;
      const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) await loadMedia();
      else alert((await res.json().catch(() => ({})))?.error || "Failed to delete");
    } catch (e) {
      alert("Failed to delete");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(mediaItem.id);
        return next;
      });
    }
  }

  function isVideo(url: string) {
    if (!url) return false;
    if (/youtube\.com\/watch|youtu\.be\//i.test(url)) return true;
    return /\.(mp4|mov|avi|webm)$/i.test(url.split("?")[0]);
  }

  function isYoutubeItem(item: MediaItem) {
    return (item.platform || "").toLowerCase() === "youtube";
  }

  function youtubeThumbnail(url: string): string {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : url;
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
    <MainLayout title="Media Library" subtitle="Your media — click to open or play">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Toolbar: platform filter + Select + actions when selecting */}
        <div className="flex flex-wrap items-center gap-3">
          {PLATFORM_KEYS.map((key) => {
            const Icon = key === "all" ? null : platformIcons[key];
            const count = key === "all" ? mediaItems.length : mediaItems.filter((i) => i.platform.toLowerCase() === key).length;
            const active = platformFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPlatformFilter(key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "border-blue-500 bg-blue-500 text-white" : "border-border bg-background hover:bg-muted/50"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{platformLabels[key]}</span>
                <span className="text-xs opacity-80">({count})</span>
              </button>
            );
          })}
          <div className="flex-1" />
          {!selectMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectMode(true)}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Select
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={selectAll} className="gap-2">
                {selectedIds.size === filteredItems.length ? (
                  <><CheckSquare className="h-4 w-4" /> Deselect all</>
                ) : (
                  <><Square className="h-4 w-4" /> Select all</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSelected}
                disabled={selectedItems.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download ({selectedItems.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelected}
                disabled={selectedItems.length === 0 || deletingIds.size > 0}
                className="gap-2"
              >
                {deletingIds.size > 0 ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="h-4 w-4" /> Delete ({selectedItems.length})</>
                )}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
                Cancel
              </Button>
            </>
          )}
        </div>

        {/* Media grid — just media, click to open/play */}
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {platformFilter === "all" ? "No media yet. Create a post to get started." : `No media for ${platformLabels[platformFilter]}.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-8 gap-3">
            {filteredItems.map((item) => {
              const plat = (item.platform || "").toLowerCase();
              const PlatformIcon = platformIcons[plat] || ImageIcon;
              const platformColor = platformColors[plat] || "text-muted-foreground";
              const isVideoFile = isVideo(item.mediaUrl);
              const isYoutube = isYoutubeItem(item);
              const selected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer transition-all",
                    selected
                      ? "border-4 border-primary shadow-[0_0_0_2px_hsl(var(--primary))]"
                      : "border-2 border-transparent hover:border-muted-foreground/30"
                  )}
                  onClick={() => openOrPlay(item)}
                >
                  {isVideoFile ? (
                    isYoutube ? (
                      <img
                        src={youtubeThumbnail(item.mediaUrl)}
                        alt="YouTube"
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <video
                        src={item.mediaUrl}
                        className="w-full h-full object-cover pointer-events-none"
                        preload="metadata"
                      />
                    )
                  ) : (
                    <img
                      src={item.mediaUrl}
                      alt=""
                      className="w-full h-full object-cover pointer-events-none"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent && !parent.querySelector(".fallback-icon")) {
                          const div = document.createElement("div");
                          div.className = "fallback-icon w-full h-full flex items-center justify-center bg-secondary";
                          div.innerHTML = '<svg class="h-10 w-10 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                          parent.appendChild(div);
                        }
                      }}
                    />
                  )}
                  {/* YouTube: play icon + "Not stored" note */}
                  {isYoutube && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-12 w-12 text-white drop-shadow" fill="white" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-center text-[10px] text-white">
                        Video not stored in database — link only
                      </div>
                    </>
                  )}
                  {/* Platform dot */}
                  <div className={cn("absolute top-1.5 left-1.5", platformColor)}>
                    <PlatformIcon className="h-4 w-4 drop-shadow" />
                  </div>
                  {/* Selection: circle with blue tick when selected */}
                  {selectMode && (
                    <div
                      className={cn(
                        "absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer",
                        selected ? "border-blue-500 bg-white" : "border-muted-foreground bg-white/80"
                      )}
                      onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                    >
                      {selected && <Check className="h-4 w-4 text-blue-500" strokeWidth={3} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
