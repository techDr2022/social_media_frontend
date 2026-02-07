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
  ChevronRight,
  ChevronDown,
  MapPin,
  Building2,
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

interface GmbLocation {
  id: string;
  name: string;
  address: string | null;
  socialAccountId: string | null;
}

type WizardStep = 1 | 2 | 3;

const platformIcons: Record<string, any> = {
  gmb: Building2,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  gmb: "from-blue-500 to-blue-600",
  instagram: "from-pink-500 to-purple-500",
  facebook: "from-blue-500 to-blue-600",
  youtube: "from-red-500 to-red-600",
};

const platformNames: Record<string, string> = {
  gmb: "Google My Business",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

type MediaType = "photo" | "video" | null;

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function CreatePostPage() {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [gmbLocationsByAccountId, setGmbLocationsByAccountId] = useState<Record<string, GmbLocation[]>>({});
  const [loadingLocations, setLoadingLocations] = useState<Record<string, boolean>>({});
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set(["gmb", "instagram", "facebook", "youtube"]));
  const [expandedGmbAccounts, setExpandedGmbAccounts] = useState<Set<string>>(new Set());
  const [selectedGmbLocationIds, setSelectedGmbLocationIds] = useState<Set<string>>(new Set());

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);

  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [isCarousel, setIsCarousel] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<MediaType>(null);

  const [carouselFiles, setCarouselFiles] = useState<File[]>([]);
  const [carouselPreviews, setCarouselPreviews] = useState<string[]>([]);
  const [carouselTypes, setCarouselTypes] = useState<("photo" | "video")[]>([]);

  const [gmbCtaType, setGmbCtaType] = useState("");
  const [gmbCtaUrl, setGmbCtaUrl] = useState("");

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

  const gmbAccounts = useMemo(() => accountsByPlatform["gmb"] || [], [accountsByPlatform]);
  const hasGmbSelected = selectedGmbLocationIds.size > 0;
  const hasNonGmb = selectedAccounts.size > 0;
  const totalDestinations = selectedAccounts.size + selectedGmbLocationIds.size;

  const hasInstagramSelected = useMemo(() => {
    return Array.from(selectedAccounts).some((id) => accounts.find((a) => a.id === id)?.platform?.toLowerCase() === "instagram");
  }, [selectedAccounts, accounts]);
  const hasFacebookSelected = useMemo(() => {
    return Array.from(selectedAccounts).some((id) => accounts.find((a) => a.id === id)?.platform?.toLowerCase() === "facebook");
  }, [selectedAccounts, accounts]);
  const hasYouTubeSelected = useMemo(() => {
    return Array.from(selectedAccounts).some((id) => accounts.find((a) => a.id === id)?.platform?.toLowerCase() === "youtube");
  }, [selectedAccounts, accounts]);
  const showCarouselOption = (hasInstagramSelected || hasFacebookSelected) && !hasYouTubeSelected;
  const carouselImagesOnly = hasFacebookSelected;
  const carouselPhotoAndVideo = hasInstagramSelected && !hasFacebookSelected;
  const gmbLocationList = useMemo(() => {
    const list: { locationId: string; name: string; socialAccountId: string }[] = [];
    for (const locs of Object.values(gmbLocationsByAccountId)) {
      for (const loc of locs) {
        if (selectedGmbLocationIds.has(loc.id) && loc.socialAccountId) {
          list.push({ locationId: loc.id, name: loc.name, socialAccountId: loc.socialAccountId });
        }
      }
    }
    return list;
  }, [gmbLocationsByAccountId, selectedGmbLocationIds]);

  const loadGmbLocations = async (accountId: string) => {
    if (gmbLocationsByAccountId[accountId]) return;
    setLoadingLocations((prev) => ({ ...prev, [accountId]: true }));
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch(`${apiUrl()}/api/v1/gmb/locations?accountId=${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const locs: GmbLocation[] = await res.json();
        setGmbLocationsByAccountId((prev) => ({ ...prev, [accountId]: locs }));
      }
    } finally {
      setLoadingLocations((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  const togglePlatformExpanded = (platform: string) => {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const toggleGmbAccount = (accountId: string) => {
    setExpandedGmbAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else {
        next.add(accountId);
        loadGmbLocations(accountId);
      }
      return next;
    });
  };

  const toggleGmbLocation = (locationId: string) => {
    setSelectedGmbLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) next.delete(locationId);
      else next.add(locationId);
      return next;
    });
  };

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

  // Handle URL params for pre-selected accounts and GMB locations (from sidebar search)
  useEffect(() => {
    if (accounts.length === 0) return;

    const urlParams = new URLSearchParams(window.location.search);
    const accountIdsParam = urlParams.get("accounts");
    const gmbIdsParam = urlParams.get("gmb");
    let didUpdate = false;

    if (accountIdsParam) {
      const accountIds = accountIdsParam.split(",").filter(Boolean);
      if (accountIds.length > 0) {
        setSelectedAccounts(new Set(accountIds));
        const platformsToSelect = new Set<string>();
        accountIds.forEach((accountId) => {
          const account = accounts.find((acc) => acc.id === accountId);
          if (account?.platform) {
            platformsToSelect.add(account.platform.toLowerCase());
          }
        });
        if (platformsToSelect.size > 0) {
          setSelectedPlatforms((prev) => {
            const next = new Set(prev);
            platformsToSelect.forEach((p) => next.add(p));
            return next;
          });
        }
        didUpdate = true;
      }
    }

    if (gmbIdsParam) {
      const gmbIds = gmbIdsParam.split(",").filter(Boolean);
      if (gmbIds.length > 0) {
        setSelectedGmbLocationIds(new Set(gmbIds));
        setSelectedPlatforms((prev) => new Set(prev).add("gmb"));
        setExpandedPlatforms((prev) => new Set(prev).add("gmb"));
        didUpdate = true;
        // Load GMB locations for all GMB accounts so selected IDs resolve
        gmbAccounts.forEach((acc) => loadGmbLocations(acc.id));
      }
    }

    if (didUpdate) {
      window.history.replaceState({}, "", window.location.pathname);
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
    setCarouselTypes([]);
  }

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const requiresVideoOnly = hasYouTubeSelected;

    if (isCarousel && !requiresVideoOnly) {
      const allowedImage = (f: File) => f.type.startsWith("image/");
      const allowedVideo = (f: File) => f.type.startsWith("video/");
      const filtered = carouselImagesOnly
        ? Array.from(files).filter(allowedImage)
        : Array.from(files).filter((f) => allowedImage(f) || allowedVideo(f));
      if (filtered.length === 0) {
        setStatus(carouselImagesOnly ? "Carousel accepts only images (Facebook)." : "Add at least one image or video.");
        e.target.value = "";
        return;
      }
      const currentCount = carouselFiles.length;
      const toAdd = filtered.slice(0, Math.max(0, 10 - currentCount));
      if (toAdd.length === 0) {
        setStatus("Carousel already has 10 items (max).");
        e.target.value = "";
        return;
      }
      if (toAdd.length < filtered.length) {
        setStatus(`Added ${toAdd.length} of ${filtered.length} (max 10 total).`);
      } else {
        setStatus("");
      }
      const newPreviews = toAdd.map((file) => URL.createObjectURL(file));
      const newTypes = toAdd.map((f) => (f.type.startsWith("video/") ? "video" : "photo") as "photo" | "video");
      setCarouselFiles((prev) => [...prev, ...toAdd]);
      setCarouselPreviews((prev) => [...prev, ...newPreviews]);
      setCarouselTypes((prev) => [...prev, ...newTypes]);
      setMediaType(toAdd.some((f) => f.type.startsWith("video/")) || carouselTypes.some((t) => t === "video") ? "video" : "photo");
      e.target.value = "";
      return;
    }

    const file = files[0];
    if (requiresVideoOnly && !file.type.startsWith("video/")) {
      setStatus("YouTube requires a video file.");
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
    const url = carouselPreviews[index];
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
    const newFiles = carouselFiles.filter((_, i) => i !== index);
    const newPreviews = carouselPreviews.filter((_, i) => i !== index);
    const newTypes = carouselTypes.filter((_, i) => i !== index);
    setCarouselFiles(newFiles);
    setCarouselPreviews(newPreviews);
    setCarouselTypes(newTypes);
    if (newFiles.length === 0) setMediaType(null);
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

    if (totalDestinations === 0) {
      setStatus("Please select at least one destination (account or GMB location) on the left.");
      return;
    }

    if (!content.trim()) {
      setStatus("Please enter description/content.");
      return;
    }

    if (isScheduling && (selectedAccounts.size > 0 || hasGmbSelected)) {
      if (!scheduledAt) {
        setStatus("Please select a scheduled time.");
        return;
      }
      if (selectedAccounts.size > 0 && selectedGmbLocationIds.size === 0) {
        return handleSchedulePost(token);
      }
    }

    const requiresVideoOnly = hasYouTubeSelected;

    if (hasNonGmb) {
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
    }

    setSubmitting(true);
    const accountNames = [
      ...Array.from(selectedAccounts).map((id) => accounts.find((a) => a.id === id)?.displayName || accounts.find((a) => a.id === id)?.username || "account"),
      ...(hasGmbSelected ? ["GMB locations"] : []),
    ].filter(Boolean);
    const accountLabel = accountNames.length <= 2 ? accountNames.join(" and ") : `${accountNames.length} accounts`;
    setStatus(`Processing… Post now request in ${accountLabel}. Please wait.`);

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
        if (Array.from(selectedPlatforms).some((p) => p !== "youtube")) {
          const urls = await uploadFilesToStorage([mediaFile as File]);
          singleMediaUrl = urls[0] || null;
        }
      }

      let gmbMediaUrl: string | null = null;
      if (hasGmbSelected && (mediaFile || carouselFiles.length > 0)) {
        const file = mediaFile || (carouselFiles[0] as File);
        const pathPrefix = gmbLocationList[0] ? `${gmbLocationList[0].socialAccountId}/${gmbLocationList[0].locationId}` : "gmb";
        const ext = file.name.split(".").pop() || "bin";
        const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("Google").upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw new Error(`GMB upload failed: ${error.message}`);
        const { data: urlData } = supabase.storage.from("Google").getPublicUrl(path);
        gmbMediaUrl = urlData.publicUrl;
        if (!singleMediaUrl) singleMediaUrl = gmbMediaUrl;
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
            if (isScheduling && scheduledAt) body.scheduledPublishTime = new Date(scheduledAt).toISOString();
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
              const friendly = parseApiError(text);
              errors.push(`Facebook (${account.displayName || account.username}): ${friendly}`);
              errorCount++;
            } else {
              successCount++;
            }
          } else if (platform === "instagram") {
            if (isScheduling && scheduledAt) {
              const fd = new FormData();
              fd.append("platform", "instagram");
              fd.append("content", content);
              fd.append("scheduledAt", new Date(scheduledAt).toISOString());
              fd.append("socialAccountId", accountId);
              fd.append("timezone", timezone);
              if (singleMediaUrl) fd.append("mediaUrl", singleMediaUrl);
              const res = await fetch(SCHEDULE_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
              if (!res.ok) {
                const text = await res.text();
                errors.push(`Instagram (${account.displayName || account.username}): ${parseApiError(text)}`);
                errorCount++;
              } else successCount++;
            } else {
              const body: any = { caption: content || undefined };
            if (isCarousel && carouselUrls.length >= 2) {
              body.mediaType = "carousel";
              body.carouselItems = carouselUrls.map((url, i) => ({ url, type: (carouselTypes[i] || "photo") as "photo" | "video" }));
              } else if (singleMediaUrl && mediaType) {
                body.mediaUrl = singleMediaUrl;
                body.mediaType = mediaType;
              }
              const res = await fetch(`/api/instagram/post/${accountId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              if (!res.ok) {
                const text = await res.text();
                errors.push(`Instagram (${account.displayName || account.username}): ${parseApiError(text)}`);
                errorCount++;
              } else successCount++;
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
            if (isScheduling && scheduledAt) fd.append("publishAt", new Date(scheduledAt).toISOString());

            const res = await fetch(`/api/youtube/upload/${accountId}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: fd,
            });

            if (!res.ok) {
              const text = await res.text();
              errors.push(`YouTube (${account.displayName || account.username}): ${parseApiError(text)}`);
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

      for (const { locationId } of gmbLocationList) {
        try {
          const res = await fetch(`${apiUrl()}/api/v1/gmb/posts`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              locationId,
              content,
              imageUrl: gmbMediaUrl && (mediaType === "photo" || (mediaFile || carouselFiles[0])?.type?.startsWith("image/")) ? gmbMediaUrl : undefined,
              videoUrl: gmbMediaUrl && (mediaType === "video" || (mediaFile || carouselFiles[0])?.type?.startsWith("video/")) ? gmbMediaUrl : undefined,
              scheduledAt: isScheduling && scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
              ctaType: gmbCtaType && gmbCtaType !== "__none__" ? gmbCtaType : undefined,
              ctaUrl: gmbCtaType && gmbCtaType !== "CALL" && gmbCtaType !== "__none__" ? gmbCtaUrl : undefined,
            }),
          });
          if (!res.ok) {
            const text = await res.text();
            errors.push(`GMB: ${parseApiError(text)}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push(`GMB: ${err.message}`);
          errorCount++;
        }
      }

      if (successCount > 0 && errorCount === 0) {
        setStatus(`✅ Post now was successful for all ${successCount} account(s).`);
        setContent("");
        setSelectedPlatforms(new Set());
        setSelectedAccounts(new Set());
        setSelectedGmbLocationIds(new Set());
        setIsCarousel(false);
        resetSingleMedia();
        resetCarouselMedia();
        setYoutubeTitle("");
        setYoutubeVisibility("public");
        setIsScheduling(false);
        setScheduledAt("");
        setGmbCtaType("");
        setGmbCtaUrl("");
      } else if (successCount > 0 && errorCount > 0) {
        setStatus(
          `⚠️ Post now succeeded for ${successCount} account(s). Failed for ${errorCount}:\n${errors.join("\n")}`
        );
      } else {
        setStatus(`❌ Post now failed:\n${errors.join("\n")}`);
      }
    } catch (err: any) {
      setStatus(`❌ Post now failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

  function parseApiError(text: string): string {
    if (!text?.trim()) return "Unknown error";
    try {
      const j = JSON.parse(text);
      if (typeof j?.message === "string") return j.message;
      if (typeof j?.error === "string") return j.error;
      if (typeof j?.statusMessage === "string") return j.statusMessage;
    } catch {
      // not JSON
    }
    if (text.includes("Internal Server Error") || text.includes("500")) return "Server error. Please try again.";
    return text.slice(0, 200);
  }

  async function handleSchedulePost(token: string) {
    setSubmitting(true);
    const scheduleAccountNames = Array.from(selectedAccounts)
      .map((id) => accounts.find((a) => a.id === id)?.displayName || accounts.find((a) => a.id === id)?.username || "account")
      .filter(Boolean);
    const scheduleLabel = scheduleAccountNames.length <= 2 ? scheduleAccountNames.join(" and ") : `${scheduleAccountNames.length} accounts`;
    setStatus(`Scheduling started… Adding to queue for ${scheduleLabel}. Please wait.`);

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

            // Add media: full carousel data when carousel, else single media
            if (isCarousel && carouselUrls.length >= 2) {
              fd.append("mediaUrl", carouselUrls[0]); // first item for backward compat
              fd.append("carouselUrls", JSON.stringify(carouselUrls));
              fd.append(
                "carouselItems",
                JSON.stringify(
                  carouselUrls.map((url, i) => ({
                    url,
                    type: (carouselTypes[i] || "photo") as "photo" | "video",
                  }))
                )
              );
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
        setStatus(`✅ Scheduled successfully. Post(s) will go out at ${scheduledDateTime.toLocaleString()}.`);
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
        setStatus(`❌ Scheduling failed:\n${errors.join("\n")}`);
      }
    } catch (err: any) {
      setStatus(`❌ Scheduling failed: ${err.message || "Unknown error"}`);
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
      subtitle="Step-by-step: choose destinations, then add content and schedule"
    >
      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* Left panel: Destinations (accounts + GMB locations) */}
        <aside className="w-full lg:w-80 shrink-0 border rounded-xl bg-card overflow-hidden flex flex-col max-h-[calc(100vh-12rem)]">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm text-foreground">Destinations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select accounts or GMB locations to post to
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No connected accounts. <a href="/connect" className="text-primary underline">Connect</a> first.</p>
            ) : (
              <div className="space-y-0.5">
                {/* GMB: expand to accounts → locations */}
                {gmbAccounts.length > 0 && (
                  <div className="rounded-lg border border-border/80 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/50"
                      onClick={() => togglePlatformExpanded("gmb")}
                    >
                      {expandedPlatforms.has("gmb") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div className={cn("w-7 h-7 rounded flex items-center justify-center bg-gradient-to-br", platformColors.gmb)}>
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-sm">{platformNames.gmb}</span>
                      {selectedGmbLocationIds.size > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">{selectedGmbLocationIds.size}</Badge>
                      )}
                    </button>
                    {expandedPlatforms.has("gmb") && (
                      <div className="pl-4 pr-2 pb-2 space-y-0.5">
                        {gmbAccounts.map((acc) => (
                          <div key={acc.id} className="rounded-md border border-border/60 overflow-hidden">
                            <button
                              type="button"
                              className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/30 text-sm"
                              onClick={() => toggleGmbAccount(acc.id)}
                            >
                              {expandedGmbAccounts.has(acc.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                              <span className="truncate flex-1">{acc.displayName || acc.externalId}</span>
                              {loadingLocations[acc.id] && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                            </button>
                            {expandedGmbAccounts.has(acc.id) && (
                              <div className="pl-4 pr-2 pb-2 pt-0.5 space-y-0.5">
                                {(gmbLocationsByAccountId[acc.id] || []).map((loc) => {
                                  const selected = selectedGmbLocationIds.has(loc.id);
                                  return (
                                    <label
                                      key={loc.id}
                                      className={cn(
                                        "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/30 text-sm",
                                        selected && "bg-primary/10"
                                      )}
                                    >
                                      <Checkbox
                                        checked={selected}
                                        onCheckedChange={() => toggleGmbLocation(loc.id)}
                                      />
                                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="truncate">{loc.name}</span>
                                    </label>
                                  );
                                })}
                                {gmbLocationsByAccountId[acc.id]?.length === 0 && !loadingLocations[acc.id] && (
                                  <p className="text-xs text-muted-foreground pl-2">No locations. Sync from GMB page.</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Facebook */}
                {(accountsByPlatform["facebook"]?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-border/80 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/50"
                      onClick={() => togglePlatformExpanded("facebook")}
                    >
                      {expandedPlatforms.has("facebook") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div className={cn("w-7 h-7 rounded flex items-center justify-center bg-gradient-to-br", platformColors.facebook)}>
                        <Facebook className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-sm">{platformNames.facebook}</span>
                    </button>
                    {expandedPlatforms.has("facebook") && (
                      <div className="pl-4 pr-2 pb-2 space-y-0.5">
                        {(accountsByPlatform["facebook"] || []).map((acc) => (
                          <label
                            key={acc.id}
                            className={cn("flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/30 text-sm", selectedAccounts.has(acc.id) && "bg-primary/10")}
                          >
                            <Checkbox checked={selectedAccounts.has(acc.id)} onCheckedChange={() => toggleAccount(acc.id)} />
                            <span className="truncate">{acc.displayName || acc.username || acc.externalId}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Instagram */}
                {(accountsByPlatform["instagram"]?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-border/80 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/50"
                      onClick={() => togglePlatformExpanded("instagram")}
                    >
                      {expandedPlatforms.has("instagram") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div className={cn("w-7 h-7 rounded flex items-center justify-center bg-gradient-to-br", platformColors.instagram)}>
                        <Instagram className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-sm">{platformNames.instagram}</span>
                    </button>
                    {expandedPlatforms.has("instagram") && (
                      <div className="pl-4 pr-2 pb-2 space-y-0.5">
                        {(accountsByPlatform["instagram"] || []).map((acc) => (
                          <label
                            key={acc.id}
                            className={cn("flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/30 text-sm", selectedAccounts.has(acc.id) && "bg-primary/10")}
                          >
                            <Checkbox checked={selectedAccounts.has(acc.id)} onCheckedChange={() => toggleAccount(acc.id)} />
                            <span className="truncate">{acc.displayName || acc.username || acc.externalId}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* YouTube */}
                {(accountsByPlatform["youtube"]?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-border/80 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/50"
                      onClick={() => togglePlatformExpanded("youtube")}
                    >
                      {expandedPlatforms.has("youtube") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div className={cn("w-7 h-7 rounded flex items-center justify-center bg-gradient-to-br", platformColors.youtube)}>
                        <Youtube className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-sm">{platformNames.youtube}</span>
                    </button>
                    {expandedPlatforms.has("youtube") && (
                      <div className="pl-4 pr-2 pb-2 space-y-0.5">
                        {(accountsByPlatform["youtube"] || []).map((acc) => (
                          <label
                            key={acc.id}
                            className={cn("flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/30 text-sm", selectedAccounts.has(acc.id) && "bg-primary/10")}
                          >
                            <Checkbox checked={selectedAccounts.has(acc.id)} onCheckedChange={() => toggleAccount(acc.id)} />
                            <span className="truncate">{acc.displayName || acc.username || acc.externalId}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {totalDestinations > 0 && (
            <div className="p-3 border-t bg-muted/30">
              <p className="text-xs font-medium text-primary">
                {totalDestinations} destination{totalDestinations !== 1 ? "s" : ""} selected
              </p>
            </div>
          )}
        </aside>

        {/* Right panel: Step-by-step content */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {([1, 2, 3] as const).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={wizardStep === s ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setWizardStep(s)}
                    className="gap-1.5"
                  >
                    {wizardStep === s && <Check className="h-3.5 w-3.5" />}
                    Step {s}: {s === 1 ? "Content" : s === 2 ? "Media" : "Schedule"}
                  </Button>
                ))}
              </div>
              <CardDescription>
                {wizardStep === 1 && "Write the description (shared across platforms)."}
                {wizardStep === 2 && "Add photo or video. GMB and FB/IG have different rules."}
                {wizardStep === 3 && "Post now or schedule. GMB uses native scheduling."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-6">
              {totalDestinations === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
                  Select at least one destination in the left panel (account or GMB location).
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="content">Description</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    placeholder="Write your post content (used for all selected destinations)..."
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setWizardStep(2)} disabled={!content.trim() || totalDestinations === 0}>
                      Next: Media
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-6">
                  {/* YouTube: only video, title + visibility */}
                  {hasYouTubeSelected && (
                    <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-500" />
                        YouTube — video only
                      </p>
                      <div>
                        <Label>Upload video</Label>
                        <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm hover:bg-muted/50 w-fit">
                          <Upload className="h-4 w-4" />
                          <span>Choose video file</span>
                          <input type="file" accept="video/*" className="sr-only" onChange={handleMediaChange} />
                        </label>
                      </div>
                      <div>
                        <Label>Video title</Label>
                        <Input
                          value={youtubeTitle}
                          onChange={(e) => setYoutubeTitle(e.target.value.slice(0, 100))}
                          placeholder="Video title"
                          maxLength={100}
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">{youtubeTitle.length}/100</p>
                      </div>
                      <div>
                        <Label className="text-xs">Visibility</Label>
                        <select
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                          value={youtubeVisibility}
                          onChange={(e) => setYoutubeVisibility(e.target.value as "public" | "unlisted" | "private")}
                        >
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      {mediaFile && (
                        <div className="relative">
                          <video src={mediaPreview} controls className="max-h-48 rounded border w-full" />
                          <Button type="button" variant="outline" size="icon" className="absolute top-2 right-2" onClick={resetSingleMedia}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instagram / Facebook: carousel (only when no YouTube) or single image/video */}
                  {showCarouselOption && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <p className="text-sm font-medium">
                        {hasFacebookSelected && hasInstagramSelected ? "Facebook & Instagram" : hasInstagramSelected ? "Instagram" : "Facebook"}
                      </p>
                      <div className="flex items-center gap-2 p-3 rounded-lg border">
                        <Checkbox
                          id="carousel"
                          checked={isCarousel}
                          onCheckedChange={(c) => {
                            setIsCarousel(c === true);
                            if (c !== true) {
                              resetSingleMedia();
                              resetCarouselMedia();
                            }
                          }}
                        />
                        <label htmlFor="carousel" className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
                          <Images className="h-4 w-4" />
                          {carouselImagesOnly ? "Carousel (2–10 images only)" : "Carousel (2–10 photos & videos)"}
                        </label>
                      </div>
                      <div>
                        <Label className="text-xs">
                          {isCarousel ? (carouselImagesOnly ? "Add photos (one or more)" : "Add photos & videos (one or more)") : "Upload image or video"}
                        </Label>
                        {isCarousel && carouselFiles.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">{carouselFiles.length}/10 items — add more below</p>
                        )}
                        <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm hover:bg-muted/50 w-fit">
                          <Upload className="h-4 w-4" />
                          <span>
                            {isCarousel
                              ? carouselFiles.length >= 10
                                ? "Max 10 items"
                                : carouselImagesOnly
                                  ? "Choose images"
                                  : "Choose photos or videos"
                              : "Choose file"}
                          </span>
                          <input
                            type="file"
                            accept={isCarousel && carouselImagesOnly ? "image/*" : "image/*,video/*"}
                            multiple={isCarousel}
                            className="sr-only"
                            onChange={handleMediaChange}
                            disabled={isCarousel && carouselFiles.length >= 10}
                          />
                        </label>
                      </div>
                      {(mediaPreview || carouselPreviews.length > 0) && (
                        <div className="relative space-y-2">
                          {isCarousel && carouselPreviews.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {carouselPreviews.map((url, i) => (
                                <div key={i} className="relative aspect-square rounded border overflow-hidden group">
                                  {carouselFiles[i]?.type.startsWith("video/") ? (
                                    <video src={url} className="w-full h-full object-cover" muted playsInline />
                                  ) : (
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                  )}
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={() => removeCarouselImage(i)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              {mediaType === "photo" && mediaPreview ? (
                                <img src={mediaPreview} alt="" className="max-h-64 rounded border object-contain" />
                              ) : mediaPreview ? (
                                <video src={mediaPreview} controls className="max-h-64 rounded border w-full" />
                              ) : null}
                              <Button type="button" variant="outline" size="icon" className="absolute top-2 right-2" onClick={resetSingleMedia}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* GMB: optional single image or video (or same as YouTube), optional CTA */}
                  {hasGmbSelected && (
                    <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Google My Business — optional media
                      </p>
                      {hasYouTubeSelected ? (
                        <p className="text-xs text-muted-foreground">Same video as YouTube will be used for GMB.</p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">One image or one video (optional). Min video size 400×300.</p>
                          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm hover:bg-muted/50 w-fit">
                            <Upload className="h-4 w-4" />
                            <span>Upload image or video (optional)</span>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="sr-only"
                              onChange={(e) => {
                                if (!e.target.files?.length) return;
                                const file = e.target.files[0];
                                resetCarouselMedia();
                                setMediaFile(file);
                                setMediaType(file.type.startsWith("image/") ? "photo" : "video");
                                if (file.type.startsWith("image/")) {
                                  const r = new FileReader();
                                  r.onloadend = () => setMediaPreview(r.result as string);
                                  r.readAsDataURL(file);
                                } else setMediaPreview(URL.createObjectURL(file));
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {mediaPreview && !showCarouselOption && (
                            <div className="relative inline-block">
                              {mediaType === "photo" ? (
                                <img src={mediaPreview} alt="" className="max-h-40 rounded border object-contain" />
                              ) : (
                                <video src={mediaPreview} controls className="max-h-40 rounded border" />
                              )}
                              <Button type="button" variant="outline" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={resetSingleMedia}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Action (optional)</Label>
                          <select
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                            value={gmbCtaType || "__none__"}
                            onChange={(e) => setGmbCtaType(e.target.value === "__none__" ? "" : e.target.value)}
                          >
                            <option value="__none__">None</option>
                            <option value="LEARN_MORE">Learn More</option>
                            <option value="BOOK">Book</option>
                            <option value="ORDER">Order</option>
                            <option value="BUY">Buy</option>
                            <option value="SIGN_UP">Sign Up</option>
                            <option value="CALL">Call</option>
                          </select>
                        </div>
                        {gmbCtaType && gmbCtaType !== "CALL" && gmbCtaType !== "__none__" && (
                          <div>
                            <Label className="text-xs">Action URL</Label>
                            <Input
                              className="mt-1"
                              type="url"
                              placeholder="https://..."
                              value={gmbCtaUrl}
                              onChange={(e) => setGmbCtaUrl(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>Back</Button>
                    <Button type="button" onClick={() => setWizardStep(3)}>Next: Schedule</Button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="schedule"
                        checked={isScheduling}
                        onCheckedChange={(c) => {
                          setIsScheduling(c === true);
                          if (c !== true) setScheduledAt("");
                        }}
                      />
                      <Label htmlFor="schedule" className="cursor-pointer flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule for later
                      </Label>
                    </div>
                  </div>
                  {isScheduling && (
                    <div className="space-y-2">
                      <Label>Scheduled date & time</Label>
                      <Input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                  {hasGmbSelected && (
                    <p className="text-xs text-muted-foreground">
                      GMB posts use native scheduling: choose a time above or leave unchecked to post now.
                    </p>
                  )}
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setWizardStep(2)}>Back</Button>
                    <Button
                      type="submit"
                      form="wizard-form"
                      disabled={submitting || uploading || totalDestinations === 0 || !content.trim()}
                    >
                      {(submitting || uploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? "Uploading…" : submitting ? "Posting…" : "Post"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {status && (
            <Card className={cn(
              "shrink-0",
              status.startsWith("✅") ? "border-green-500/50" : status.startsWith("❌") ? "border-destructive" : status.startsWith("⚠️") ? "border-amber-500/50" : "border-border"
            )}>
              <CardContent className="pt-4">
                <p className={cn(
                  "text-sm whitespace-pre-line",
                  status.startsWith("✅") ? "text-green-600 dark:text-green-400" : status.startsWith("❌") ? "text-destructive" : status.startsWith("⚠️") ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                )}>
                  {(status.startsWith("Processing") || status.startsWith("Scheduling started")) && (submitting || uploading) && (
                    <span className="inline-block mr-2 align-middle">
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    </span>
                  )}
                  {status}
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <form id="wizard-form" onSubmit={handleSubmit} className="hidden" />
    </MainLayout>
  );
}


