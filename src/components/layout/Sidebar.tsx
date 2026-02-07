"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PenSquare,
  CalendarDays,
  Clock,
  Users,
  BarChart3,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  X,
  Instagram,
  Facebook,
  Youtube,
  Check,
  Image as ImageIcon,
  Key,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabaseclient";

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

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const platformIcons: Record<string, any> = {
  gmb: Building2,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  gmb: "text-blue-500",
  instagram: "text-pink-500",
  facebook: "text-blue-500",
  youtube: "text-red-500",
};

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: PenSquare, label: "Multiple Post", path: "/create-post" },
  { icon: CalendarDays, label: "Day Planner", path: "/day-planner" },
  { icon: Clock, label: "Upcoming Posts", path: "/upcoming-posts" },
  { icon: ImageIcon, label: "Media Library", path: "/media-library" },
  { icon: Users, label: "Accounts", path: "/connect" },
  { icon: Key, label: "Your keys", path: "/your-keys" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [selectedGmbLocationIds, setSelectedGmbLocationIds] = useState<Set<string>>(new Set());
  const [gmbLocationsByAccountId, setGmbLocationsByAccountId] = useState<Record<string, GmbLocation[]>>({});
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoadingAccounts(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setLoadingAccounts(false);
        return;
      }

      const res = await fetch("/api/social-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setAccounts(json);
        const gmbAccounts = (json as SocialAccount[]).filter((a) => (a.platform || "").toLowerCase() === "gmb");
        if (gmbAccounts.length > 0) {
          loadGmbLocationsForAccounts(gmbAccounts.map((a) => a.id), token);
        }
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function loadGmbLocationsForAccounts(accountIds: string[], token: string) {
    const next: Record<string, GmbLocation[]> = {};
    await Promise.all(
      accountIds.map(async (accountId) => {
        try {
          const res = await fetch(`${apiUrl()}/api/v1/gmb/locations?accountId=${accountId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const locs: GmbLocation[] = await res.json();
            next[accountId] = locs;
          }
        } catch (e) {
          console.error("Failed to load GMB locations for", accountId, e);
        }
      })
    );
    setGmbLocationsByAccountId((prev) => ({ ...prev, ...next }));
  }

  const gmbLocationsFlat = useMemo(() => {
    const list: (GmbLocation & { accountId: string })[] = [];
    for (const [accountId, locs] of Object.entries(gmbLocationsByAccountId)) {
      for (const loc of locs) {
        list.push({ ...loc, accountId });
      }
    }
    return list;
  }, [gmbLocationsByAccountId]);

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

  const filteredGmbLocations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return gmbLocationsFlat.filter((loc) => {
      const name = (loc.name || "").toLowerCase();
      const address = (loc.address || "").toLowerCase();
      return name.includes(query) || address.includes(query) || "gmb".includes(query) || "google".includes(query);
    });
  }, [gmbLocationsFlat, searchQuery]);

  const totalSelected = selectedAccounts.size + selectedGmbLocationIds.size;

  function toggleAccount(accountId: string) {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }

  function toggleGmbLocation(locationId: string) {
    setSelectedGmbLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) next.delete(locationId);
      else next.add(locationId);
      return next;
    });
  }

  function handlePost() {
    if (totalSelected === 0) return;
    const accountIds = Array.from(selectedAccounts).join(",");
    const gmbIds = Array.from(selectedGmbLocationIds).join(",");
    const params = new URLSearchParams();
    if (accountIds) params.set("accounts", accountIds);
    if (gmbIds) params.set("gmb", gmbIds);
    router.push(`/create-post?${params.toString()}`);
    setSelectedAccounts(new Set());
    setSelectedGmbLocationIds(new Set());
    setSearchQuery("");
    setShowSearchResults(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[240px]"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-lg shadow-primary/25">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              {!collapsed && (
                <span className="text-lg font-semibold text-foreground animate-fade-in">
                  SocialFlow
                </span>
              )}
            </Link>
          </div>

          {/* Quick Search */}
          {!collapsed && (
            <div className="border-b border-border p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search accounts..."
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
                  className="pl-8 pr-8 h-9 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setShowSearchResults(false);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              {/* Search Results: accounts + GMB locations */}
              {showSearchResults && (filteredAccounts.length > 0 || filteredGmbLocations.length > 0) && (
                <div className="border rounded-lg p-2 bg-background max-h-56 overflow-y-auto space-y-1">
                  {filteredAccounts.length > 0 && (
                    <>
                      <div className="text-[10px] font-medium text-muted-foreground px-1 py-0.5">Accounts</div>
                      {filteredAccounts.map((account) => {
                        const isSelected = selectedAccounts.has(account.id);
                        const platform = account.platform?.toLowerCase() || "unknown";
                        const Icon = platformIcons[platform] || Instagram;
                        const accountName = account.displayName || account.username || account.externalId;
                        return (
                          <div
                            key={account.id}
                            className={cn(
                              "flex items-center gap-2 rounded p-2 transition-all cursor-pointer text-xs",
                              isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                            )}
                            onClick={() => toggleAccount(account.id)}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded flex items-center justify-center",
                              platformColors[platform] || platformColors.instagram,
                              "bg-current/10"
                            )}>
                              <Icon className={cn("h-3 w-3", platformColors[platform] || platformColors.instagram)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{accountName}</div>
                              <div className="text-[10px] text-muted-foreground capitalize">{platform}</div>
                            </div>
                            {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                          </div>
                        );
                      })}
                    </>
                  )}
                  {filteredGmbLocations.length > 0 && (
                    <>
                      <div className="text-[10px] font-medium text-muted-foreground px-1 py-0.5 mt-1">GMB locations</div>
                      {filteredGmbLocations.map((loc) => {
                        const isSelected = selectedGmbLocationIds.has(loc.id);
                        const Icon = Building2;
                        return (
                          <div
                            key={loc.id}
                            className={cn(
                              "flex items-center gap-2 rounded p-2 transition-all cursor-pointer text-xs",
                              isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                            )}
                            onClick={() => toggleGmbLocation(loc.id)}
                          >
                            <div className={cn("w-4 h-4 rounded flex items-center justify-center text-blue-500 bg-current/10")}>
                              <Icon className="h-3 w-3 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{loc.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{loc.address || "GMB"}</div>
                            </div>
                            {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
              
              {/* Selected Badge & Post Button */}
              {totalSelected > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {totalSelected} selected
                  </Badge>
                  <Button
                    size="sm"
                    onClick={handlePost}
                    className="h-7 text-xs flex-1"
                  >
                    Post
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
            {navItems.map((item, index) => {
              const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span className="animate-fade-in">{item.label}</span>}
                  {isActive && !collapsed && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-scale-in" />
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.path} delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover border-border">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.path}>{linkContent}</div>;
            })}
          </nav>

          {/* Collapse Button */}
          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "default"}
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "w-full text-muted-foreground hover:text-foreground",
                collapsed && "px-2"
              )}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "default"}
              onClick={handleLogout}
              className={cn(
                "w-full mt-2 text-destructive hover:text-destructive",
                collapsed && "px-2"
              )}
            >
              {!collapsed && <span>Logout</span>}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}


