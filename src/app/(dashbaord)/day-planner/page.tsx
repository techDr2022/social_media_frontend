"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Instagram, 
  Facebook, 
  Youtube, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle
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
  socialAccount?: {
    displayName?: string;
    username?: string;
  };
}

interface PostCounts {
  instagram: number;
  facebook: number;
  youtube: number;
  total: number;
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

export default function DayPlannerPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDatePosts, setSelectedDatePosts] = useState<ScheduledPost[]>([]);

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

      const res = await fetch("/api/scheduled-posts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const scheduledPosts = await res.json();
        setPosts(scheduledPosts);
      }
    } catch (err) {
      console.error("Failed to load scheduled posts:", err);
    } finally {
      setLoading(false);
    }
  }

  function filterPostsByDate(date: Date) {
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Don't show posts for past dates
    if (selectedDateOnly < today) {
      setSelectedDatePosts([]);
      return;
    }
    
    const filtered = posts.filter((post) => {
      if (!post.scheduledAt && !post.postedAt) return false;
      
      // Only show scheduled posts (pending/scheduled) or posts posted today/future
      // Don't show posts that were posted in the past
      const postDate = post.postedAt 
        ? new Date(post.postedAt) 
        : new Date(post.scheduledAt);
      
      // If post was already posted and it's in the past, don't show it
      if (post.postedAt) {
        const postedDateOnly = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());
        if (postedDateOnly < today) return false;
      }
      
      // Compare dates only (ignore time)
      const postDateOnly = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());
      
      return postDateOnly.getTime() === selectedDateOnly.getTime();
    });

    setSelectedDatePosts(filtered);
  }

  function getPostCountsForDate(day: number): PostCounts {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Skip if this date is in the past
    if (dateOnly < today) {
      return { instagram: 0, facebook: 0, youtube: 0, total: 0 };
    }

    const dayPosts = posts.filter((post) => {
      if (!post.scheduledAt && !post.postedAt) return false;
      
      // Only show scheduled posts (pending/scheduled) or posts posted today/future
      // Don't show posts that were posted in the past
      const postDate = post.postedAt 
        ? new Date(post.postedAt) 
        : new Date(post.scheduledAt);
      
      // If post was already posted and it's in the past, don't show it
      if (post.postedAt) {
        const postedDateOnly = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());
        if (postedDateOnly < today) return false;
      }
      
      // Compare dates only (ignore time)
      const postDateOnly = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());
      const startDateOnly = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate());
      
      return postDateOnly.getTime() === startDateOnly.getTime();
    });

    const counts: PostCounts = {
      instagram: 0,
      facebook: 0,
      youtube: 0,
      total: dayPosts.length,
    };

    dayPosts.forEach((post) => {
      const platform = post.platform?.toLowerCase();
      if (platform === "instagram") counts.instagram++;
      else if (platform === "facebook") counts.facebook++;
      else if (platform === "youtube") counts.youtube++;
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

  return (
    <MainLayout
      title="Day Planner"
      subtitle="View and manage your scheduled and posted content by date"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Calendar View */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calendar View</CardTitle>
                <CardDescription>Click on any date to see posts for that day</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-lg font-semibold min-w-[200px] text-center">
                  {monthName}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Empty cells for days before month starts */}
                  {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}

                  {/* Days of the month */}
                  {daysInMonth.map((day) => {
                    const counts = getPostCountsForDate(day);
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isTodayDate = isToday(day);
                    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    const isPastDate = dateOnly < today;

                    return (
                      <button
                        key={day}
                        onClick={() => !isPastDate && handleDateClick(day)}
                        disabled={isPastDate}
                        className={cn(
                          "aspect-square rounded-lg border-2 p-2 transition-all relative",
                          // Past dates - disabled and grayed out
                          isPastDate && "opacity-40 cursor-not-allowed bg-muted/30 border-muted",
                          // Today's date - blue background
                          !isPastDate && isTodayDate && !isSelected && "bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/30 hover:shadow-md",
                          // Selected date - primary color background
                          !isPastDate && isSelected && "bg-primary border-primary shadow-lg ring-2 ring-primary/50",
                          // Today and selected - combine both styles
                          !isPastDate && isTodayDate && isSelected && "bg-blue-600 border-blue-600 shadow-lg ring-2 ring-blue-600/50",
                          // Normal future date
                          !isPastDate && !isTodayDate && !isSelected && "border-border hover:border-primary/50 bg-background hover:shadow-md"
                        )}
                      >
                        <div className="flex flex-col h-full">
                          <div className={cn(
                            "text-sm font-medium mb-1",
                            // Today's date text color
                            isTodayDate && !isSelected && "text-blue-700 dark:text-blue-300 font-bold",
                            // Selected date text color
                            isSelected && "text-primary-foreground font-bold",
                            // Today and selected
                            isTodayDate && isSelected && "text-white font-bold",
                            // Normal date
                            !isTodayDate && !isSelected && "text-foreground"
                          )}>
                            {day}
                          </div>
                          <div className="flex-1 flex flex-col gap-1 justify-end">
                            {counts.total > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {counts.instagram > 0 && (
                                  <div className="flex items-center gap-0.5" title={`${counts.instagram} Instagram post(s)`}>
                                    <Instagram className={cn(
                                      "h-3 w-3", 
                                      platformColors.instagram,
                                      (isSelected || isTodayDate) && "opacity-90"
                                    )} />
                                    {counts.instagram > 1 && (
                                      <span className={cn(
                                        "text-[10px] font-medium",
                                        isSelected && "text-primary-foreground",
                                        isTodayDate && !isSelected && "text-blue-700 dark:text-blue-300"
                                      )}>{counts.instagram}</span>
                                    )}
                                  </div>
                                )}
                                {counts.facebook > 0 && (
                                  <div className="flex items-center gap-0.5" title={`${counts.facebook} Facebook post(s)`}>
                                    <Facebook className={cn(
                                      "h-3 w-3", 
                                      platformColors.facebook,
                                      (isSelected || isTodayDate) && "opacity-90"
                                    )} />
                                    {counts.facebook > 1 && (
                                      <span className={cn(
                                        "text-[10px] font-medium",
                                        isSelected && "text-primary-foreground",
                                        isTodayDate && !isSelected && "text-blue-700 dark:text-blue-300"
                                      )}>{counts.facebook}</span>
                                    )}
                                  </div>
                                )}
                                {counts.youtube > 0 && (
                                  <div className="flex items-center gap-0.5" title={`${counts.youtube} YouTube post(s)`}>
                                    <Youtube className={cn(
                                      "h-3 w-3", 
                                      platformColors.youtube,
                                      (isSelected || isTodayDate) && "opacity-90"
                                    )} />
                                    {counts.youtube > 1 && (
                                      <span className={cn(
                                        "text-[10px] font-medium",
                                        isSelected && "text-primary-foreground",
                                        isTodayDate && !isSelected && "text-blue-700 dark:text-blue-300"
                                      )}>{counts.youtube}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={cn(
                                "text-[10px]",
                                isSelected && "text-primary-foreground/70",
                                isTodayDate && !isSelected && "text-blue-700/70 dark:text-blue-300/70",
                                !isTodayDate && !isSelected && "text-muted-foreground"
                              )}>0</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Date Posts */}
        {selectedDate && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {formatDate(selectedDate)}
                      {selectedDate.toDateString() === today.toDateString() && (
                        <Badge variant="default" className="bg-blue-500">
                          Today
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {selectedDatePosts.length} post{selectedDatePosts.length !== 1 ? "s" : ""} on this day
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={handleCreatePost} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Post
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedDatePosts.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No posts scheduled or posted on this day</p>
                  <Button onClick={handleCreatePost} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDatePosts
                    .sort((a, b) => {
                      const dateA = a.postedAt ? new Date(a.postedAt) : new Date(a.scheduledAt);
                      const dateB = b.postedAt ? new Date(b.postedAt) : new Date(b.scheduledAt);
                      return dateA.getTime() - dateB.getTime();
                    })
                    .map((post) => {
                      const PlatformIcon = platformIcons[post.platform?.toLowerCase() as keyof typeof platformIcons] || Instagram;
                      const platformColor = platformColors[post.platform?.toLowerCase() as keyof typeof platformColors] || platformColors.instagram;
                      const platformBg = platformBgColors[post.platform?.toLowerCase() as keyof typeof platformBgColors] || platformBgColors.instagram;
                      const postDate = post.postedAt ? new Date(post.postedAt) : new Date(post.scheduledAt);
                      const isPosted = post.status === "posted" || post.status === "success" || !!post.postedAt;

                      return (
                        <div
                          key={post.id}
                          className={cn(
                            "rounded-lg border p-4 space-y-3",
                            platformBg
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg bg-background/50",
                                platformColor
                              )}>
                                <PlatformIcon className={cn("h-5 w-5", platformColor)} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold capitalize">
                                    {post.platform}
                                  </h4>
                                  {post.socialAccount?.displayName || post.socialAccount?.username ? (
                                    <Badge variant="secondary" className="text-xs">
                                      {post.socialAccount.displayName || post.socialAccount.username}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {isPosted ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      <span className="text-xs text-muted-foreground">
                                        Posted at {formatTime(post.postedAt || post.scheduledAt)}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3 w-3 text-yellow-500" />
                                      <span className="text-xs text-muted-foreground">
                                        Scheduled for {formatTime(post.scheduledAt)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={isPosted ? "default" : "secondary"}
                              className={cn(
                                isPosted && "bg-green-500/10 text-green-600 border-green-500/20"
                              )}
                            >
                              {isPosted ? "Posted" : post.status}
                            </Badge>
                          </div>
                          
                          {post.content && (
                            <p className="text-sm text-foreground/80 line-clamp-2">
                              {post.content}
                            </p>
                          )}

                          {post.mediaUrl && (
                            <div className="rounded-lg overflow-hidden max-w-xs">
                              {post.mediaUrl.match(/\.(mp4|mov|avi)$/i) ? (
                                <video
                                  src={post.mediaUrl}
                                  className="w-full h-auto"
                                  controls
                                />
                              ) : (
                                <img
                                  src={post.mediaUrl}
                                  alt="Post media"
                                  className="w-full h-auto rounded-lg"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
