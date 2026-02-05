"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, ArrowLeft, Plus, Calendar, Loader2, Image as ImageIcon, Video, X, ChevronLeft, ChevronRight, ExternalLink, Trash2, Check, AlertCircle } from "lucide-react";

type InstagramAccount = {
  id: string;
  displayName: string;
  username?: string;
  externalId: string;
  platform: string;
  isActive: boolean;
  createdAt: string;
};

export default function InstagramAccountPage({ params }: any) {
  const router = useRouter();
  const [account, setAccount] = useState<InstagramAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [posts, setPosts] = useState<Array<any>>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setError("");

      let id: string;
      try {
        if (params && typeof params === 'object' && 'accountId' in params) {
          id = params.accountId;
        } else if (params && typeof params.then === 'function') {
          const resolvedParams = await params;
          id = resolvedParams.accountId;
        } else {
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
        const instagramAccounts = json.filter(
          (a: any) => a.platform?.toLowerCase() === "instagram"
        );
        
        const foundAccount = instagramAccounts.find(
          (a: any) => String(a.id).trim() === String(id).trim()
        );

        if (!foundAccount) {
          setError(`Account not found. Looking for: ${id}`);
          setLoading(false);
          return;
        }

        setAccount(foundAccount);
        
        // Load posts after account is loaded
        if (id) {
          loadPosts(id);
        }
      } catch (err: any) {
        setError("Error loading account: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [params]);

  // Load all Instagram posts/uploads for this account
  async function loadPosts(accId: string) {
    setLoadingPosts(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        console.error('No auth token');
        return;
      }

      const res = await fetch(`/api/instagram/posts/${accId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Error loading posts:', errorData);
        return;
      }

      const postsData = await res.json();
      setPosts(postsData || []);
      console.log('✅ Loaded posts:', postsData.length);
    } catch (err: any) {
      console.error('Error loading posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }

  // Delete a post
  async function deletePost(postId: string) {
    if (!accountId) return;
    
    if (!confirm('Are you sure you want to delete this post? This will remove it from your history. Note: Instagram does not allow deleting published posts via API, so you may need to delete it manually from Instagram.')) {
      return;
    }

    setDeletingPostId(postId);
    setToast(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setToast({ message: 'No auth token', type: 'error' });
        setDeletingPostId(null);
        return;
      }

      const res = await fetch(`/api/instagram/posts/${accountId}/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        let errorMessage = 'Failed to delete post';
        try {
          const errorData = await res.json();
          errorMessage = errorData?.error || errorData?.message || errorMessage;
        } catch {
          errorMessage = `Failed to delete post (${res.status})`;
        }
        
        setToast({ message: errorMessage, type: 'error' });
        setDeletingPostId(null);
        return;
      }

      const result = await res.json();
      console.log('✅ Post deleted:', result);
      
      // Show success toast with appropriate message
      const toastMessage = result.message || (result.igDeleted 
        ? 'Post deleted from Instagram and removed from your history' 
        : 'Post removed from your history. Note: Instagram does not allow deleting published posts via API.');
      
      setToast({ 
        message: toastMessage, 
        type: 'success' 
      });
      
      // Reload posts list
      await loadPosts(accountId);
      
      // Auto-hide toast after 5 seconds (longer for informational message)
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      console.error('Error deleting post:', err);
      const errorMessage = err.message || 'Failed to delete post';
      setToast({ message: errorMessage, type: 'error' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setDeletingPostId(null);
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(posts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const currentPosts = posts.slice(startIndex, endIndex);

  if (loading) {
    return (
      <MainLayout title="Loading..." subtitle="Loading Instagram account...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading account...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !account) {
    return (
      <MainLayout title="Error" subtitle="Failed to load Instagram account">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p className="text-destructive mb-4">{error || "Account not found"}</p>
            <Button asChild variant="outline">
              <Link href="/instagram">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Instagram
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
      subtitle={account.username ? `@${account.username}` : `Account ID: ${account.externalId}`}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-5">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success'
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-current opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Back Button */}
        <Link
          href="/instagram"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Instagram
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle>Post</CardTitle>
                  <CardDescription>Create and publish immediately</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push(`/instagram/post/${account.id}`)}
                className="w-full gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                size="lg"
              >
                <Instagram className="h-4 w-4" />
                Post
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Posts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Your posted and scheduled content</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading posts...</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No posts yet. Create your first post above!</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Thumbnail</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Link / Error</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Posted At</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPosts.map((post) => {
                        const hasError = post.status === 'failed' && post.errorMessage;
                        const postUrl = post.permalink || (post.externalPostId ? `https://www.instagram.com/p/${post.externalPostId}/` : null);
                        
                        return (
                          <tr key={post.id} className="border-b hover:bg-secondary/50 transition-colors">
                            {/* Thumbnail Column */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-20 h-14 bg-secondary rounded overflow-hidden flex-shrink-0">
                                  {post.mediaUrl ? (
                                    post.type === 'video' ? (
                                      <div className="w-full h-full bg-black flex items-center justify-center">
                                        <Video className="h-6 w-6 text-white" />
                                      </div>
                                    ) : (
                                      <img
                                        src={post.mediaUrl}
                                        alt="Post media"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full bg-secondary flex items-center justify-center"><svg class="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                        }}
                                      />
                                    )
                                  ) : (
                                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                                      <Instagram className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                  {/* Type Badge */}
                                  {post.type && (
                                    <div className="absolute top-1 left-1">
                                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-background/90">
                                        {post.type === 'photo' ? (
                                          <ImageIcon className="h-3 w-3 mr-1" />
                                        ) : post.type === 'video' ? (
                                          <Video className="h-3 w-3 mr-1" />
                                        ) : null}
                                        {post.type}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            {/* Link / Error Column */}
                            {hasError ? (
                              <td colSpan={4} className="py-3 px-4">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-destructive mb-1">Error</div>
                                    <div className="text-xs text-destructive/80">{post.errorMessage}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'Unknown time'}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deletePost(post.id)}
                                    disabled={deletingPostId === post.id}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    {deletingPostId === post.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <X className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            ) : (
                              <>
                                <td className="py-3 px-4">
                                  {postUrl ? (
                                    <a
                                      href={postUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      View on Instagram
                                    </a>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">—</span>
                                  )}
                                </td>
                                
                                {/* Posted At Column */}
                                <td className="py-3 px-4">
                                  {post.scheduledAt || post.postedAt ? (
                                    <div className="text-sm text-foreground">
                                      <div>{(post.postedAt || post.scheduledAt) ? new Date(post.postedAt || post.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {(post.postedAt || post.scheduledAt) ? new Date(post.postedAt || post.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">—</span>
                                  )}
                                </td>
                                
                                {/* Status Column */}
                                <td className="py-3 px-4">
                                  <Badge
                                    variant={
                                      post.status === 'success'
                                        ? 'default'
                                        : post.status === 'scheduled'
                                        ? 'secondary'
                                        : 'destructive'
                                    }
                                    className={
                                      post.status === 'success'
                                        ? 'bg-success/10 text-success border-success/20'
                                        : post.status === 'scheduled'
                                        ? 'bg-warning/10 text-warning border-warning/20'
                                        : ''
                                    }
                                  >
                                    {post.status === 'success'
                                      ? 'Posted'
                                      : post.status === 'scheduled'
                                      ? 'Scheduled'
                                      : post.status === 'failed'
                                      ? 'Failed'
                                      : post.status}
                                  </Badge>
                                </td>
                                
                                {/* Delete Button Column */}
                                <td className="py-3 px-4">
                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deletePost(post.id)}
                                      disabled={deletingPostId === post.id}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      {deletingPostId === post.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, posts.length)} of {posts.length} posts
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
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

