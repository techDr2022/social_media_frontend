"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar as CalendarIcon,
  Instagram,
  Facebook,
  Youtube,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  mediaUrl?: string;
  scheduledAt: string;
  postedAt?: string;
  status: string;
  permalink?: string | null;
  socialAccount?: {
    displayName?: string;
    username?: string;
  };
}

interface PostCounts {
  instagram: number;
  facebook: number;
  youtube: number;
  gmb: number;
  total: number;
}

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

const platformBgColors: Record<string, string> = {
  instagram: "bg-pink-500/10 border-pink-500/20",
  facebook: "bg-blue-500/10 border-blue-500/20",
  youtube: "bg-red-500/10 border-red-500/20",
  gmb: "bg-blue-500/10 border-blue-500/20",
};

const PLATFORM_KEYS = ["instagram", "facebook", "youtube", "gmb"] as const;

type StatusFilterKey = "posted" | "scheduled" | "failed";
const STATUS_KEYS: { key: StatusFilterKey; label: string }[] = [
  { key: "posted", label: "Posted" },
  { key: "scheduled", label: "Scheduled" },
  { key: "failed", label: "Failed" },
];

function normalizeStatus(status: string | undefined): StatusFilterKey {
  const s = (status || "").toLowerCase();
  if (s === "success" || s === "posted") return "posted";
  if (s === "pending" || s === "scheduled") return "scheduled";
  if (s === "failed") return "failed";
  return "posted";
}

