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
import { Checkbox } from "@/components/ui/checkbox";
import { Instagram, ArrowLeft, Upload, X, Loader2, Check, Calendar, Image as ImageIcon, Video, Images } from "lucide-react";
import { cn } from "@/lib/utils";

export default function InstagramPostPage({ params }: any) {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'carousel' | null>(null);
  const [isCarousel, setIsCarousel] = useState(false);
  const [carouselFiles, setCarouselFiles] = useState<File[]>([]);
  const [carouselPreviews, setCarouselPreviews] = useState<string[]>([]);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [recentFiles, setRecentFiles] = useState<Array<{name: string, url: string, type: 'photo' | 'video', size: number, created: string, status: 'processing' | 'ready', progress?: string}>>([]);
  const [processingVideos, setProcessingVideos] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [recentPage, setRecentPage] = useState(0);
  const [hasMoreRecent, setHasMoreRecent] = useState(true);
  const [showRecentDialog, setShowRecentDialog] = useState(false);

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
        if (id) {
          // Load first page of recent files
          loadRecentFiles(id, false, 0);
        }
      } catch (err: any) {
        setError("Error parsing account ID: " + err.message);
      }
    }
    getAccountId();
  }, [params]);

  async function loadRecentFiles(accId: string, append: boolean = false, page: number = 0) {
    setLoadingFiles(true);
    const PAGE_SIZE = 20;
    try {
      const { data: files, error } = await supabase.storage
        .from('Instagram')
        .list(accId, {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        console.error('Error loading Instagram recent files:', error);
        return;
      }

      if (files && files.length > 0) {
        const fileList = await Promise.all(
          files.map(async (file) => {
            const filePath = `${accId}/${file.name}`;
            let fileUrl = '';

            try {
              const { data: signedData, error: signedError } = await supabase.storage
                .from('Instagram')
                .createSignedUrl(filePath, 3600);

              if (!signedError && signedData?.signedUrl) {
                fileUrl = signedData.signedUrl;
              } else {
                const { data: urlData } = supabase.storage
                  .from('Instagram')
                  .getPublicUrl(filePath);
                fileUrl = urlData.publicUrl;
              }
            } catch {
              const { data: urlData } = supabase.storage
                .from('Instagram')
                .getPublicUrl(filePath);
              fileUrl = urlData.publicUrl;
            }

            const fileName = file.name.toLowerCase();
            const isVideo =
              fileName.endsWith('.mp4') ||
              fileName.endsWith('.mov') ||
              fileName.endsWith('.avi') ||
              fileName.endsWith('.mkv') ||
              fileName.endsWith('.webm') ||
              file.metadata?.mimetype?.startsWith('video/');

            // Check if video is recently uploaded (within last 5 minutes) and might still be processing
            const createdDate = new Date(file.created_at || file.updated_at || '');
            const now = new Date();
            const minutesSinceCreated = (now.getTime() - createdDate.getTime()) / (1000 * 60);
            const isProcessing = isVideo && minutesSinceCreated < 5;

            return {
              name: file.name,
              url: fileUrl,
              type: isVideo ? 'video' as const : 'photo' as const,
              size: file.metadata?.size || 0,
              created: file.created_at || file.updated_at || '',
              status: (isProcessing ? 'processing' : 'ready') as 'processing' | 'ready',
              progress: undefined,
            };
          })
        );
        setRecentFiles(prev =>
          append ? [...prev, ...fileList] : fileList
        );

        // If we got less than PAGE_SIZE, no more pages
        if (files.length < PAGE_SIZE) {
          setHasMoreRecent(false);
        } else {
          setHasMoreRecent(true);
          setRecentPage(page);
        }
      } else {
        if (!append) {
          setRecentFiles([]);
        }
        setHasMoreRecent(false);
      }
    } catch (err: any) {
      console.error('Error loading Instagram recent files:', err);
    } finally {
      setLoadingFiles(false);
    }
  }

  function useRecentFile(file: {name: string; url: string; type: 'photo' | 'video'; status?: 'processing' | 'ready'; progress?: string}) {
    // Handle carousel mode - add to carousel files
    if (isCarousel) {
      // Allow both photos and videos for carousel
      // Check if already added
      if (carouselFiles.some(f => (f as any).recentFileUrl === file.url)) {
        setError('This file is already in the carousel.');
        return;
      }

      // Check limit
      if (carouselFiles.length >= 10) {
        setError('Carousel posts can have maximum 10 items.');
        return;
      }

      // Create fake file object
      const fakeFile = new File([], file.name, { 
        type: file.type === 'video' ? 'video/mp4' : 'image/jpeg' 
      });
      (fakeFile as any).isRecentFile = true;
      (fakeFile as any).recentFileUrl = file.url;

      // Add to carousel
      setCarouselFiles([...carouselFiles, fakeFile]);
      setCarouselPreviews([...carouselPreviews, file.url]);
      setMediaType('carousel');
      setError('');
      setShowRecentDialog(false);
      return;
    }

    // Handle single file mode
    setMediaPreview(file.url);
    setMediaType(file.type);

    // Create a lightweight File object to keep the same shape as uploads
    const fakeFile = new File([], file.name, {
      type: file.type === 'video' ? 'video/mp4' : 'image/jpeg',
    });
    (fakeFile as any).isRecentFile = true;
    (fakeFile as any).recentFileUrl = file.url;

    setMediaFile(fakeFile);
    setError('');
    setShowRecentDialog(false);
  }

  function handleRecentScroll(e: React.UIEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 24;

    if (nearBottom && !loadingFiles && hasMoreRecent && accountId) {
      // Load next page
      const nextPage = recentPage + 1;
      loadRecentFiles(accountId, true, nextPage);
    }
  }

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Handle carousel mode (multiple files)
    if (isCarousel) {
      const mediaFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/') || file.type.startsWith('video/')
      );
      
      if (mediaFiles.length === 0) {
        setError('Carousel posts support images and videos. Please select valid media files.');
        e.target.value = '';
        return;
      }

      // Limit to 10 items for carousel (Instagram limit)
      if (mediaFiles.length > 10) {
        setError(`Carousel posts can have maximum 10 items. You selected ${mediaFiles.length}.`);
        e.target.value = '';
        return;
      }

      // Validate file sizes
      const MAX_SUPABASE_FREE = 50 * 1024 * 1024;
      const MAX_PHOTO_SIZE = 8 * 1024 * 1024;
      const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
      
      const invalidFiles = mediaFiles.filter(file => {
        if (file.type.startsWith('image/')) {
          return file.size > MAX_SUPABASE_FREE || file.size > MAX_PHOTO_SIZE;
        } else if (file.type.startsWith('video/')) {
          return file.size > MAX_SUPABASE_FREE || file.size > MAX_VIDEO_SIZE;
        }
        return true; // Invalid type
      });
      
      if (invalidFiles.length > 0) {
        setError(`Some files are too large. Maximum: 8MB per image, 100MB per video for Instagram, 50MB for Supabase.`);
        e.target.value = '';
        return;
      }

      // Create previews
      const previews: string[] = [];
      mediaFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        previews.push(url);
      });

      setCarouselFiles(mediaFiles);
      setCarouselPreviews(previews);
      setMediaType('carousel');
      setError('');
      e.target.value = '';
      return;
    }

    // Handle single file mode
    const file = files[0];

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

  function removeCarouselImage(index: number) {
    const newFiles = carouselFiles.filter((_, i) => i !== index);
    const newPreviews = carouselPreviews.filter((_, i) => i !== index);
    
    // Clean up blob URLs
    if (carouselPreviews[index] && carouselPreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(carouselPreviews[index]);
    }
    
    setCarouselFiles(newFiles);
    setCarouselPreviews(newPreviews);
    
    // If no images left, reset media type
    if (newFiles.length === 0) {
      setMediaType(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    setSuccessMessage("");

    // Validate media for carousel or single file
    if (isCarousel) {
      if (carouselFiles.length === 0) {
        setError("Please select at least one image for the carousel post.");
        setLoading(false);
        return;
      }
      if (carouselFiles.length < 2) {
        setError("Carousel posts require at least 2 images.");
        setLoading(false);
        return;
      }
    } else {
      if (!mediaFile || !mediaType) {
        setError("Instagram requires a photo or video. Text-only posts are not supported.");
        setLoading(false);
        return;
      }
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
      
      // Check for carousel mode with no files
      if (isCarousel && carouselFiles.length === 0) {
        console.log('❌ Carousel mode but no files selected');
        setError('Please select at least one image or video for your carousel post.');
        setLoading(false);
        return;
      }
      
      console.log('🔍 Post submission - isCarousel:', isCarousel, 'carouselFiles:', carouselFiles.length, 'mediaType:', mediaType);
      
      // Handle carousel mode
      if (isCarousel && carouselFiles.length > 0) {
        console.log('🎠 Starting carousel upload, files:', carouselFiles.length);
        setUploading(true);
        setError("");

        try {
          const carouselItems: Array<{url: string; type: 'photo' | 'video'}> = [];
          console.log('🎠 Processing carousel items, starting with carouselItems:', carouselItems);
          
          // Initialize processing tracking
          const totalItems = carouselFiles.length;
          let processedItems = 0;
          const totalVideos = carouselFiles.filter(f => f.type?.startsWith('video/') || f.name?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/)).length;
          let processedVideos = 0;
          
          // Process all carousel items (photos and videos)
          for (let i = 0; i < carouselFiles.length; i++) {
            const file = carouselFiles[i];
            
            setUploadProgress(`Processing carousel items...`);
            console.log(`📤 Processing carousel item ${i + 1}/${totalItems}: ${file.name}`);
            
            // Determine media type
            const fileName = file.name.toLowerCase();
            const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.mov') || 
                           fileName.endsWith('.avi') || fileName.endsWith('.mkv') || 
                           fileName.endsWith('.webm') || file.type?.startsWith('video/');
            const mediaType = isVideo ? 'video' : 'photo';
            
            // Check if this is a recent file (already uploaded)
            if ((file as any).isRecentFile && (file as any).recentFileUrl) {
              // Use the existing URL directly - no need to re-upload
              carouselItems.push({ url: (file as any).recentFileUrl, type: mediaType });
              console.log(`✅ Using recent ${mediaType} ${i + 1}: ${(file as any).recentFileUrl}`);
            } else if (file.size > 0) {
              // New file - upload to Supabase
              const fileExt = file.name.split('.').pop();
              const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
              const filePath = `${accountId}/${fileName}`;

              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('Instagram')
                .upload(filePath, file, {
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) {
                throw new Error(`Failed to upload image ${i + 1}: ${uploadError.message}`);
              }

              const { data: urlData } = supabase.storage
                .from('Instagram')
                .getPublicUrl(filePath);

              if (!urlData.publicUrl) {
                throw new Error(`${mediaType} ${i + 1} is invalid or empty`);
              }

              carouselItems.push({ url: urlData.publicUrl, type: mediaType });
              
              // Update progress
              processedItems++;
              
              // Update the preview with the uploaded URL
              setCarouselPreviews(prev => {
                const newPreviews = [...prev];
                newPreviews[i] = urlData.publicUrl;
                return newPreviews;
              });
              
              // Update progress for videos
              if (mediaType === 'video') {
                processedVideos++;
                const progress = `Processing (${processedVideos}/${totalVideos})`;
                
                // Mark this video as processing in recent files
                setRecentFiles(prev => 
                  prev.map(file => 
                    file.url === urlData.publicUrl ? { ...file, status: 'processing' as const, progress } : file
                  )
                );
              }
              
              // Update recent files list so uploaded videos show as processing
              if (accountId) {
                loadRecentFiles(accountId, false, 0);
              }
            } else {
              throw new Error(`${mediaType} ${i + 1} is invalid or empty`);
            }
          }

          console.log('🎠 Finished processing carousel items, carouselItems:', carouselItems);

          // Post carousel to backend
          console.log('📤 Sending carousel data:', {
            carouselItemsCount: carouselItems.length,
            carouselItems: carouselItems,
            carouselItemsType: typeof carouselItems,
            mediaType: 'carousel'
          });
          const postData: any = {
            caption: caption || undefined,
            scheduledPublishTime: scheduledDateTime || undefined,
            carouselItems: carouselItems,
            mediaType: 'carousel',
          };

          console.log('📤 Final postData being sent:', JSON.stringify(postData, null, 2));

          const res = await fetch(`/api/instagram/post/${accountId}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(postData),
          });

          let result;
          const responseText = await res.text();
          try {
            result = JSON.parse(responseText);
          } catch (jsonErr) {
            if (!res.ok) {
              throw new Error(`Server error (${res.status}): ${responseText || 'Unknown error'}`);
            }
            result = { message: responseText };
          }

          // Handle timeout case (202 status)
          if (res.status === 202 && result.timeout) {
            console.log('⏳ Request timed out but processing continues in background');
            setSuccessMessage(result.message || 'Post is being processed in the background. Check your posts in a few minutes.');
            setSuccess(true);
            
            // Reload recent files to show processing status
            if (accountId) {
              loadRecentFiles(accountId, false, 0);
            }
            
            setTimeout(() => {
              router.push(`/instagram/${accountId}`);
            }, 5000); // Shorter timeout since processing continues
            setLoading(false);
            return;
          }

          if (!res.ok) {
            let errorMsg = result?.error;
            if (typeof errorMsg === 'object' && errorMsg !== null) {
              errorMsg = errorMsg.message || errorMsg.error || JSON.stringify(errorMsg);
            }
            if (!errorMsg || typeof errorMsg !== 'string') {
              errorMsg = result?.message || `Failed to post (${res.status})`;
            }
            throw new Error(errorMsg);
          }

          if (result.postId) {
            const igPostUrl = result.postUrl || `https://www.instagram.com/p/${result.postId}/`;
            setPostUrl(igPostUrl);
            setSuccessMessage(`Carousel post published successfully! Post ID: ${result.postId}`);
          } else {
            setSuccessMessage('Carousel post published successfully!');
          }

          setSuccess(true);
          
          // Reload recent files after successful post
          if (accountId) {
            loadRecentFiles(accountId, false, 0);
          }
          
          setTimeout(() => {
            router.push(`/instagram/${accountId}`);
          }, 3000);
        } catch (uploadErr: any) {
          console.error('❌ Instagram carousel upload error:', uploadErr);
          setError(uploadErr.message || "Failed to upload carousel images");
        } finally {
          setUploading(false);
        }
        setLoading(false);
        return;
      }
      
      // If user selected from recent files, we already have a public URL – no need to upload again
      if (mediaFile && (mediaFile as any).isRecentFile && (mediaFile as any).recentFileUrl) {
        mediaUrl = (mediaFile as any).recentFileUrl;
      } else if (mediaFile && mediaFile.size > 0) {
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

          // Reload recent files list after a successful new upload
          if (accountId) {
            // Reload from first page to include the new upload
            loadRecentFiles(accountId, false, 0);
          }
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

      // Only set media data if we have actual media (not carousel without files)
      if (mediaUrl && mediaType && mediaType !== 'carousel') {
        console.log('📤 Sending regular post data:', { mediaUrl: 'set', mediaType });
        postData.mediaUrl = mediaUrl;
        postData.mediaType = mediaType;
      } else {
        console.log('📤 Sending post data without media:', { mediaType, hasMediaUrl: !!mediaUrl });
      }

      const res = await fetch(`/api/instagram/post/${accountId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      // Our /api/instagram/post route always returns JSON (success or error),
      // so we can safely read it as JSON here.
      let data: any;
      try {
        data = await res.json();
      } catch (jsonError: any) {
        // If this ever happens, just surface a simple error instead of throwing a JSON parse error
        console.error("Failed to parse /api/instagram/post response as JSON:", jsonError);
        setError(`Failed to read server response (${res.status}). Please try again.`);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errorMessage = data?.error || data?.message || `Failed to post (${res.status})`;
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
          href={accountId ? `/instagram/${accountId}` : "/instagram"}
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
                    onClick={() => {
                      if (accountId) {
                        router.push(`/instagram/${accountId}`);
                      } else {
                        router.push("/instagram");
                      }
                    }}
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
                          ? uploadProgress || "Please wait while we upload your media to storage" 
                          : "Please wait while we post your content to Instagram"}
                      </p>
                      {uploading && mediaFile && (
                        <p className="text-xs text-muted-foreground mt-2">
                          File size: {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      )}
                      {uploading && isCarousel && carouselFiles.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Processing {carouselFiles.length} carousel item{carouselFiles.length !== 1 ? 's' : ''}
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
              {/* Carousel Option */}
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
                <Checkbox
                  id="carousel-option"
                  checked={isCarousel}
                  onCheckedChange={(checked) => {
                    setIsCarousel(checked as boolean);
                    if (!checked) {
                      // Clear carousel files when unchecked
                      setCarouselFiles([]);
                      setCarouselPreviews([]);
                      carouselPreviews.forEach(url => {
                        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                      });
                    } else {
                      // Clear single file when enabling carousel
                      setMediaFile(null);
                      setMediaPreview("");
                      setMediaType(null);
                    }
                  }}
                />
                <label htmlFor="carousel-option" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Images className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Create carousel post</span>
                  <span className="text-xs text-muted-foreground">(Multiple images)</span>
                </label>
              </div>

              {/* Media Upload */}
              <div className="space-y-3">
                <Label htmlFor="media-upload">
                  {isCarousel ? 'Photos for Carousel' : 'Photo or Video'} <span className="text-destructive">*</span>
                </Label>

                {/* Source buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => document.getElementById("media-upload")?.click()}
                    disabled={uploading || loading}
                  >
                    <Upload className="w-4 h-4" />
                    From computer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowRecentDialog(true)}
                    disabled={loadingFiles || recentFiles.length === 0}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Select from recent
                    {loadingFiles && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Photos (JPG, PNG) up to 8MB or Videos (MP4, MOV) up to 100MB
                  </span>
                </div>

                {/* Hidden file input */}
                <input
                  type="file"
                  accept={isCarousel ? "image/*,video/*" : "image/*,video/*"}
                  onChange={handleMediaChange}
                  className="hidden"
                  id="media-upload"
                  multiple={isCarousel}
                  required={!mediaFile && !isCarousel}
                />

                {/* Preview */}
                {!mediaPreview && carouselFiles.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                    {isCarousel 
                      ? "No images selected yet. Choose multiple images from your computer or select from recent uploads."
                      : "No media selected yet. Choose a file from your computer or select from recent uploads."
                    }
                  </div>
                ) : carouselFiles.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {carouselPreviews.map((preview, index) => {
                        const file = carouselFiles[index];
                        const isVideo = file?.type?.startsWith('video/') || file?.name?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);
                        const mediaType = isVideo ? 'video' : 'image';
                        
                        return (
                          <div key={index} className="relative group">
                            {isVideo ? (
                              <video
                                src={preview}
                                className="w-full h-24 object-cover rounded-lg border border-border"
                                muted
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={preview}
                                alt={`Carousel ${mediaType} ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-border"
                              />
                            )}
                            <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1 rounded flex items-center gap-1">
                              {isVideo && <Video className="h-3 w-3" />}
                              {index + 1}
                            </div>
                            <Button
                              type="button"
                              onClick={() => removeCarouselImage(index)}
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {carouselFiles.length} image{carouselFiles.length !== 1 ? 's' : ''} selected for carousel
                    </p>
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
                  You can schedule for any future date (e.g. days or weeks). Within 25 hours we use Instagram&apos;s scheduler; after that we publish automatically at the chosen time.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={loading || uploading || (!mediaFile && carouselFiles.length === 0)}
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
                      Post
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

      {/* Recent files dialog */}
      {showRecentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowRecentDialog(false)}
          />
          <Card className="relative max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-black">
                  {isCarousel ? 'Select Media for Carousel' : 'Select Recent Upload'}
                </CardTitle>
                <CardDescription className="text-gray-800">
                  {isCarousel 
                    ? `Pick previously uploaded photos and videos for your carousel post. ${carouselFiles.length}/10 selected.`
                    : 'Pick a previously uploaded photo or video from your Instagram storage.'
                  }
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowRecentDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-800">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading recent files...
                </div>
              ) : recentFiles.length === 0 ? (
                <div className="py-8 text-sm text-gray-800 text-center">
                  No recent uploads found for this Instagram account.
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto pr-1 max-h-[60vh]"
                  onScroll={handleRecentScroll}
                >
                  {recentFiles.map((file, idx) => {
                    // Check if file is already in carousel (for carousel mode)
                    const isInCarousel = isCarousel && carouselFiles.some(
                      f => (f as any).recentFileUrl === file.url
                    );
                    const canAddToCarousel = isCarousel && !isInCarousel && carouselFiles.length < 10;
                    const isDisabled = isCarousel && (isInCarousel || carouselFiles.length >= 10);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!isDisabled) {
                            useRecentFile(file);
                          }
                        }}
                        disabled={isDisabled}
                        className={`relative group rounded-lg overflow-hidden border border-border bg-white hover:bg-gray-50 transition-colors text-left ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        } ${isInCarousel ? 'ring-2 ring-primary' : ''}`}
                        title={
                          isDisabled
                            ? isInCarousel
                              ? 'Already in carousel'
                              : 'Maximum 10 media items'
                            : file.name
                        }
                      >
                        <div className="aspect-video w-full overflow-hidden bg-gray-100 flex items-center justify-center">
                          {file.type === 'video' ? (
                            <Video className="w-8 h-8 text-gray-800" />
                          ) : (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="p-2 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium truncate max-w-[80%] text-black">
                              {file.name}
                            </span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 text-black border-gray-300 ${
                              file.status === 'processing' ? 'bg-yellow-100 border-yellow-300' : ''
                            }`}>
                              {file.status === 'processing' ? (file.progress || 'Processing') : file.type === 'video' ? 'Video' : 'Photo'}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-gray-800 truncate">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors ${
                          isInCarousel ? 'bg-primary/20' : ''
                        }`}>
                          <span className="text-xs text-white opacity-0 group-hover:opacity-100">
                            {isInCarousel ? '✓ Added' : 'Use this file'}
                          </span>
                        </div>
                        {isInCarousel && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
