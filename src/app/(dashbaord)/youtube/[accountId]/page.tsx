"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Youtube, ArrowLeft, Loader2, Play, ExternalLink, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

type YoutubeAccount = {
  id: string;
  displayName: string;
  externalId: string;
  platform: string;
  isActive: boolean;
  createdAt: string;
};

export default function YoutubeAccountPage({ params }: any) {
  const router = useRouter();
  const [account, setAccount] = useState<YoutubeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [statistics, setStatistics] = useState({
    videosPublished: 0,
    scheduled: 0,
    thisMonth: 0,
  });
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setError("");

      // Get accountId from params (handle both sync and async)
      let id: string;
      try {
        if (params && typeof params === 'object' && 'accountId' in params) {
          id = params.accountId;
        } else if (params && typeof params.then === 'function') {
          const resolvedParams = await params;
          id = resolvedParams.accountId;
        } else {
          console.error("Params structure:", params);
          setError("Invalid account ID - params not found");
          setLoading(false);
          return;
        }

        if (!id) {
          setError("Account ID is missing");
          setLoading(false);
      return;
    }

        setAccountId(id);
      } catch (err: any) {
        console.error("Error parsing params:", err);
        setError("Error parsing account ID: " + err.message);
        setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

      if (!token) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/social-accounts", {
      headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorText = await res.text();
          setError(`Failed to load account: ${errorText}`);
          setLoading(false);
          return;
        }

        const json = await res.json();
        
        // Filter for YouTube accounts
        const youtubeAccounts = json.filter(
          (a: any) => a.platform === "youtube"
        );
        
        // Debug logging
        console.log("🔍 Looking for account ID:", id);
        console.log("📋 All accounts from API:", json);
        console.log("📺 YouTube accounts:", youtubeAccounts);
        console.log("🆔 Account IDs available:", youtubeAccounts.map((a: any) => ({ id: a.id, type: typeof a.id })));
        
        // Find account by ID (try both exact match and string comparison)
        const foundAccount = youtubeAccounts.find(
          (a: any) => {
            const accountIdStr = String(id).trim();
            const aIdStr = String(a.id).trim();
            const exactMatch = a.id === id;
            const stringMatch = aIdStr === accountIdStr;
            console.log(`Comparing: "${aIdStr}" === "${accountIdStr}" ? ${stringMatch} (exact: ${exactMatch})`);
            return exactMatch || stringMatch;
          }
        );

        if (!foundAccount) {
          const availableIds = youtubeAccounts.map((a: any) => a.id).join(", ");
          console.error("❌ Account not found!");
          console.error("Looking for:", id, `(type: ${typeof id})`);
          console.error("Available IDs:", availableIds);
          setError(`Account not found. Looking for: ${id}. Available: ${availableIds || "none"}`);
          setLoading(false);
      return;
    }

        console.log("✅ Account found:", foundAccount);

        setAccount(foundAccount);
        
        // Load statistics
        try {
          const statsRes = await fetch(`/api/social-accounts/youtube/${foundAccount.id}/statistics`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStatistics(statsData);
          } else {
            console.error("Statistics API error:", statsRes.status, await statsRes.text().catch(() => ''));
            // Set default values if API fails
            setStatistics({ videosPublished: 0, scheduled: 0, thisMonth: 0 });
          }
        } catch (statsErr) {
          console.error("Failed to load statistics:", statsErr);
          // Set default values if fetch fails
          setStatistics({ videosPublished: 0, scheduled: 0, thisMonth: 0 });
        }

        // Load recent videos
        setLoadingVideos(true);
        try {
          const videosRes = await fetch(`/api/social-accounts/youtube/${foundAccount.id}/videos`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (videosRes.ok) {
            const videosData = await videosRes.json();
            setRecentVideos(videosData);
          } else {
            console.error("Videos API error:", videosRes.status);
            setRecentVideos([]);
          }
        } catch (videosErr) {
          console.error("Failed to load videos:", videosErr);
          setRecentVideos([]);
        } finally {
          setLoadingVideos(false);
        }
    } catch (err: any) {
        setError("Error loading account: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [params]);

  if (loading) {
    return (
      <MainLayout title="Loading..." subtitle="Loading YouTube channel...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading channel...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !account) {
    return (
      <MainLayout title="Error" subtitle="Failed to load YouTube channel">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p className="text-destructive mb-4">{error || "Account not found"}</p>
            <Button asChild variant="outline">
              <Link href="/youtube">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to YouTube
              </Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={account.displayName}
      subtitle={`Channel ID: ${account.externalId}`}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          href="/youtube"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to YouTube
        </Link>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant={account.isActive ? "default" : "secondary"}
            className={account.isActive ? "bg-success/10 text-success border-success/20" : ""}
          >
            {account.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Post</CardTitle>
                  <CardDescription>Upload and publish immediately</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => account && router.push(`/youtube/upload/${account.id}`)}
                className="w-full gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                size="lg"
              >
                <Youtube className="h-4 w-4" />
                Post
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground">{statistics.videosPublished}</p>
                <p className="text-sm text-muted-foreground mt-1">Videos Published</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground">{statistics.scheduled}</p>
                <p className="text-sm text-muted-foreground mt-1">Scheduled</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground">{statistics.thisMonth}</p>
                <p className="text-sm text-muted-foreground mt-1">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Uploaded Videos */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploaded Videos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingVideos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentVideos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No videos uploaded yet</p>
              </div>
            ) : (
          <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Video</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Visibility</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Restrictions</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Views</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Comments</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Likes</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVideos
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((video) => (
                        <tr
                          key={video.id}
                          onClick={() => {
                            if (video.studioUrl) {
                              window.open(video.studioUrl, '_blank');
                            }
                          }}
                          className={cn(
                            "border-b border-border hover:bg-secondary/50 transition-colors",
                            video.studioUrl && 'cursor-pointer'
                          )}
                        >
                        {/* Video Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="relative w-24 h-14 bg-black rounded overflow-hidden flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (video.videoUrl) {
                                  window.open(video.videoUrl, '_blank');
                                }
                              }}
                            >
                              {video.thumbnail ? (
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="w-full h-full object-cover cursor-pointer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-black cursor-pointer">
                                  <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">{video.title}</p>
                              <p className="text-xs text-gray-500 mt-1">Video ID: {video.videoId || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        
                          {/* Visibility Column */}
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                video.privacyStatus === 'public' ? 'default' :
                                video.privacyStatus === 'unlisted' ? 'secondary' : 'outline'
                              }
                              className={
                                video.privacyStatus === 'public' ? 'bg-success/10 text-success border-success/20' :
                                video.privacyStatus === 'unlisted' ? 'bg-warning/10 text-warning border-warning/20' : ''
                              }
                            >
                              {video.privacyStatus === 'public' ? 'Public' : video.privacyStatus === 'unlisted' ? 'Unlisted' : 'Private'}
                            </Badge>
                          </td>
                          
                          {/* Restrictions Column */}
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">None</span>
                          </td>
                          
                          {/* Date Column */}
                          <td className="py-3 px-4">
                            {video.postedAt ? (
                              <div className="text-sm text-foreground">
                                <div>{new Date(video.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(video.postedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          
                          {/* Views Column */}
                          <td className="py-3 px-4">
                            <span className="text-sm text-foreground">
                              {video.views !== null && video.views !== undefined ? video.views.toLocaleString() : '0'}
                            </span>
                          </td>
                          
                          {/* Comments Column */}
                          <td className="py-3 px-4">
                            <span className="text-sm text-foreground">
                              {video.comments !== null && video.comments !== undefined ? video.comments.toLocaleString() : '0'}
                            </span>
                          </td>
                          
                          {/* Likes Column */}
                          <td className="py-3 px-4">
                            <span className="text-sm text-foreground">
                              {video.likes !== null && video.likes !== undefined ? video.likes.toLocaleString() : '0'}
                            </span>
                          </td>
                          
                          {/* Actions Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {video.videoUrl && (
                                <a
                                  href={video.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-destructive hover:text-destructive/80 transition-colors"
                                  title="Watch on YouTube"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                              )}
                              {video.studioUrl && (
                                <a
                                  href={video.studioUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary hover:text-primary/80 transition-colors"
                                  title="Edit in YouTube Studio"
                                >
                                  <Edit className="w-5 h-5" />
                                </a>
                              )}
                            </div>
                          </td>
                      </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {recentVideos.length > pageSize && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, recentVideos.length)} of {recentVideos.length} videos
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {Math.ceil(recentVideos.length / pageSize)}
                      </span>
                      <Button
                        onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(recentVideos.length / pageSize), prev + 1))}
                        disabled={currentPage >= Math.ceil(recentVideos.length / pageSize)}
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}