export default function DayPlannerPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDatePosts, setSelectedDatePosts] = useState<ScheduledPost[]>([]);
  const [platformFilter, setPlatformFilter] = useState<Set<string>>(new Set(PLATFORM_KEYS));
  const [statusFilter, setStatusFilter] = useState<Set<StatusFilterKey>>(new Set(["posted", "scheduled"]));

  // Get first day of current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Get the day of week for first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // Generate array of days in month
  const daysInMonth = Array.from({ length: lastDayOfMonth.getDate() }, (_, i) => i + 1);
  
  // Generate array of empty cells before first day
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      filterPostsByDate(selectedDate);
    }
  }, [selectedDate, posts]);

  async function loadPosts() {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setLoading(false);
        return;
      }

      const [scheduledRes, gmbRes] = await Promise.all([
        fetch("/api/scheduled-posts", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/gmb/posts/all", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const scheduledPosts: ScheduledPost[] = scheduledRes.ok ? await scheduledRes.json() : [];
      const gmbRaw: Array<{
        id: string;
        content: string;
        scheduledAt: string;
        postedAt?: string | null;
        status: string;
        searchUrl?: string | null;
        location?: { name?: string; address?: string };
      }> = gmbRes.ok ? await gmbRes.json() : [];

      const gmbAsScheduled: ScheduledPost[] = gmbRaw.map((p) => ({
        id: p.id,
        platform: "gmb",
        content: p.content,
        scheduledAt: p.scheduledAt,
        postedAt: p.postedAt ?? undefined,
        status: p.status,
        permalink: p.searchUrl ?? undefined,
        socialAccount: { displayName: p.location?.name ?? undefined, username: p.location?.address ?? undefined },
      }));

      setPosts([...scheduledPosts, ...gmbAsScheduled]);
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  }

  function filterPostsByDate(date: Date) {
    const selectedDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const filtered = posts.filter((post) => {
      if (!post.scheduledAt && !post.postedAt) return false;
      const postDate = post.postedAt ? new Date(post.postedAt) : new Date(post.scheduledAt);
      const postDateOnly = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());
      return postDateOnly.getTime() === selectedDateOnly.getTime();
    });

    setSelectedDatePosts(filtered);
  }

  function getPostCountsForDate(day: number): PostCounts {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startDateOnly = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate());

    const dayPosts = posts.filter((post) => {
      if (!post.scheduledAt && !post.postedAt) return false;
      const postDate = post.postedAt ? new Date(post.postedAt) : new Date(post.scheduledAt);
      const postDateOnly = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());
      return postDateOnly.getTime() === startDateOnly.getTime();
    });

    const counts: PostCounts = {
      instagram: 0,
      facebook: 0,
      youtube: 0,
      gmb: 0,
      total: dayPosts.length,
    };

    dayPosts.forEach((post) => {
      const platform = post.platform?.toLowerCase();
      if (platform === "instagram") counts.instagram++;
      else if (platform === "facebook") counts.facebook++;
      else if (platform === "youtube") counts.youtube++;
      else if (platform === "gmb") counts.gmb++;
    });

    return counts;
  }

  function handleDateClick(day: number) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
  }

  function handlePreviousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  }

  function handleCreatePost() {
    router.push("/create-post");
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  }

  function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit" 
    });
  }

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return dateOnly.getTime() === today.getTime();
  };

  const filteredSelectedPosts = useMemo(() => {
    return selectedDatePosts
      .filter((p) => platformFilter.has((p.platform || "").toLowerCase()))
      .filter((p) => statusFilter.has(normalizeStatus(p.status)))
      .sort((a, b) => {
        const dateA = a.postedAt ? new Date(a.postedAt) : new Date(a.scheduledAt);
        const dateB = b.postedAt ? new Date(b.postedAt) : new Date(b.scheduledAt);
        return dateA.getTime() - dateB.getTime();
      });
  }, [selectedDatePosts, platformFilter, statusFilter]);

  function togglePlatformFilter(platform: string) {
    setPlatformFilter((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  function toggleStatusFilter(status: StatusFilterKey) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  // Helper function to check if a date matches the selected date
  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return selectedDate.toDateString() === date.toDateString();
  };

  const isCompact = !!selectedDate;

  const calendarCard = (
    <Card className={cn(isCompact && "shrink-0")}>
      <CardHeader className={cn(isCompact ? "p-3 pb-1" : "p-4")}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className={cn(isCompact ? "text-base" : "text-lg")}>Calendar</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className={cn(isCompact ? "h-7 w-7" : "h-8 w-8")} onClick={handlePreviousMonth}>
              <ChevronLeft className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </Button>
            <span className={cn("font-medium text-center", isCompact ? "text-sm min-w-[120px]" : "text-base min-w-[140px]")}>
              {monthName}
            </span>
            <Button variant="outline" size="icon" className={cn(isCompact ? "h-7 w-7" : "h-8 w-8")} onClick={handleNextMonth}>
              <ChevronRight className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">Click a date to see posts</CardDescription>
      </CardHeader>
      <CardContent className={cn(isCompact ? "p-3 pt-0" : "p-4 pt-0")}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isCompact ? (
          <div className="space-y-1">
            <div className="grid grid-cols-7 gap-0.5">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {emptyDays.map((_, i) => (
                <div key={`e-${i}`} className="aspect-square max-w-[36px] w-full" />
              ))}
              {daysInMonth.map((day) => {
                const counts = getPostCountsForDate(day);
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isSelected = isDateSelected(date);
                const isTodayDate = isToday(day);
                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "aspect-square max-w-[36px] w-full rounded border text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-0",
                      isTodayDate && !isSelected && "bg-blue-500/20 border-blue-500",
                      isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background",
                      isSelected && isTodayDate && "bg-blue-600 border-blue-600 text-white",
                      isSelected && !isTodayDate && "bg-primary/90 border-primary text-primary-foreground",
                      !isSelected && !isTodayDate && "border-border hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    {day}
                    {counts.total > 0 && (
                      <span className={cn("text-[9px] opacity-80", isSelected && "text-current")}>
                        {counts.instagram ? "I" : ""}{counts.facebook ? "F" : ""}{counts.youtube ? "Y" : ""}{counts.gmb ? "G" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-12rem)] flex flex-col">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {emptyDays.map((_, i) => (
                <div key={`e-${i}`} className="min-h-[80px] rounded-lg border border-transparent" />
              ))}
              {daysInMonth.map((day) => {
                const counts = getPostCountsForDate(day);
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isSelected = isDateSelected(date);
                const isTodayDate = isToday(day);
                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "min-h-[80px] rounded-lg border-2 p-2 transition-all flex flex-col text-left",
                      isTodayDate && !isSelected && "bg-blue-500/20 border-blue-500 hover:shadow",
                      isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background",
                      isSelected && isTodayDate && "bg-blue-600 border-blue-600 text-white",
                      isSelected && !isTodayDate && "bg-primary/90 border-primary text-primary-foreground",
                      !isSelected && !isTodayDate && "border-border hover:border-primary/50 hover:shadow hover:bg-muted/20"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isSelected && "text-primary-foreground",
                        isTodayDate && !isSelected && "text-blue-700 dark:text-blue-300"
                      )}
                    >
                      {day}
                    </span>
                    <div className="flex-1 flex flex-wrap items-end gap-1 mt-1">
                      {counts.total > 0 ? (
                        <>
                          {counts.instagram > 0 && (
                            <span className="flex items-center gap-0.5" title={`${counts.instagram} Instagram`}>
                              <Instagram className={cn("h-3.5 w-3.5", isSelected ? "text-current" : platformColors.instagram)} />
                              {counts.instagram > 1 && <span className="text-[10px] font-medium">{counts.instagram}</span>}
                            </span>
                          )}
                          {counts.facebook > 0 && (
                            <span className="flex items-center gap-0.5" title={`${counts.facebook} Facebook`}>
                              <Facebook className={cn("h-3.5 w-3.5", isSelected ? "text-current" : platformColors.facebook)} />
                              {counts.facebook > 1 && <span className="text-[10px] font-medium">{counts.facebook}</span>}
                            </span>
                          )}
                          {counts.youtube > 0 && (
                            <span className="flex items-center gap-0.5" title={`${counts.youtube} YouTube`}>
                              <Youtube className={cn("h-3.5 w-3.5", isSelected ? "text-current" : platformColors.youtube)} />
                              {counts.youtube > 1 && <span className="text-[10px] font-medium">{counts.youtube}</span>}
                            </span>
                          )}
                          {counts.gmb > 0 && (
                            <span className="flex items-center gap-0.5" title={`${counts.gmb} GMB`}>
                              <Building2 className={cn("h-3.5 w-3.5", isSelected ? "text-current" : platformColors.gmb)} />
                              {counts.gmb > 1 && <span className="text-[10px] font-medium">{counts.gmb}</span>}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">0</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const rightPanel = selectedDate && (
    <Card className="flex-1 min-w-0 border-primary/20 flex flex-col">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {formatDate(selectedDate)}
              {selectedDate.toDateString() === today.toDateString() && (
                <Badge variant="default" className="bg-blue-500">Today</Badge>
              )}
            </CardTitle>
            <CardDescription>{selectedDatePosts.length} post{selectedDatePosts.length !== 1 ? "s" : ""} on this day</CardDescription>
          </div>
          <Button onClick={handleCreatePost} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Platform filter (multi-select) */}
        <div className="space-y-2 mb-3">
          <p className="text-xs font-medium text-muted-foreground">Filter by platform</p>
          <div className="flex flex-wrap gap-3">
            {PLATFORM_KEYS.map((key) => {
              const Icon = platformIcons[key];
              const checked = platformFilter.has(key);
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors",
                    checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => togglePlatformFilter(key)}
                    className="border-muted-foreground"
                  />
                  {Icon && <Icon className={cn("h-4 w-4", platformColors[key])} />}
                  <span className="capitalize">{key === "gmb" ? "GMB" : key}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Status filter: Posted, Scheduled, Failed (default: Posted + Scheduled) */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-muted-foreground">Filter by status</p>
          <div className="flex flex-wrap gap-3">
            {STATUS_KEYS.map(({ key, label }) => {
              const checked = statusFilter.has(key);
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors",
                    checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleStatusFilter(key)}
                    className="border-muted-foreground"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Posts list (ascending order by date/time) */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-2">Posts (soonest first)</p>
          {filteredSelectedPosts.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {selectedDatePosts.length === 0
                  ? "No posts on this day"
                  : "No posts match the selected filters"}
              </p>
              {selectedDatePosts.length === 0 && (
                <Button onClick={handleCreatePost} variant="outline" size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Create Post
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSelectedPosts.map((post) => {
                const PlatformIcon = platformIcons[post.platform?.toLowerCase()] || Instagram;
                const platformColor = platformColors[post.platform?.toLowerCase()] || platformColors.instagram;
                const platformBg = platformBgColors[post.platform?.toLowerCase()] || platformBgColors.instagram;
                const postDateTime = post.postedAt ? new Date(post.postedAt) : new Date(post.scheduledAt);
                const isPosted = post.status === "posted" || post.status === "success" || !!post.postedAt;
                return (
                  <div
                    key={post.id}
                    className={cn("rounded-lg border p-3 space-y-2", platformBg)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("p-1.5 rounded bg-background/50 shrink-0", platformColor)}>
                          <PlatformIcon className={cn("h-4 w-4", platformColor)} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm capitalize flex items-center gap-1.5">
                            {post.platform}
                            {(post.socialAccount?.displayName || post.socialAccount?.username) && (
                              <span className="text-muted-foreground font-normal truncate">
                                · {post.socialAccount.displayName || post.socialAccount.username}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {isPosted ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                              <Clock className="h-3 w-3 text-yellow-500 shrink-0" />
                            )}
                            <span>
                              {postDateTime.toLocaleDateString()} at {formatTime(post.scheduledAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={isPosted ? "default" : "secondary"} className={cn("shrink-0", isPosted && "bg-green-500/10 text-green-600 border-green-500/20")}>
                        {isPosted ? "Posted" : post.status}
                      </Badge>
                    </div>
                    {post.content && <p className="text-xs text-foreground/80 line-clamp-2">{post.content}</p>}
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View post
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout title="Day Planner" subtitle="View and manage your scheduled and posted content by date">
      <div className={cn("max-w-7xl mx-auto", selectedDate ? "flex gap-4 items-stretch" : "flex justify-center")}>
        {selectedDate ? (
          <>
            <div className="w-[280px] shrink-0">{calendarCard}</div>
            <div className="flex-1 min-w-0 flex flex-col">{rightPanel}</div>
          </>
        ) : (
          <div className="w-[90%] min-w-[320px] max-w-[1100px]">{calendarCard}</div>
        )}
      </div>
    </MainLayout>
  );
}
