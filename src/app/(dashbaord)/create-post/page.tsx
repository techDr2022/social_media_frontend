"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Upload,
  Image as ImageIcon,
  Video,
  Loader2,
  Instagram,
  Facebook,
  Youtube,
  Images,
  Lock,
  Search,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialAccount {
  id: string;
  platform?: string;
  displayName?: string;
  username?: string;
  externalId: string;
  isActive: boolean;
}

const platformIcons: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  instagram: "from-pink-500 to-purple-500",
  facebook: "from-blue-500 to-blue-600",
  youtube: "from-red-500 to-red-600",
};

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

type MediaType = "photo" | "video" | null;

export default function CreatePostPage() {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [isCarousel, setIsCarousel] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<MediaType>(null);

  const [carouselFiles, setCarouselFiles] = useState<File[]>([]);
  const [carouselPreviews, setCarouselPreviews] = useState<string[]>([]);

  // YouTube specific
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeVisibility, setYoutubeVisibility] = useState<"public" | "unlisted" | "private">("public");

  // Scheduling
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const SOCIAL_ACCOUNTS_ENDPOINT = "/api/social-accounts";
  const SCHEDULE_ENDPOINT = "/api/scheduled-posts";

  const accountsByPlatform = useMemo(() => {
    return accounts.reduce((acc, account) => {
      const platform = account.platform?.toLowerCase() || "unknown";
      if (!acc[platform]) {
        acc[platform] = [];
      }
      acc[platform].push(account);
      return acc;
    }, {} as Record<string, SocialAccount[]>);
  }, [accounts]);

  const hasYouTubeSelected = useMemo(() => {
    for (const accountId of selectedAccounts) {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc?.platform?.toLowerCase() === "youtube") return true;
    }
    return false;
  }, [selectedAccounts, accounts]);

  // Filter accounts by search query
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    return accounts.filter((account) => {
      const displayName = (account.displayName || "").toLowerCase();
      const username = (account.username || "").toLowerCase();
      const externalId = (account.externalId || "").toLowerCase();
      const platform = (account.platform || "").toLowerCase();
      
      return (
        displayName.includes(query) ||
        username.includes(query) ||
        externalId.includes(query) ||
        platform.includes(query)
      );
    });
  }, [accounts, searchQuery]);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Handle URL params for pre-selected accounts (from sidebar search)
  useEffect(() => {
    if (accounts.length === 0) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const accountIdsParam = urlParams.get("accounts");
    if (accountIdsParam) {
      const accountIds = accountIdsParam.split(",").filter(Boolean);
      if (accountIds.length > 0) {
        // Set selected accounts
        setSelectedAccounts(new Set(accountIds));
        
        // Also select platforms for these accounts
        const platformsToSelect = new Set<string>();
        accountIds.forEach((accountId) => {
          const account = accounts.find((acc) => acc.id === accountId);
          if (account?.platform) {
            platformsToSelect.add(account.platform.toLowerCase());
          }
        });
        if (platformsToSelect.size > 0) {
          setSelectedPlatforms(platformsToSelect);
        }
        
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [accounts]);

  async function loadAccounts() {
    setLoadingAccounts(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setStatus("Not signed in — please login first.");
        setAccounts([]);
        return;
      }

      const res = await fetch(SOCIAL_ACCOUNTS_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        setStatus("Failed to load social accounts: " + text);
        setAccounts([]);
      } else {
        const json = await res.json();
        setAccounts(json);
        setStatus("");
      }
    } catch (err: any) {
      setStatus("Error loading accounts: " + (err.message ?? String(err)));
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        next.delete(platform);
        // Also deselect accounts for that platform
        const platformAccounts = accountsByPlatform[platform] || [];
        setSelectedAccounts((prevAcc) => {
          const accNext = new Set(prevAcc);
          platformAccounts.forEach((acc) => accNext.delete(acc.id));
          return accNext;
        });
      } else {
        next.add(platform);
      }
      return next;
    });
  }

  function toggleAccount(accountId: string) {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
        const acc = accounts.find((a) => a.id === accountId);
        if (acc?.platform) {
          setSelectedPlatforms((prevPlat) => {
            const platNext = new Set(prevPlat);
            platNext.add(acc.platform!.toLowerCase());
            return platNext;
          });
        }
      }
      return next;
    });
  }

  // Media handling
  function resetSingleMedia() {
    if (mediaPreview && mediaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview("");
    setMediaType(null);
  }

  function resetCarouselMedia() {
    carouselPreviews.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setCarouselFiles([]);
    setCarouselPreviews([]);
  }

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const requiresVideoOnly = hasYouTubeSelected;

    if (isCarousel && !requiresVideoOnly) {
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length === 0) {
        setStatus("Carousel posts only support images. Please select image files.");
        e.target.value = "";
        return;
      }

      if (imageFiles.length > 10) {
        setStatus(`Carousel posts can have maximum 10 images. You selected ${imageFiles.length}.`);
        e.target.value = "";
        return;
      }

      resetSingleMedia();

      const previews: string[] = [];
      imageFiles.forEach((file) => {
        const url = URL.createObjectURL(file);
        previews.push(url);
      });

      setCarouselFiles(imageFiles);
      setCarouselPreviews(previews);
      setMediaType("photo");
      setStatus("");
      e.target.value = "";
      return;
    }

    // Single media mode
    const file = files[0];

    if (requiresVideoOnly && !file.type.startsWith("video/")) {
      setStatus("When YouTube is selected, only video files are allowed.");
      e.target.value = "";
      resetSingleMedia();
      return;
    }

    resetCarouselMedia();

    const MAX_SUPABASE_FREE = 50 * 1024 * 1024;
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    if (file.size > MAX_SUPABASE_FREE) {
      setStatus(`❌ File too large (${fileSizeMB}MB). Maximum: 50MB for Supabase Free Tier.`);
      e.target.value = "";
      resetSingleMedia();
      return;
    }

    if (file.type.startsWith("image/")) {
      setMediaType("photo");
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      setStatus("Unsupported file type. Please upload an image or video.");
      e.target.value = "";
      resetSingleMedia();
      return;
    }

    setMediaFile(file);
    setStatus("");

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      const objectUrl = URL.createObjectURL(file);
      setMediaPreview(objectUrl);
    } else {
      setMediaPreview("");
    }
  }

  function removeCarouselImage(index: number) {
    if (carouselPreviews[index] && carouselPreviews[index].startsWith("blob:")) {
      URL.revokeObjectURL(carouselPreviews[index]);
    }
    const newFiles = carouselFiles.filter((_, i) => i !== index);
    const newPreviews = carouselPreviews.filter((_, i) => i !== index);
    setCarouselFiles(newFiles);
    setCarouselPreviews(newPreviews);
    if (newFiles.length === 0) {
      setMediaType(null);
    }
  }

  async function uploadFilesToStorage(files: File[]): Promise<string[]> {
    if (!files.length) return [];

    setUploading(true);
    try {
      const firstPlatform = Array.from(selectedPlatforms).find((p) => p !== "youtube") || "instagram";
      const bucket = firstPlatform.charAt(0).toUpperCase() + firstPlatform.slice(1);
      const firstAccountId = Array.from(selectedAccounts)[0];
      if (!firstAccountId) {
        throw new Error("No account selected");
      }

      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${firstAccountId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        urls.push(urlData.publicUrl);
      }

      return urls;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("You must be signed in first.");
      return;
    }

    if (selectedAccounts.size === 0) {
      setStatus("Please select at least one account.");
      return;
    }

    if (!content.trim()) {
      setStatus("Please enter description/content.");
      return;
    }

    // If scheduling, use scheduled-posts API (especially for Instagram with Redis)
    if (isScheduling) {
      if (!scheduledAt) {
        setStatus("Please select a scheduled time.");
        return;
      }
      return handleSchedulePost(token);
    }

    const requiresVideoOnly = hasYouTubeSelected;

    // Validate media
    if (requiresVideoOnly) {
      if (!mediaFile || mediaType !== "video") {
        setStatus("When YouTube is selected, you must upload a video file.");
        return;
      }
      if (!youtubeTitle.trim()) {
        setStatus("YouTube title is required.");
        return;
      }
    } else {
      if (isCarousel) {
        if (carouselFiles.length < 2) {
          setStatus("Carousel posts require at least 2 images.");
          return;
        }
      } else {
        if (!mediaFile || !mediaType) {
          setStatus("Please upload an image or video.");
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Prepare URLs for FB/IG
      let singleMediaUrl: string | null = null;
      let carouselUrls: string[] = [];

      if (!requiresVideoOnly) {
        if (isCarousel) {
          carouselUrls = await uploadFilesToStorage(carouselFiles);
        } else if (mediaFile) {
          const urls = await uploadFilesToStorage([mediaFile]);
          singleMediaUrl = urls[0] || null;
        }
      } else {
        // For YouTube-only scenario, we don't upload to Supabase for video, only direct upload to YouTube.
        // If user also selected FB/IG together with YouTube, we still allow that, but FB/IG will use the same Supabase upload.
        if (Array.from(selectedPlatforms).some((p) => p !== "youtube")) {
          const urls = await uploadFilesToStorage([mediaFile as File]);
          singleMediaUrl = urls[0] || null;
        }
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // For each selected account, call its specific endpoint
      for (const accountId of selectedAccounts) {
        const account = accounts.find((a) => a.id === accountId);
        if (!account) continue;
        const platform = account.platform?.toLowerCase() || "";

        try {
          if (platform === "facebook") {
            const body: any = {
              message: content || undefined,
              privacy: "PUBLIC",
              shareToStory: false,
            };

            if (isCarousel && carouselUrls.length >= 2) {
              body.isCarousel = true;
              body.carouselUrls = carouselUrls;
              body.mediaType = "photo";
            } else if (singleMediaUrl && mediaType) {
              body.mediaUrl = singleMediaUrl;
              body.mediaType = mediaType;
            }

            const res = await fetch(`/api/facebook/post/${accountId}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });

            if (!res.ok) {
              const text = await res.text();
              errors.push(`Facebook (${account.displayName || account.username}): ${text}`);
              errorCount++;
            } else {
              successCount++;
            }
          } else if (platform === "instagram") {
            const body: any = {
              caption: content || undefined,
            };

            if (isCarousel && carouselUrls.length >= 2) {
              body.mediaType = "carousel";
              body.carouselItems = carouselUrls.map((url) => ({
                url,
                type: "photo",
              }));
            } else if (singleMediaUrl && mediaType) {
              body.mediaUrl = singleMediaUrl;
              body.mediaType = mediaType;
            }

            const res = await fetch(`/api/instagram/post/${accountId}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });

            if (!res.ok) {
              const text = await res.text();
              errors.push(`Instagram (${account.displayName || account.username}): ${text}`);
              errorCount++;
            } else {
              successCount++;
            }
          } else if (platform === "youtube") {
            if (!mediaFile || mediaType !== "video") {
              errors.push(`YouTube (${account.displayName || account.username}): video file required`);
              errorCount++;
              continue;
            }

            const fd = new FormData();
            fd.append("video", mediaFile);
            fd.append("title", youtubeTitle);
            fd.append("description", content || "");
            fd.append("privacyStatus", youtubeVisibility);
            fd.append("categoryId", "22");
            fd.append("madeForKids", "false");
            fd.append("tags", "");
            fd.append("language", "en");
            fd.append("license", "youtube");
            fd.append("commentsEnabled", "true");
            fd.append("ageRestricted", "false");
            fd.append("socialAccountId", accountId);

            // Use Next.js API route which proxies to backend with /api/v1 prefix
            const res = await fetch(`/api/youtube/upload/${accountId}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: fd,
            });

            if (!res.ok) {
              const text = await res.text();
              errors.push(`YouTube (${account.displayName || account.username}): ${text}`);
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            errors.push(`Unsupported platform for account ${account.displayName || account.username}`);
            errorCount++;
          }
        } catch (err: any) {
          errors.push(
            `${platformNames[platform] || platform} (${account.displayName || account.username}): ${
              err.message || "Unknown error"
            }`
          );
          errorCount++;
        }
      }

      if (successCount > 0 && errorCount === 0) {
        setStatus(`✅ Queued successfully for ${successCount} account(s).`);
        setContent("");
        setSelectedPlatforms(new Set());
        setSelectedAccounts(new Set());
        setIsCarousel(false);
        resetSingleMedia();
        resetCarouselMedia();
        setYoutubeTitle("");
        setYoutubeVisibility("public");
      } else if (successCount > 0 && errorCount > 0) {
        setStatus(
          `⚠️ Queued for ${successCount} account(s), but ${errorCount} failed:\n${errors.join(
            "\n"
          )}`
        );
      } else {
        setStatus(`❌ Failed to queue:\n${errors.join("\n")}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSchedulePost(token: string) {
    setSubmitting(true);
    setStatus("Scheduling posts...");

    try {
      // Upload media first if needed
      let singleMediaUrl: string | null = null;
      let carouselUrls: string[] = [];

      const requiresVideoOnly = hasYouTubeSelected;

      if (!requiresVideoOnly) {
        if (isCarousel) {
          carouselUrls = await uploadFilesToStorage(carouselFiles);
        } else if (mediaFile) {
          const urls = await uploadFilesToStorage([mediaFile]);
          singleMediaUrl = urls[0] || null;
        }
      } else {
        if (Array.from(selectedPlatforms).some((p) => p !== "youtube")) {
          const urls = await uploadFilesToStorage([mediaFile as File]);
          singleMediaUrl = urls[0] || null;
        }
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const scheduledDateTime = new Date(scheduledAt);
      
      // Validate scheduled time is in future
      if (scheduledDateTime <= new Date()) {
        setStatus("Scheduled time must be in the future.");
        setSubmitting(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Create scheduled posts for each selected account
      for (const accountId of selectedAccounts) {
        const account = accounts.find((a) => a.id === accountId);
        if (!account) continue;
        const platform = account.platform?.toLowerCase() || "";

        try {
          if (platform === "facebook") {
            // Facebook: Use native scheduling API
            const body: any = {
              message: content || undefined,
              scheduledPublishTime: scheduledDateTime.toISOString(),
              privacy: "PUBLIC",
              shareToStory: false,
            };

            if (isCarousel && carouselUrls.length >= 2) {
              body.isCarousel = true;
              body.carouselUrls = carouselUrls;
              body.mediaType = "photo";
            } else if (singleMediaUrl && mediaType) {
              body.mediaUrl = singleMediaUrl;
              body.mediaType = mediaType;
            }

            const res = await fetch(`/api/facebook/post/${accountId}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });

            if (!res.ok) {
              const text = await res.text();
              let errorMsg = text;
              try {
                const errorJson = JSON.parse(text);
                errorMsg = errorJson.error || errorJson.message || text;
              } catch (e) {
                // Keep original text if not JSON
              }
              errors.push(`Facebook (${account.displayName || account.username}): ${errorMsg}`);
              errorCount++;
            } else {
              successCount++;
            }
          } else if (platform === "youtube") {
            // YouTube: Use native scheduling API (publishAt)
            if (!mediaFile || mediaType !== "video") {
              errors.push(`YouTube (${account.displayName || account.username}): video file required`);
              errorCount++;
              continue;
            }

            const fd = new FormData();
            fd.append("video", mediaFile);
            fd.append("title", youtubeTitle);
            fd.append("description", content || "");
            fd.append("privacyStatus", youtubeVisibility);
            fd.append("publishAt", scheduledDateTime.toISOString()); // YouTube native scheduling
            fd.append("categoryId", "22");
            fd.append("madeForKids", "false");
            fd.append("tags", "");
            fd.append("language", "en");
            fd.append("license", "youtube");
            fd.append("commentsEnabled", "true");
            fd.append("ageRestricted", "false");
            fd.append("socialAccountId", accountId);

            const res = await fetch(`/api/youtube/upload/${accountId}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: fd,
            });

            if (!res.ok) {
              const text = await res.text();
              let errorMsg = text;
              try {
                const errorJson = JSON.parse(text);
                errorMsg = errorJson.error || errorJson.message || text;
              } catch (e) {
                // Keep original text if not JSON
              }
              errors.push(`YouTube (${account.displayName || account.username}): ${errorMsg}`);
              errorCount++;
            } else {
              successCount++;
            }
          } else if (platform === "instagram") {
            // Instagram: Use Redis scheduling (via scheduled-posts API)
            const fd = new FormData();
            fd.append("platform", platform);
            fd.append("content", content);
            fd.append("scheduledAt", scheduledDateTime.toISOString());
            fd.append("socialAccountId", accountId);
            fd.append("timezone", timezone);

            // Add media URL if available
            if (isCarousel && carouselUrls.length >= 2) {
              // For carousel, we'll need to handle this differently
              // For now, use first image URL
              fd.append("mediaUrl", carouselUrls[0]);
            } else if (singleMediaUrl) {
              fd.append("mediaUrl", singleMediaUrl);
            }

            const res = await fetch(SCHEDULE_ENDPOINT, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: fd,
            });

            if (!res.ok) {
              const text = await res.text();
              let errorMsg = text;
              try {
                const errorJson = JSON.parse(text);
                errorMsg = errorJson.error || errorJson.message || text;
              } catch (e) {
                // Keep original text if not JSON
              }
              errors.push(`Instagram (${account.displayName || account.username}): ${errorMsg}`);
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            errors.push(`Unsupported platform: ${platform}`);
            errorCount++;
          }
        } catch (err: any) {
          errors.push(
            `${platformNames[platform] || platform} (${account.displayName || account.username}): ${
              err.message || "Unknown error"
            }`
          );
          errorCount++;
        }
      }

      if (successCount > 0 && errorCount === 0) {
        setStatus(`✅ Successfully scheduled ${successCount} post(s) for ${scheduledDateTime.toLocaleString()}`);
        // Reset form
        setContent("");
        setSelectedPlatforms(new Set());
        setSelectedAccounts(new Set());
        setIsCarousel(false);
        resetSingleMedia();
        resetCarouselMedia();
        setYoutubeTitle("");
        setYoutubeVisibility("public");
        setIsScheduling(false);
        setScheduledAt("");
      } else if (successCount > 0 && errorCount > 0) {
        setStatus(`⚠️ Scheduled ${successCount} post(s), but ${errorCount} failed:\n${errors.join("\n")}`);
      } else {
        setStatus(`❌ Failed to schedule posts:\n${errors.join("\n")}`);
      }
    } catch (err: any) {
      setStatus(`❌ Error scheduling posts: ${err.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

  const fileAccept = hasYouTubeSelected
    ? "video/*"
    : isCarousel
    ? "image/*"
    : "image/*,video/*";

  return (
    <MainLayout
      title="Create Post"
      subtitle="Create and publish content across multiple platforms and accounts"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {status && (
          <Card
            className={cn(
              status.startsWith("✅")
                ? "border-green-500"
                : status.startsWith("❌")
                ? "border-red-500"
                : status.startsWith("⚠️")
                ? "border-yellow-500"
                : "border-border"
            )}
          >
            <CardContent className="pt-6">
              <p
                className={cn(
                  "text-sm whitespace-pre-line",
                  status.startsWith("✅")
                    ? "text-green-600"
                    : status.startsWith("❌")
                    ? "text-red-600"
                    : status.startsWith("⚠️")
                    ? "text-yellow-600"
                    : "text-muted-foreground"
                )}
              >
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platforms & accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Select Platforms & Accounts</CardTitle>
              <CardDescription>
                Choose one or more platforms and accounts to post to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingAccounts ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading accounts...</span>
                </div>
              ) : accounts.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No connected accounts found. Please connect accounts first.
                  </p>
                  <Button
                    type="button"
                    onClick={() => (window.location.href = "/connect")}
                    variant="outline"
                  >
                    Go to Connect Accounts
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Account Search */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Search Accounts</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search by account name, username, or platform..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchResults(e.target.value.length > 0);
                        }}
                        onFocus={() => {
                          if (searchQuery.length > 0) {
                            setShowSearchResults(true);
                          }
                        }}
                        className="pl-10 pr-10"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setShowSearchResults(false);
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Search Results */}
                    {showSearchResults && filteredAccounts.length > 0 && (
                      <div className="border rounded-lg p-3 bg-muted/30 max-h-64 overflow-y-auto space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Found {filteredAccounts.length} account{filteredAccounts.length !== 1 ? "s" : ""}
                        </div>
                        {filteredAccounts.map((account) => {
                          const isSelected = selectedAccounts.has(account.id);
                          const platform = account.platform?.toLowerCase() || "unknown";
                          const Icon = platformIcons[platform] || Instagram;
                          const accountName = account.displayName || account.username || account.externalId;
                          
                          return (
                            <div
                              key={account.id}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border p-2 transition-all cursor-pointer",
                                isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/50"
                              )}
                              onClick={() => {
                                toggleAccount(account.id);
                                // Auto-select platform when account is selected
                                if (!selectedPlatforms.has(platform)) {
                                  togglePlatform(platform);
                                }
                              }}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => {
                                  toggleAccount(account.id);
                                  if (!selectedPlatforms.has(platform)) {
                                    togglePlatform(platform);
                                  }
                                }}
                              />
                              <div className={cn(
                                "w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br",
                                platformColors[platform] || platformColors.instagram
                              )}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{accountName}</div>
                                <div className="text-xs text-muted-foreground capitalize">{platform}</div>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {showSearchResults && searchQuery && filteredAccounts.length === 0 && (
                      <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
                        No accounts found matching "{searchQuery}"
                      </div>
                    )}
                  </div>

                  {/* Platform selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Platforms</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {["instagram", "facebook", "youtube"].map((platform) => {
                        const platformAccounts = accountsByPlatform[platform] || [];
                        const hasAccounts = platformAccounts.length > 0;
                        const isSelected = selectedPlatforms.has(platform);
                        const Icon = platformIcons[platform] || Instagram;

                        return (
                          <div
                            key={platform}
                            className={cn(
                              "relative flex items-start space-x-3 rounded-lg border p-4 transition-all",
                              isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                              !hasAccounts && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={!hasAccounts}
                              onCheckedChange={() => {
                                if (hasAccounts) togglePlatform(platform);
                              }}
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                                    platformColors[platform] || platformColors.instagram
                                  )}
                                >
                                  <Icon className="h-4 w-4 text-white" />
                                </div>
                                <Label className="font-medium cursor-pointer">
                                  {platformNames[platform]}
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {hasAccounts
                                  ? `${platformAccounts.length} account${
                                      platformAccounts.length > 1 ? "s" : ""
                                    }`
                                  : "No accounts"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accounts */}
                  {selectedPlatforms.size > 0 && (
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Accounts</Label>
                      <div className="space-y-4">
                        {Array.from(selectedPlatforms).map((platform) => {
                          const platformAccounts = accountsByPlatform[platform] || [];
                          if (!platformAccounts.length) return null;
                          const Icon = platformIcons[platform] || Instagram;
                          return (
                            <div key={platform} className="space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br",
                                    platformColors[platform] || platformColors.instagram
                                  )}
                                >
                                  <Icon className="h-3 w-3 text-white" />
                                </div>
                                <Label className="font-medium">
                                  {platformNames[platform]} Accounts
                                </Label>
                                <Badge variant="secondary">
                                  {
                                    platformAccounts.filter((acc) =>
                                      selectedAccounts.has(acc.id)
                                    ).length
                                  }{" "}
                                  / {platformAccounts.length} selected
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-8">
                                {platformAccounts.map((account) => {
                                  const isSelected = selectedAccounts.has(account.id);
                                  return (
                                    <div
                                      key={account.id}
                                      className={cn(
                                        "flex items-center space-x-3 rounded-lg border p-3 transition-all",
                                        isSelected
                                          ? "border-primary bg-primary/5"
                                          : "border-border hover:border-primary/50"
                                      )}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleAccount(account.id)}
                                      />
                                      <Label className="flex-1 cursor-pointer text-sm">
                                        {account.displayName ||
                                          account.username ||
                                          account.externalId}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedAccounts.size > 0 && (
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium text-primary">
                        📋 {selectedAccounts.size} account(s) selected across{" "}
                        {selectedPlatforms.size} platform(s)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Post details */}
          <Card>
            <CardHeader>
              <CardTitle>Post Details</CardTitle>
              <CardDescription>
                Add your content and media. When YouTube is selected, carousel is disabled and only videos are allowed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Common description */}
              <div className="space-y-2">
                <Label htmlFor="content">Description</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Write the content you want to post to all selected platforms."
                  required
                />
              </div>

              {/* YouTube-only fields */}
              {hasYouTubeSelected && (
                <div className="space-y-4 p-4 border rounded-lg bg-secondary/40">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    YouTube Settings
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="yt-title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="yt-title"
                      value={youtubeTitle}
                      onChange={(e) =>
                        setYoutubeTitle(e.target.value.slice(0, 100))
                      }
                      placeholder="YouTube video title"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {youtubeTitle.length}/100 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yt-visibility">Visibility</Label>
                    <select
                      id="yt-visibility"
                      className="border rounded-md px-3 py-2 text-sm bg-background"
                      value={youtubeVisibility}
                      onChange={(e) =>
                        setYoutubeVisibility(
                          e.target.value as "public" | "unlisted" | "private"
                        )
                      }
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Carousel toggle */}
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border",
                  hasYouTubeSelected
                    ? "bg-muted text-muted-foreground border-dashed"
                    : "bg-secondary/50 border-border"
                )}
              >
                <Checkbox
                  id="carousel-option"
                  checked={isCarousel && !hasYouTubeSelected}
                  disabled={hasYouTubeSelected}
                  onCheckedChange={(checked) => {
                    if (hasYouTubeSelected) return;
                    const val = Boolean(checked);
                    setIsCarousel(val);
                    if (!val) {
                      resetCarouselMedia();
                    } else {
                      resetSingleMedia();
                    }
                  }}
                />
                <label
                  htmlFor="carousel-option"
                  className={cn(
                    "flex items-center gap-2 cursor-pointer flex-1",
                    hasYouTubeSelected && "cursor-not-allowed"
                  )}
                >
                  <Images className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Create carousel post</span>
                  <span className="text-xs text-muted-foreground">
                    (Multiple images, up to 10)
                  </span>
                  {hasYouTubeSelected && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Disabled when YouTube is selected
                    </span>
                  )}
                </label>
              </div>

              {/* Media */}
              <div className="space-y-3">
                <Label htmlFor="media-upload">
                  Media <span className="text-destructive">*</span>
                </Label>

                <Input
                  id="media-upload"
                  type="file"
                  accept={fileAccept}
                  multiple={isCarousel && !hasYouTubeSelected}
                  onChange={handleMediaChange}
                />
                <p className="text-xs text-muted-foreground">
                  {hasYouTubeSelected
                    ? "When YouTube is selected, only video files are allowed."
                    : isCarousel
                    ? "Carousel posts support only images. Up to 10 images."
                    : "Single image or video."}
                </p>

                {/* Previews */}
                {isCarousel && carouselFiles.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {carouselFiles.length}/10 images selected
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {carouselPreviews.map((preview, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={preview}
                            alt={`Carousel ${idx + 1}`}
                            className="w-full h-24 object-cover rounded border border-border"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeCarouselImage(idx)}
                          >
                            ✕
                          </Button>
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                            {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : mediaFile ? (
                  <div className="relative">
                    {mediaPreview && mediaType === "photo" ? (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full max-h-80 object-contain rounded border border-border"
                      />
                    ) : mediaPreview && mediaType === "video" ? (
                      <video
                        src={mediaPreview}
                        controls
                        className="w-full max-h-80 rounded border border-border"
                      />
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-secondary/50">
                        <p className="text-sm font-medium text-foreground mb-2">
                          {mediaType === "video" ? "📹 Video Selected" : "📎 File Selected"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {mediaFile.name}
                        </p>
                        <Badge variant="secondary">
                          Size: {(mediaFile.size / (1024 * 1024)).toFixed(2)}MB
                        </Badge>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={resetSingleMedia}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                    No media selected yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scheduling Toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="schedule-toggle"
                    checked={isScheduling}
                    onCheckedChange={(checked) => {
                      setIsScheduling(checked === true);
                      if (!checked) {
                        setScheduledAt("");
                      }
                    }}
                  />
                  <Label htmlFor="schedule-toggle" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Schedule this post</span>
                    </div>
                  </Label>
                </div>
              </div>
              
              {isScheduling && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    required={isScheduling}
                  />
                  <p className="text-xs text-muted-foreground">
                    Posts will be published automatically at the scheduled time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedAccounts.size > 0 && (
                <span>
                  {isScheduling ? (
                    <>Will schedule {selectedAccounts.size} post(s) for {scheduledAt ? new Date(scheduledAt).toLocaleString() : "selected time"}</>
                  ) : (
                    <>Will post to {selectedAccounts.size} account(s) across{" "}
                    {selectedPlatforms.size} platform(s)</>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {isScheduling ? (
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    uploading ||
                    selectedAccounts.size === 0 ||
                    !scheduledAt
                  }
                  size="lg"
                  className="gap-2"
                >
                  {uploading || submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      Schedule Post
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    uploading ||
                    selectedAccounts.size === 0
                  }
                  size="lg"
                  className="gap-2"
                >
                  {uploading || submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Post
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}


