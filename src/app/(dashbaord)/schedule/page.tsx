"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseclient";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Upload, Image as ImageIcon, Video, Loader2, Instagram, Facebook, Youtube, Check, Search, X } from "lucide-react";
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

export default function SchedulePage() {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [scheduledAt, setScheduledAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recentFiles, setRecentFiles] = useState<Array<{name: string, url: string, type: string, size: number, created: string}>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const SCHEDULE_ENDPOINT = "/api/scheduled-posts";
  const SOCIAL_ACCOUNTS_ENDPOINT = "/api/social-accounts";

  // Group accounts by platform - memoize to prevent unnecessary recalculations
  const accountsByPlatform = useMemo(() => {
    return accounts.reduce((acc, account) => {
      const platform = account.platform?.toLowerCase() || 'unknown';
      if (!acc[platform]) {
        acc[platform] = [];
      }
      acc[platform].push(account);
      return acc;
    }, {} as Record<string, SocialAccount[]>);
  }, [accounts]);

  const availablePlatforms = useMemo(() => {
    return ['instagram', 'facebook', 'youtube'].filter(
      platform => accountsByPlatform[platform] && accountsByPlatform[platform].length > 0
    );
  }, [accountsByPlatform]);

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
          setLoadingAccounts(false);
          return;
        }

        const res = await fetch(SOCIAL_ACCOUNTS_ENDPOINT, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Failed to load social accounts:", text);
          setStatus("Failed to load social accounts: " + text);
          setAccounts([]);
        } else {
          const json = await res.json();
          setAccounts(json);
        
        // Load recent files if Facebook accounts exist
        const facebookAccount = json.find((acc: SocialAccount) => acc.platform?.toLowerCase() === 'facebook');
            if (facebookAccount) {
              loadRecentFiles(facebookAccount.id);
            }
        
          setStatus("");
        }
      } catch (err: any) {
        console.error(err);
        setStatus("Error loading accounts: " + (err.message ?? String(err)));
      } finally {
        setLoadingAccounts(false);
      }
  }

  async function loadRecentFiles(accId: string) {
    try {
      const { data: files, error } = await supabase.storage
        .from('Facebook')
        .list(accId, {
          limit: 20,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error || !files) return;

      if (files.length > 0) {
        const fileList = await Promise.all(
          files.map(async (file) => {
            const { data: urlData } = supabase.storage
              .from('Facebook')
              .getPublicUrl(`${accId}/${file.name}`);
            
            return {
              name: file.name,
              url: urlData.publicUrl,
              type: file.metadata?.mimetype || (file.name.endsWith('.mp4') || file.name.endsWith('.mov') ? 'video' : 'image'),
              size: file.metadata?.size || 0,
              created: file.created_at || file.updated_at || '',
            };
          })
        );
        setRecentFiles(fileList);
      }
    } catch (err: any) {
      console.error('Error loading recent files:', err);
    }
  }

  function useRecentFile(file: {name: string, url: string, type: string}) {
    setMediaUrl(file.url);
        setStatus(`Selected: ${file.name}`);
  }

  // Use ref to prevent double-firing
  const isTogglingPlatformRef = useRef<Set<string>>(new Set());
  
  const togglePlatform = useCallback((platform: string) => {
    // Prevent if already toggling this platform
    if (isTogglingPlatformRef.current.has(platform)) {
      return;
    }
    
    isTogglingPlatformRef.current.add(platform);
    
    setSelectedPlatforms(prev => {
      const hasPlatform = prev.has(platform);
      const next = new Set(prev);
      
      if (hasPlatform) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      
      // Clear the lock after a tick
      Promise.resolve().then(() => {
        isTogglingPlatformRef.current.delete(platform);
      });
      
      return next;
    });
  }, []);

  // Simple toggle account - no auto-select platform to avoid nested updates
  // Use ref to prevent double-firing
  const isTogglingAccountRef = useRef<Set<string>>(new Set());
  
  const toggleAccount = useCallback((accountId: string) => {
    // Prevent if already toggling this account
    if (isTogglingAccountRef.current.has(accountId)) {
      return;
    }
    
    isTogglingAccountRef.current.add(accountId);
    
    setSelectedAccounts(prev => {
      const hasAccount = prev.has(accountId);
      const next = new Set(prev);
      
      if (hasAccount) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      
      // Clear the lock after a tick
      Promise.resolve().then(() => {
        isTogglingAccountRef.current.delete(accountId);
      });
      
      return next;
    });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMediaUrl(null); // Clear URL when new file selected
    }
  }

  async function uploadMediaToStorage(): Promise<string | null> {
    if (!file) return null;

    setUploading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Determine bucket based on selected platforms
      // Use first selected platform's bucket, or default to Instagram
      const firstPlatform = Array.from(selectedPlatforms)[0] || 'instagram';
      const bucket = firstPlatform.charAt(0).toUpperCase() + firstPlatform.slice(1);

      // Use first selected account ID for folder structure
      const firstAccountId = Array.from(selectedAccounts)[0];
      if (!firstAccountId) {
        throw new Error("No account selected");
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${firstAccountId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      throw new Error(`Media upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("Preparing...");
  
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("You must be signed in first.");
      setSubmitting(false);
      return;
    }
  
    // Validate selections
    if (selectedAccounts.size === 0) {
      setStatus("Please select at least one account to schedule posts for.");
      setSubmitting(false);
      return;
    }
  
    if (!content.trim()) {
      setStatus("Please enter post content.");
          setSubmitting(false);
          return;
        }
  
    if (!scheduledAt) {
      setStatus("Please select a scheduled time.");
        setSubmitting(false);
        return;
    }

    // Upload media if file is provided
    let finalMediaUrl = mediaUrl;
    if (file && !mediaUrl) {
      setStatus("Uploading media...");
      try {
        finalMediaUrl = await uploadMediaToStorage();
        if (finalMediaUrl) {
          setMediaUrl(finalMediaUrl);
        }
      } catch (error: any) {
        setStatus(`Error: ${error.message}`);
        setSubmitting(false);
        return;
      }
    }
  
    // Create scheduled posts for all selected accounts
    setStatus(`Scheduling posts for ${selectedAccounts.size} account(s)...`);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const accountId of selectedAccounts) {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) continue;

      const platform = account.platform?.toLowerCase() || '';
      
      // Skip YouTube for now (needs special handling)
      if (platform === 'youtube') {
        errors.push(`${platformNames[platform]}: YouTube scheduled posts not fully supported yet`);
        errorCount++;
        continue;
      }

      try {
    const fd = new FormData();
    fd.append("platform", platform);
    fd.append("content", content);
    fd.append("scheduledAt", new Date(scheduledAt).toISOString());
        fd.append("socialAccountId", accountId);
    fd.append("timezone", timezone);
  
        // Add media URL if available (from Supabase Storage)
        if (finalMediaUrl) {
          fd.append("mediaUrl", finalMediaUrl);
        }
  
      const res = await fetch(SCHEDULE_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
  
      if (!res.ok) {
        const text = await res.text();
          errors.push(`${platformNames[platform]} (${account.displayName || account.username}): ${text}`);
          errorCount++;
      } else {
          successCount++;
      }
    } catch (err: any) {
        errors.push(`${platformNames[platform]} (${account.displayName || account.username}): ${err.message}`);
        errorCount++;
      }
    }

    // Show results
    if (successCount > 0 && errorCount === 0) {
      setStatus(`✅ Successfully scheduled ${successCount} post(s)!`);
      // Reset form
      setContent("");
      setFile(null);
      setMediaUrl(null);
      setScheduledAt("");
      setSelectedPlatforms(new Set());
      setSelectedAccounts(new Set());
    } else if (successCount > 0 && errorCount > 0) {
      setStatus(`⚠️ Scheduled ${successCount} post(s), but ${errorCount} failed:\n${errors.join('\n')}`);
    } else {
      setStatus(`❌ Failed to schedule posts:\n${errors.join('\n')}`);
    }

    setSubmitting(false);
  }

  return (
    <MainLayout
      title="Schedule Post"
      subtitle="Create and schedule content across multiple platforms and accounts"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Status Card */}
        {status && (
          <Card className={cn(
            status.startsWith("✅") ? "border-green-500" : 
            status.startsWith("❌") ? "border-red-500" : 
            status.startsWith("⚠️") ? "border-yellow-500" : "border-border"
          )}>
            <CardContent className="pt-6">
              <p className={cn(
                "text-sm whitespace-pre-line",
                status.startsWith("✅") ? "text-green-600" : 
                status.startsWith("❌") ? "text-red-600" : 
                status.startsWith("⚠️") ? "text-yellow-600" : "text-muted-foreground"
              )}>
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform & Account Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle>Select Platforms & Accounts</CardTitle>
              <CardDescription>
                Choose one or more platforms and accounts to schedule posts for
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
                    onClick={() => window.location.href = '/connect'}
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

                  {/* Platform Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Platforms</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['instagram', 'facebook', 'youtube'].map((platform) => {
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
                                if (hasAccounts) {
                                  togglePlatform(platform);
                                }
                              }}
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                                  platformColors[platform] || platformColors.instagram
                                )}>
                                  <Icon className="h-4 w-4 text-white" />
                                </div>
                                <Label className="font-medium cursor-pointer">
                                  {platformNames[platform]}
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {hasAccounts 
                                  ? `${platformAccounts.length} account${platformAccounts.length > 1 ? 's' : ''}`
                                  : 'No accounts'
                                }
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Account Selection by Platform */}
                  {selectedPlatforms.size > 0 && (
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Accounts</Label>
                <div className="space-y-4">
                        {Array.from(selectedPlatforms).map((platform) => {
                          const platformAccounts = accountsByPlatform[platform] || [];
                          const Icon = platformIcons[platform] || Instagram;

                          return (
                            <div key={platform} className="space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={cn(
                                  "w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br",
                                  platformColors[platform] || platformColors.instagram
                                )}>
                                  <Icon className="h-3 w-3 text-white" />
                                </div>
                                <Label className="font-medium">
                                  {platformNames[platform]} Accounts
                                </Label>
                                <Badge variant="secondary">
                                  {platformAccounts.filter(acc => selectedAccounts.has(acc.id)).length} / {platformAccounts.length} selected
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
                                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                      )}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => {
                                          toggleAccount(account.id);
                                        }}
                                      />
                                      <Label 
                                        className="flex-1 cursor-pointer text-sm"
                                      >
                                        {account.displayName || account.username || account.externalId}
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

                  {/* Summary */}
                  {selectedAccounts.size > 0 && (
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium text-primary">
                        📋 {selectedAccounts.size} account(s) selected across {selectedPlatforms.size} platform(s)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Post Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Post Details</CardTitle>
              <CardDescription>Configure your post content and schedule time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="What's on your mind? This content will be posted to all selected accounts."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledAt">
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Scheduled At
                </Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  All selected accounts will post at this exact time
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="media">
                  <Upload className="inline h-4 w-4 mr-2" />
                  Media (optional)
                </Label>
                
                {recentFiles.length > 0 && (
                  <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                    <p className="text-sm font-medium mb-3 text-muted-foreground">Recent Uploads</p>
                    <div className="grid grid-cols-4 gap-3 max-h-32 overflow-y-auto">
                      {recentFiles.map((file, idx) => (
                        <div
                          key={idx}
                          onClick={() => useRecentFile(file)}
                          className={cn(
                            "relative cursor-pointer rounded-lg overflow-hidden border transition-colors group",
                            mediaUrl === file.url ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary"
                          )}
                        >
                          {file.type === 'video' ? (
                            <video 
                              src={file.url} 
                              className="w-full h-16 object-cover"
                              muted
                            />
                          ) : (
                            <img 
                              src={file.url} 
                              alt={file.name}
                              className="w-full h-16 object-cover"
                            />
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">
                            {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                          </div>
                          {mediaUrl === file.url && (
                            <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Input
                  id="media"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                />
                {(file || mediaUrl) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {file && (
                      <>
                    {file.type.startsWith('video') ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    <span>{file.name}</span>
                    <Badge variant="secondary">{(file.size / (1024 * 1024)).toFixed(2)}MB</Badge>
                      </>
                    )}
                    {mediaUrl && !file && (
                      <span className="text-green-600">✓ Media URL selected</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedAccounts.size > 0 && (
                <span>
                  Will schedule {selectedAccounts.size} post(s) for {selectedPlatforms.size} platform(s)
                </span>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={submitting || uploading || selectedAccounts.size === 0} 
              size="lg" 
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Schedule {selectedAccounts.size > 0 ? `${selectedAccounts.size} Post(s)` : 'Post'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
