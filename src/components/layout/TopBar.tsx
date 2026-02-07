"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, LogOut, User, Settings, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseclient";

interface Alert {
  id: string;
  type: 'scheduled' | 'processing' | 'success' | 'failed';
  platform: string;
  title: string;
  message: string;
  accountName?: string;
  postType?: string;
  scheduledAt?: string;
  isRead: boolean;
  createdAt: string;
}

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { session } = useAuth();
  
  // Alert state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const alertsContainerRef = useRef<HTMLDivElement>(null);

  // Ref to clear polling when we get 401 (e.g. token expired)
  const unreadCountIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store access_token in ref to avoid recreating callback
  const accessTokenRef = useRef<string | undefined>(session?.access_token);
  
  // Update ref when token changes
  useEffect(() => {
    accessTokenRef.current = session?.access_token;
  }, [session?.access_token]);

  // Fetch unread count - use ref to avoid dependency issues
  const fetchUnreadCount = useCallback(async () => {
    const token = accessTokenRef.current;
    if (!token) return;

    try {
      const response = await fetch("/api/alerts/unread-count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expired or invalid – stop polling so we don't spam 401s
        if (unreadCountIntervalRef.current) {
          clearInterval(unreadCountIntervalRef.current);
          unreadCountIntervalRef.current = null;
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, []); // No dependencies - uses ref instead

  // Fetch alerts
  const fetchAlerts = useCallback(async (cursor?: string | null, append = false) => {
    if (!session?.access_token || loading) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "4");
      if (cursor) params.set("cursor", cursor);
      
      const response = await fetch(`/api/alerts?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setAlerts(prev => {
            // Filter out duplicates by checking if alert ID already exists
            const existingIds = new Set(prev.map(alert => alert.id));
            const newAlerts = (data.alerts || []).filter((alert: Alert) => !existingIds.has(alert.id));
            return [...prev, ...newAlerts];
          });
        } else {
          setAlerts(data.alerts || []);
        }
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!session?.access_token) return;
    
    try {
      const response = await fetch("/api/alerts", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [session]);

  // Handle dropdown open
  const handleDropdownOpenChange = (open: boolean) => {
    setDropdownOpen(open);
    if (open) {
      fetchAlerts(null, false);
      markAllAsRead();
    }
  };

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = alertsContainerRef.current;
    if (!container || loading || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      // Near bottom, load more
      fetchAlerts(nextCursor, true);
    }
  }, [loading, hasMore, nextCursor, fetchAlerts]);

  // Command+K keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch unread count only when logged in; poll every 30s; stop on 401
  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      // Clear interval if no token
      if (unreadCountIntervalRef.current) {
        clearInterval(unreadCountIntervalRef.current);
        unreadCountIntervalRef.current = null;
      }
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchUnreadCount();
    
    // Set up polling every 30 seconds (not every render!)
    unreadCountIntervalRef.current = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    
    return () => {
      if (unreadCountIntervalRef.current) {
        clearInterval(unreadCountIntervalRef.current);
        unreadCountIntervalRef.current = null;
      }
    };
  }, [session?.access_token, fetchUnreadCount]); // Fixed length (2) so array size never changes; fetchUnreadCount is stable ([] deps)

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or perform search
      // For now, just log it - you can implement actual search later
      console.log("Searching for:", searchQuery);
      // router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Get user info from session
  const userEmail = session?.user?.email || "";
  const userName = session?.user?.user_metadata?.full_name || 
                   session?.user?.user_metadata?.name || 
                   userEmail.split("@")[0] || 
                   "User";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      {/* Page Title */}
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <div
            className={`relative transition-all duration-300 ${
              searchFocused ? "w-80" : "w-64"
            }`}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search posts, accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 bg-secondary/50 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:bg-secondary"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
              ⌘K
            </kbd>
          </div>
        </form>

        {/* Notifications */}
        <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-primary p-0 text-[10px] font-medium flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-popover border-border p-0">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium">Notifications</p>
            </div>
            <div 
              ref={alertsContainerRef}
              className="max-h-[400px] overflow-y-auto"
              onScroll={handleScroll}
            >
              {alerts.length === 0 && !loading ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {alerts.map((alert) => {
                    const getIcon = () => {
                      switch (alert.type) {
                        case 'scheduled':
                          return <Clock className="h-4 w-4 text-blue-500" />;
                        case 'processing':
                          return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
                        case 'success':
                          return <CheckCircle2 className="h-4 w-4 text-green-500" />;
                        case 'failed':
                          return <XCircle className="h-4 w-4 text-red-500" />;
                        default:
                          return <Bell className="h-4 w-4 text-muted-foreground" />;
                      }
                    };

                    const getTypeColor = () => {
                      switch (alert.type) {
                        case 'scheduled':
                          return 'bg-blue-500/10 text-blue-600';
                        case 'processing':
                          return 'bg-yellow-500/10 text-yellow-600';
                        case 'success':
                          return 'bg-green-500/10 text-green-600';
                        case 'failed':
                          return 'bg-red-500/10 text-red-600';
                        default:
                          return 'bg-muted text-muted-foreground';
                      }
                    };

                    return (
                      <div
                        key={alert.id}
                        className={`px-4 py-3 hover:bg-secondary/50 transition-colors ${
                          !alert.isRead ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-full ${getTypeColor()}`}>
                            {getIcon()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {alert.title}
                              </p>
                              {!alert.isRead && (
                                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {alert.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {loading && (
                    <div className="px-4 py-3 text-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                    </div>
                  )}
                  {hasMore && !loading && (
                    <div className="px-4 py-2 text-center text-xs text-muted-foreground">
                      Scroll to load more
                    </div>
                  )}
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 pl-2 pr-3"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium text-foreground">
                  {userName}
                </span>
                <span className="text-xs text-muted-foreground">Pro Plan</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-popover border-border"
          >
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => router.push("/profile")}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => router.push("/settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem 
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}




