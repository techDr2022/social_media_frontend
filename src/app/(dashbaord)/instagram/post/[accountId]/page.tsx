"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseclient";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Instagram, ArrowLeft, Upload, X, Loader2, Check, Calendar, Image as ImageIcon, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export default function InstagramPostPage({ params }: any) {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [postUrl, setPostUrl] = useState("");

  useEffect(() => {
    async function getAccountId() {
      try {
        let id: string;
        if (params && typeof params === 'object' && 'accountId' in params) {
          id = params.accountId;
        } else if (params && typeof params.then === 'function') {
          const resolvedParams = await params;
          id = resolvedParams.accountId;
        } else {
          setError("Invalid account ID");
          return;
        }
        setAccountId(id);
      } catch (err: any) {
        setError("Error parsing account ID: " + err.message);
      }
    }
    getAccountId();
  }, [params]);

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_PHOTO_SIZE = 8 * 1024 * 1024;
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
    const MAX_SUPABASE_FREE = 50 * 1024 * 1024;
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (file.size > MAX_SUPABASE_FREE) {
      setError(`❌ File too large!\n\nYour file: ${fileSizeMB}MB\nSupabase Free Tier limit: 50MB\n\n💡 Solutions:\n1. Compress the file to under 50MB\n2. Upgrade Supabase to Pro plan (up to 500GB)`);
      e.target.value = '';
      setMediaFile(null);
      setMediaPreview("");
      setMediaType(null);
      return;
    }

    if (file.type.startsWith('image/')) {
      if (file.size > MAX_PHOTO_SIZE) {
        setError(`❌ Image too large!\n\nYour image: ${fileSizeMB}MB\nInstagram limit: 8MB\n\n💡 Solution: Compress the image to under 8MB`);
        e.target.value = '';
        setMediaFile(null);
        setMediaPreview("");
        setMediaType(null);
        return;
      }
      setMediaType('photo');
    } else if (file.type.startsWith('video/')) {
      if (file.size > MAX_VIDEO_SIZE) {
        setError(`❌ Video too large!\n\nYour video: ${fileSizeMB}MB\nInstagram limit: 100MB\n\n💡 Solution: Compress the video to under 100MB`);
        e.target.value = '';
        setMediaFile(null);
        setMediaPreview("");
        setMediaType(null);
        return;
      }
      setMediaType('video');
    } else {
      setError("Unsupported file type. Instagram supports images (JPG, PNG) and videos (MP4, MOV).");
      e.target.value = '';
      setMediaFile(null);
      setMediaPreview("");
      setMediaType(null);
      return;
    }

    setMediaFile(file);
    setError('');
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const objectUrl = URL.createObjectURL(file);
      setMediaPreview(objectUrl);
    } else {
      setMediaPreview('');
    }
  }

  function removeMedia() {
    if (mediaPreview && mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview("");
    setMediaType(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    setSuccessMessage("");

    if (!mediaFile || !mediaType) {
      setError("Instagram requires a photo or video. Text-only posts are not supported.");
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
      let mediaUrl = "";
      
      if (mediaFile && mediaFile.size > 0) {
        const MAX_SUPABASE_FREE = 50 * 1024 * 1024;
        if (mediaFile.size > MAX_SUPABASE_FREE) {
          setError(`❌ File too large (${(mediaFile.size / (1024 * 1024)).toFixed(2)}MB). Maximum: 50MB for Supabase Free Tier.`);
          setLoading(false);
          return;
        }

        setUploading(true);
        setError("");
        
        try {
          const fileExt = mediaFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${accountId}/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('Instagram')
            .upload(filePath, mediaFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket') || uploadError.message?.includes('does not exist')) {
              throw new Error(`❌ Instagram Storage Bucket Not Found!\n\nPlease create the "Instagram" bucket in Supabase.`);
            }
            if (uploadError.message?.includes('size') || uploadError.message?.includes('exceeded') || uploadError.message?.includes('maximum')) {
              throw new Error(`❌ File size exceeds Supabase limit!\n\nYour file: ${(mediaFile.size / (1024 * 1024)).toFixed(2)}MB\nSupabase Free Tier limit: 50MB`);
            }
            throw new Error(`Failed to upload media: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('Instagram')
            .getPublicUrl(filePath);

          mediaUrl = urlData.publicUrl;
        } catch (uploadErr: any) {
          setUploading(false);
          setLoading(false);
          setError(`Media upload failed: ${uploadErr.message}`);
          return;
        } finally {
          setUploading(false);
        }
      }

      const postData: any = {
        caption: caption || undefined,
        scheduledPublishTime: scheduledDateTime || undefined,
      };

      if (mediaUrl && mediaType) {
        postData.mediaUrl = mediaUrl;
        postData.mediaType = mediaType;
      }

      const res = await fetch(`/api/instagram/post/${accountId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      let data;
      try {
        const responseText = await res.text();
        if (!responseText || responseText.trim() === '') {
          if (res.ok) {
            // Empty response but status is OK - treat as success
            data = { message: "Post published successfully!" };
          } else {
            setError(`Server returned empty response (${res.status})`);
            setLoading(false);
            return;
          }
        } else {
          try {
            data = JSON.parse(responseText);
          } catch (parseError: any) {
            // Response is not valid JSON - might be HTML error page
            console.error('Failed to parse response as JSON:', parseError);
            console.error('Response text (first 500 chars):', responseText.substring(0, 500));
            
            // Try to extract error message from HTML if it's an error page
            if (responseText.includes('Internal Server Error') || responseText.includes('Error')) {
              setError(`Server error (${res.status}): The backend returned an error page. Check backend logs for details.`);
            } else {
              setError(`Failed to parse server response: ${parseError.message}. Response: ${responseText.substring(0, 200)}`);
            }
            setLoading(false);
            return;
          }
        }
      } catch (textError: any) {
        console.error('Failed to read response:', textError);
        setError(`Failed to read server response: ${textError.message}. Make sure the backend is running.`);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errorMessage = data?.message || data?.error || `Failed to post (${res.status})`;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);
      setSuccessMessage(data.message || "Post published successfully!");
      
      if (data.postUrl) {
        setPostUrl(data.postUrl);
      } else if (data.postId) {
        setPostUrl(`https://www.instagram.com/p/${data.postId}/`);
      }
      
      setCaption("");
      setMediaFile(null);
      setMediaPreview("");
      setMediaType(null);
      setScheduledDateTime("");
    } catch (err: any) {
      console.error("Post error:", err);
      const errorMsg = err.message || err.error || "Failed to post";
      setError(errorMsg);
      setLoading(false);
    }
  }

  return (
    <MainLayout
      title="Create Instagram Post"
      subtitle="Share photos and videos on your Instagram Business or Creator account"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href="/instagram"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Instagram
        </Link>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 text-destructive mt-0.5">❌</div>
                <div className="flex-1">
                  <p className="text-sm text-destructive whitespace-pre-line leading-relaxed">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {success && (
          <Card className="border-success">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success mb-2">{successMessage}</p>
                  {postUrl && (
                    <a 
                      href={postUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Instagram className="h-4 w-4" />
                      View Post on Instagram →
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading/Success Overlay */}
        {(loading || uploading || success) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 backdrop-blur-xl bg-background/80"></div>
            <Card className="relative max-w-md w-full mx-4">
              <CardContent className="pt-6">
                {success && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4"
                    onClick={() => router.push("/instagram")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                {uploading || loading ? (
                  <div className="text-center space-y-6 py-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {uploading ? "Uploading Media..." : "Posting to Instagram..."}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {uploading 
                          ? "Please wait while we upload your media to storage" 
                          : "Please wait while we post your content to Instagram"}
                      </p>
                      {uploading && mediaFile && (
                        <p className="text-xs text-muted-foreground mt-2">
                          File size: {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                ) : success ? (
                  <div className="text-center space-y-6 py-4">
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-8 w-8 text-success" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Post Successful! 🎉
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {successMessage}
                      </p>
                      {postUrl && (
                        <Button
                          asChild
                          className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                        >
                          <a href={postUrl} target="_blank" rel="noopener noreferrer">
                            <Instagram className="h-4 w-4" />
                            View Post on Instagram
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
            <CardDescription>Upload media and add a caption for your Instagram post</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Media Upload */}
              <div className="space-y-2">
                <Label htmlFor="media-upload">
                  Photo or Video <span className="text-destructive">*</span>
                </Label>
                {!mediaPreview ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaChange}
                      className="hidden"
                      id="media-upload"
                      required
                    />
                    <label
                      htmlFor="media-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                      <span className="text-foreground font-medium">Click to upload</span>
                      <span className="text-sm text-muted-foreground mt-1">
                        Photos (JPG, PNG) up to 8MB or Videos (MP4, MOV) up to 100MB
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    {mediaType === 'photo' ? (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full h-64 object-contain rounded-lg border border-border"
                      />
                    ) : (
                      <video
                        src={mediaPreview}
                        controls
                        className="w-full h-64 rounded-lg border border-border"
                      />
                    )}
                    <Button
                      type="button"
                      onClick={removeMedia}
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  placeholder="Write a caption..."
                  maxLength={2200}
                />
                <p className="text-xs text-muted-foreground">
                  {caption.length}/2200 characters
                </p>
              </div>

              {/* Scheduled Publish Time */}
              <div className="space-y-2">
                <Label htmlFor="scheduled">
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Schedule Post (Optional)
                </Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Instagram allows scheduling up to 25 hours in advance
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={loading || uploading || !mediaFile}
                  className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : scheduledDateTime ? (
                    <>
                      <Calendar className="h-4 w-4" />
                      Schedule Post
                    </>
                  ) : (
                    <>
                      <Instagram className="h-4 w-4" />
                      Post Now
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/instagram")}
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
