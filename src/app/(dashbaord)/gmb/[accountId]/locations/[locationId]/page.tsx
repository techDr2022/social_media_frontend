"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseclient";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowLeft, Loader2, Plus, FileText, Calendar, Image, Video, X, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type GmbPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  scheduledAt: string;
  status: string;
  ctaType: string | null;
  ctaUrl: string | null;
  searchUrl?: string | null;
  errorMessage?: string | null;
};

type Location = {
  id: string;
  name: string;
  address: string | null;
};

export default function GmbLocationPage({ params }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountId, setAccountId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [posts, setPosts] = useState<GmbPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPost, setNewPost] = useState({
    content: "",
    scheduledAt: "",
    ctaType: "",
    ctaUrl: "",
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<"photo" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const postCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      let accId: string;
      let locId: string;

      try {
        if (params && typeof params.then === "function") {
          const p = await params;
          accId = p.accountId;
          locId = p.locationId;
        } else {
          accId = params?.accountId ?? "";
          locId = params?.locationId ?? "";
        }

        if (!accId || !locId) {
          setStatus("Invalid URL");
          setLoading(false);
          return;
        }

        setAccountId(accId);
        setLocationId(locId);

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setStatus("You must be logged in.");
          setLoading(false);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

        // Load locations to get location name
        const locRes = await fetch(
          `${apiUrl}/api/v1/gmb/locations?accountId=${accId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (locRes.ok) {
          const locs = await locRes.json();
          const found = locs.find((l: any) => l.id === locId);
          if (found) setLocation(found);
        }

        // Load posts
        const postsRes = await fetch(
          `${apiUrl}/api/v1/gmb/locations/${locId}/posts`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (postsRes.ok) {
          const data = await postsRes.json();
          setPosts(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        setStatus(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreateForm(true);
  }, [searchParams]);

  const MIN_VIDEO_WIDTH = 400;
  const MIN_VIDEO_HEIGHT = 300;

  function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        URL.revokeObjectURL(url);
        resolve({ width, height });
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not load video"));
      };
    });
  }

  function resizeVideoToMinDimensions(
    file: File,
    minW: number,
    minH: number
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = url;

      video.onloadedmetadata = () => {
        const w = video.videoWidth;
        const h = video.videoHeight;
        const scale = Math.max(minW / w, minH / h);
        if (scale <= 1) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }
        const outW = Math.max(minW, Math.round(w * scale));
        const outH = Math.max(minH, Math.round(h * scale));

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }

        const stream = canvas.captureStream?.(30);
        if (!stream) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }

        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : "video/mp4";
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2500000,
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        recorder.onstop = () => {
          URL.revokeObjectURL(url);
          const blob = new Blob(chunks, { type: mimeType });
          const ext = mimeType.includes("webm") ? "webm" : "mp4";
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: blob.type }));
        };
        recorder.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(file);
        };
        recorder.start(100);

        video.play().catch(() => {
          recorder.stop();
        });

        function draw() {
          if (video.ended || video.paused) {
            recorder.stop();
            return;
          }
          if (!ctx) {
            recorder.stop();
            return;
          }
          ctx.drawImage(video, 0, 0, outW, outH);
          requestAnimationFrame(draw);
        }
        video.onplaying = () => draw();
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
    });
  }

  function resetMedia() {
    if (mediaPreview && mediaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview("");
    setMediaType(null);
  }

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      setStatus(`File too large. Max ${MAX_MB}MB.`);
      e.target.value = "";
      return;
    }
    if (file.type.startsWith("image/")) {
      setMediaType("photo");
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      setStatus("Please select an image or video file.");
      e.target.value = "";
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setStatus("");
    e.target.value = "";
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!newPost.content.trim()) {
      setStatus("Content is required.");
      return;
    }
    if (newPost.ctaType && newPost.ctaType !== "CALL" && !newPost.ctaUrl?.trim()) {
      setStatus("Action URL is required when using Learn More, Book, Order, Buy, or Sign Up.");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setCreating(true);
    setStatus("");

    let imageUrl: string | undefined;
    let videoUrl: string | undefined;

    try {
      if (mediaFile) {
        setUploading(true);
        let fileToUpload: File = mediaFile;
        if (mediaType === "video") {
          try {
            const dims = await getVideoDimensions(mediaFile);
            if (dims.width < MIN_VIDEO_WIDTH || dims.height < MIN_VIDEO_HEIGHT) {
              setStatus("Video is small — scaling to at least 400×300…");
              fileToUpload = await resizeVideoToMinDimensions(
                mediaFile,
                MIN_VIDEO_WIDTH,
                MIN_VIDEO_HEIGHT
              );
              setStatus("");
            }
          } catch (err) {
            setStatus("");
            // use original file if check/resize fails
          }
        }
        const ext = fileToUpload.name.split(".").pop() || "bin";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const bucket = "Google";
        const filePath = accountId ? `${accountId}/${locationId}/${fileName}` : `${locationId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, fileToUpload, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          setStatus(`Upload failed: ${uploadError.message}`);
          setCreating(false);
          setUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        const mediaUrl = urlData.publicUrl;
        if (mediaType === "photo") imageUrl = mediaUrl;
        else videoUrl = mediaUrl;
        setUploading(false);
        resetMedia();
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/v1/gmb/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId,
          content: newPost.content,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          scheduledAt: newPost.scheduledAt ? new Date(newPost.scheduledAt).toISOString() : new Date().toISOString(),
          ctaType: newPost.ctaType || undefined,
          ctaUrl: newPost.ctaType && newPost.ctaType !== "CALL" ? newPost.ctaUrl || undefined : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(err.message || "Failed to create post");
        setCreating(false);
        return;
      }

      const created = await res.json();
      setPosts((prev) => [...prev, created]);
      setNewPost({ content: "", scheduledAt: "", ctaType: "", ctaUrl: "" });
      setShowCreateForm(false);
      setJustCreatedId(created.id);
      setStatus(`Post saved. See it in the list below — status: ${created.status || "scheduled"}`);
      setTimeout(() => {
        postCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setTimeout(() => setJustCreatedId(null), 4000);
    } catch (err: any) {
      setStatus(`Failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function deletePost(postId: string) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    setDeletingId(postId);
    setStatus("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/v1/gmb/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(err.message || "Failed to delete");
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setStatus("Post deleted.");
    } catch (err: any) {
      setStatus(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <MainLayout title="Loading..." subtitle="">
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={location?.name || "Location"}
      subtitle={location?.address || ""}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/gmb/${accountId}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to locations
          </Button>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </div>

        {status && (
          <Card
            className={cn(
              status.includes("Failed") || status.includes("Error")
                ? "border-destructive"
                : "border-green-500/50"
            )}
          >
            <CardContent className="pt-6">
              <p
                className={cn(
                  "text-sm",
                  status.includes("Failed") || status.includes("Error")
                    ? "text-destructive"
                    : "text-green-700 dark:text-green-300"
                )}
              >
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create Post form: when open, we don't show the posts list below; use "View Posts" for that. */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create Post</CardTitle>
              <CardDescription>Schedule a post with photo, video, and action button</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createPost} className="space-y-4">
                <div>
                  <Label>Content</Label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) =>
                      setNewPost((p) => ({ ...p, content: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    rows={4}
                    placeholder="Write your post..."
                    required
                  />
                </div>
                <div>
                  <Label>Photo or Video (optional)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Videos smaller than 400×300 are auto-scaled to at least 400×300 before upload.
                  </p>
                  {!mediaPreview ? (
                    <div className="mt-1 flex gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted/50">
                        <Image className="h-4 w-4" />
                        Add Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleMediaChange}
                        />
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted/50">
                        <Video className="h-4 w-4" />
                        Add Video
                        <input
                          type="file"
                          accept="video/*"
                          className="sr-only"
                          onChange={handleMediaChange}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="mt-1 relative inline-block">
                      {mediaType === "photo" ? (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          className="max-h-48 rounded-lg border object-cover"
                        />
                      ) : (
                        <video
                          src={mediaPreview}
                          controls
                          className="max-h-48 rounded-lg border"
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -right-2 -top-2 h-6 w-6"
                        onClick={resetMedia}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Action Button (optional)</Label>
                    <Select
                      value={newPost.ctaType || "__none__"}
                      onValueChange={(v) =>
                        setNewPost((p) => ({ ...p, ctaType: v === "__none__" ? "" : v }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose action..." />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="top"
                        sideOffset={4}
                        className="z-[9999] bg-background border border-border shadow-xl dark:bg-zinc-950 dark:border-zinc-800"
                      >
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="LEARN_MORE">Learn More</SelectItem>
                        <SelectItem value="BOOK">Book</SelectItem>
                        <SelectItem value="ORDER">Order</SelectItem>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SIGN_UP">Sign Up</SelectItem>
                        <SelectItem value="CALL">Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(newPost.ctaType && newPost.ctaType !== "CALL") && (
                    <div>
                      <Label>Action URL</Label>
                      <input
                        type="url"
                        value={newPost.ctaUrl}
                        onChange={(e) =>
                          setNewPost((p) => ({ ...p, ctaUrl: e.target.value }))
                        }
                        placeholder="https://..."
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label>Schedule (optional — leave empty to post now)</Label>
                  <input
                    type="datetime-local"
                    value={newPost.scheduledAt}
                    onChange={(e) =>
                      setNewPost((p) => ({ ...p, scheduledAt: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={creating || uploading}>
                    {(creating || uploading) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create Post"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetMedia();
                      setNewPost({ content: "", scheduledAt: "", ctaType: "", ctaUrl: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Show all recent posts only when not on the create form (View Posts = this section). */}
        {!showCreateForm && (
        <div>
          <h2 className="text-xl font-bold mb-4">Recent posts ({posts.length})</h2>
          {posts.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Status: <strong>scheduled</strong> = saved; <strong>posted</strong> = live on Google; <strong>failed</strong> = error.
            </p>
          )}
          {posts.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                No posts yet. Click "Create Post" to add one.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  ref={post.id === justCreatedId ? postCardRef : null}
                  className={cn(
                    post.id === justCreatedId && "ring-2 ring-green-500 ring-offset-2 animate-in fade-in"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <Badge
                        variant={post.status === "posted" ? "default" : post.status === "failed" ? "destructive" : "secondary"}
                      >
                        {post.status}
                      </Badge>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.scheduledAt).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deletePost(post.id)}
                          disabled={deletingId === post.id}
                          title="Delete post"
                        >
                          {deletingId === post.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(post.imageUrl || post.videoUrl) && (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt="Post"
                            className="max-h-64 w-full object-cover"
                          />
                        )}
                        {post.videoUrl && !post.imageUrl && (
                          <video
                            src={post.videoUrl}
                            controls
                            className="max-h-64 w-full"
                          />
                        )}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                    {post.ctaType && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Action: {post.ctaType}
                        {post.ctaUrl && ` → ${post.ctaUrl}`}
                      </p>
                    )}
                    {post.searchUrl && (
                      <a
                        href={post.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on Google
                      </a>
                    )}
                    {post.status === "failed" && post.errorMessage && (
                      <p className="text-xs text-destructive mt-2">{post.errorMessage}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </MainLayout>
  );
}
