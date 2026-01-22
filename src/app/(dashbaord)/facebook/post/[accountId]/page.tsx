"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseclient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Facebook, ArrowLeft, Upload, X, Loader2, Check, Calendar, Image as ImageIcon, Video, Globe, Images } from "lucide-react";
import { cn } from "@/lib/utils";

function ImageThumbnail({ imageUrl, fileName }: { imageUrl: string; fileName: string }) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-full h-20 rounded border border-border overflow-hidden bg-secondary">
      {hasError ? (
        <div className="w-full h-full flex items-center justify-center bg-secondary">
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        </div>
      ) : (
        <>
          <img 
            src={imageUrl} 
            alt={fileName}
            className="w-full h-full object-cover"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            loading="lazy"
          />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VideoThumbnail({ videoUrl, fileName }: { videoUrl: string; fileName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      video.currentTime = 1;
      setIsLoaded(true);
    };

    const handleSeeked = () => setIsLoaded(true);
    const handleError = () => setHasError(true);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="relative w-full h-20 rounded border border-border overflow-hidden bg-secondary">
      {hasError ? (
        <div className="w-full h-full flex items-center justify-center bg-secondary">
          <Video className="w-6 h-6 text-muted-foreground" />
        </div>
      ) : (
        <>
          <video 
            ref={videoRef}
            src={videoUrl} 
            muted
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}
      <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
        <span>▶</span>
        <span className="text-[10px]">VIDEO</span>
      </div>
    </div>
  );
}

export default function FacebookPostPage({ params }: any) {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null);
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
  const [recentFiles, setRecentFiles] = useState<Array<{name: string, url: string, type: string, size: number, created: string}>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

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
          loadRecentFiles(id);
        }
      } catch (err: any) {
        setError("Error parsing account ID: " + err.message);
      }
    }
    getAccountId();
  }, [params]);

  async function loadRecentFiles(accId: string) {
    setLoadingFiles(true);
    try {
      const { data: files, error } = await supabase.storage
        .from('Facebook')
        .list(accId, {
          limit: 20,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        console.error('Error loading files:', error);
        return;
      }

      if (files && files.length > 0) {
        const fileList = await Promise.all(
          files.map(async (file) => {
            const filePath = `${accId}/${file.name}`;
            let fileUrl = '';
            
            try {
              const { data: signedData, error: signedError } = await supabase.storage
                .from('Facebook')
                .createSignedUrl(filePath, 3600);
              
              if (!signedError && signedData?.signedUrl) {
                fileUrl = signedData.signedUrl;
              } else {
                const { data: urlData } = supabase.storage
                  .from('Facebook')
                  .getPublicUrl(filePath);
                fileUrl = urlData.publicUrl;
              }
            } catch (urlError) {
              const { data: urlData } = supabase.storage
                .from('Facebook')
                .getPublicUrl(filePath);
              fileUrl = urlData.publicUrl;
            }
            
            const fileName = file.name.toLowerCase();
            const isVideo = fileName.endsWith('.mp4') || 
                           fileName.endsWith('.mov') || 
                           fileName.endsWith('.avi') || 
                           fileName.endsWith('.mkv') ||
                           fileName.endsWith('.webm') ||
                           file.metadata?.mimetype?.startsWith('video/');
            
            return {
              name: file.name,
              url: fileUrl,
              type: isVideo ? 'video' : 'photo',
              size: file.metadata?.size || 0,
              created: file.created_at || file.updated_at || '',
            };
          })
        );
        setRecentFiles(fileList);
      }
    } catch (err: any) {
      console.error('Error loading recent files:', err);
    } finally {
      setLoadingFiles(false);
    }
  }

  function useRecentFile(file: {name: string, url: string, type: string}) {
    // Handle carousel mode - add to carousel files
    if (isCarousel) {
      // Only allow images for carousel
      if (file.type !== 'photo') {
        setError('Carousel posts only support images. Please select image files.');
        return;
      }

      // Check if already added
      if (carouselFiles.some(f => (f as any).recentFileUrl === file.url)) {
        setError('This image is already in the carousel.');
        return;
      }

      // Check limit
      if (carouselFiles.length >= 10) {
        setError('Carousel posts can have maximum 10 images.');
        return;
      }

      // Create fake file object
      const fakeFile = new File([], file.name, { 
        type: 'image/jpeg' 
      });
      (fakeFile as any).isRecentFile = true;
      (fakeFile as any).recentFileUrl = file.url;

      // Add to carousel
      setCarouselFiles([...carouselFiles, fakeFile]);
      setCarouselPreviews([...carouselPreviews, file.url]);
      setMediaType('photo');
      setError('');
      return;
    }

    // Handle single file mode
    const detectedType = file.type === 'video' ? 'video' : 'photo';
    setMediaPreview(file.url);
    setMediaType(detectedType);
    
    const fakeFile = new File([], file.name, { 
      type: detectedType === 'video' ? 'video/mp4' : 'image/jpeg' 
    });
    (fakeFile as any).isRecentFile = true;
    (fakeFile as any).recentFileUrl = file.url;
    setMediaFile(fakeFile);
    setError('');
  }

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Handle carousel mode (multiple files)
    if (isCarousel) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        setError('Carousel posts only support images. Please select image files.');
        e.target.value = '';
        return;
      }

      // Limit to 10 images for carousel (Facebook limit)
      if (imageFiles.length > 10) {
        setError(`Carousel posts can have maximum 10 images. You selected ${imageFiles.length}.`);
        e.target.value = '';
        return;
      }

      // Validate file sizes
      const MAX_SUPABASE_FREE = 50 * 1024 * 1024;
      const MAX_PHOTO_SIZE = 4 * 1024 * 1024;
      const invalidFiles = imageFiles.filter(file => file.size > MAX_SUPABASE_FREE || file.size > MAX_PHOTO_SIZE);
      
      if (invalidFiles.length > 0) {
        setError(`Some files are too large. Maximum: 4MB per image for Facebook, 50MB for Supabase.`);
        e.target.value = '';
        return;
      }

      // Create previews
      const previews: string[] = [];
      imageFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        previews.push(url);
      });

      setCarouselFiles(imageFiles);
      setCarouselPreviews(previews);
      setMediaType('photo');
      setError('');
      e.target.value = '';
      return;
    }

    // Handle single file mode
    const file = files[0];

    const MAX_PHOTO_SIZE = 4 * 1024 * 1024;
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
        setError(`❌ Image too large!\n\nYour image: ${fileSizeMB}MB\nFacebook limit: 4MB\n\n💡 Solution: Compress the image to under 4MB`);
        e.target.value = '';
        setMediaFile(null);
        setMediaPreview("");
        setMediaType(null);
        return;
      }
      setMediaType('photo');
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
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
    // Revoke the blob URL
    if (carouselPreviews[index] && carouselPreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(carouselPreviews[index]);
    }
    
    // Remove from arrays
    const newFiles = carouselFiles.filter((_, i) => i !== index);
    const newPreviews = carouselPreviews.filter((_, i) => i !== index);
    
    setCarouselFiles(newFiles);
    setCarouselPreviews(newPreviews);
    
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
    setPostUrl("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    try {
      // Handle carousel mode
      if (isCarousel && carouselFiles.length > 0) {
        if (carouselFiles.length < 2) {
          setError('Carousel posts require at least 2 images');
          setLoading(false);
          return;
        }

        setUploading(true);
        setError("");

        try {
          const carouselUrls: string[] = [];

          // Process all carousel images
          for (let i = 0; i < carouselFiles.length; i++) {
            const file = carouselFiles[i];
            
            // Check if this is a recent file (already uploaded)
            if ((file as any).isRecentFile && (file as any).recentFileUrl) {
              // Use the existing URL directly - no need to re-upload
              carouselUrls.push((file as any).recentFileUrl);
              console.log(`✅ Using recent file ${i + 1}: ${(file as any).recentFileUrl}`);
            } else if (file.size > 0) {
              // New file - upload to Supabase
              const fileExt = file.name.split('.').pop();
              const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
              const filePath = `${accountId}/${fileName}`;

              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('Facebook')
                .upload(filePath, file, {
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) {
                throw new Error(`Failed to upload image ${i + 1}: ${uploadError.message}`);
              }

              const { data: urlData } = supabase.storage
                .from('Facebook')
                .getPublicUrl(filePath);

              carouselUrls.push(urlData.publicUrl);
            } else {
              throw new Error(`Image ${i + 1} is invalid or empty`);
            }
          }

          // Post carousel to backend
          const postData: any = {
            message: message || undefined,
            scheduledPublishTime: scheduledDateTime || undefined,
            privacy: 'PUBLIC',
            shareToStory: false,
            isCarousel: true,
            carouselUrls: carouselUrls,
            mediaType: 'photo',
          };

          const res = await fetch(`/api/facebook/post/${accountId}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(postData),
          });

          let result;
          try {
            result = await res.json();
          } catch (jsonErr) {
            const text = await res.text();
            throw new Error(`Server error (${res.status}): ${text || 'Unknown error'}`);
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
            const fbPostUrl = `https://www.facebook.com/${result.postId}`;
            setPostUrl(fbPostUrl);
            setSuccessMessage(`Carousel post published successfully! Post ID: ${result.postId}`);
          } else {
            setSuccessMessage('Carousel post published successfully!');
          }

          setSuccess(true);
          
          // Reload recent files after successful post
          if (accountId) {
            loadRecentFiles(accountId);
          }
          
          setTimeout(() => {
            router.push(`/facebook/${accountId}`);
          }, 3000);
        } catch (uploadErr: any) {
          setUploading(false);
          setLoading(false);
          setError(`Carousel upload failed: ${uploadErr.message}`);
          return;
        } finally {
          setUploading(false);
        }
        return;
      }

      // Handle single file mode
      let mediaUrl = "";
      
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
            .from('Facebook')
            .upload(filePath, mediaFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            if (uploadError.message?.includes('size') || uploadError.message?.includes('exceeded') || uploadError.message?.includes('maximum')) {
              throw new Error(`❌ File size exceeds Supabase limit!\n\nYour file: ${(mediaFile.size / (1024 * 1024)).toFixed(2)}MB\nSupabase Free Tier limit: 50MB`);
            }
            throw new Error(`Failed to upload media: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('Facebook')
            .getPublicUrl(filePath);

          mediaUrl = urlData.publicUrl;
          
          if (accountId) {
            loadRecentFiles(accountId);
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
        message: message || undefined,
        scheduledPublishTime: scheduledDateTime || undefined,
        privacy: 'PUBLIC',
        shareToStory: false,
      };

      if (mediaUrl && mediaType) {
        postData.mediaUrl = mediaUrl;
        postData.mediaType = mediaType;
      }

      const res = await fetch(`/api/facebook/post/${accountId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      let result;
      try {
        result = await res.json();
      } catch (jsonErr) {
        const text = await res.text();
        throw new Error(`Server error (${res.status}): ${text || 'Unknown error'}`);
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
        const fbPostUrl = `https://www.facebook.com/${result.postId}`;
        setPostUrl(fbPostUrl);
        setSuccessMessage(`Post published successfully! Post ID: ${result.postId}`);
      } else {
        setSuccessMessage('Post published successfully!');
      }

      setSuccess(true);
      
      // Reload recent files after successful post
      if (accountId) {
        loadRecentFiles(accountId);
      }
      
      setTimeout(() => {
        router.push(`/facebook/${accountId}`);
      }, 3000);
    } catch (err: any) {
      console.error('❌ Facebook post error:', err);
      setError(err.message || "Failed to post to Facebook");
    } finally {
      setLoading(false);
    }
  }

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <MainLayout
      title="Create Facebook Post"
      subtitle="Share content on your Facebook Page"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href={`/facebook/${accountId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Page
        </Link>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive whitespace-pre-line">{error}</p>
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
                      <Facebook className="h-4 w-4" />
                      View Post on Facebook →
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading Overlay */}
        {(loading || uploading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Grey transparent overlay */}
            <div className="absolute inset-0 bg-black/40"></div>
            {/* Center loading card with white text */}
            <Card className="relative max-w-md w-full mx-4 bg-neutral-900 text-white border-neutral-700">
              <CardContent className="pt-6">
                <div className="text-center space-y-6 py-4">
                  <Loader2 className="h-16 w-16 animate-spin text-white mx-auto" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {uploading ? "Uploading media..." : "Posting to Facebook..."}
                    </h3>
                    <p className="text-sm text-neutral-300">
                      {uploading
                        ? "Please wait while we upload your photo or video."
                        : "Please wait while we create your Facebook post."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Media Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Media Upload</CardTitle>
                <CardDescription>Share photos or a video</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* Recent Uploads */}
                {recentFiles.length > 0 && (
                  <div>
                    <Label className="mb-2">
                      Recent Uploads
                      {isCarousel && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Click images to add to carousel)
                        </span>
                      )}
                    </Label>
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-2 bg-secondary/50 rounded-lg">
                      {recentFiles.map((file, idx) => {
                        // Check if file is already in carousel (for carousel mode)
                        const isInCarousel = isCarousel && carouselFiles.some(
                          f => (f as any).recentFileUrl === file.url
                        );
                        const canAddToCarousel = isCarousel && file.type === 'photo' && !isInCarousel && carouselFiles.length < 10;
                        const isDisabled = isCarousel && (file.type !== 'photo' || isInCarousel || carouselFiles.length >= 10);

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (!isDisabled) {
                                useRecentFile(file);
                              }
                            }}
                            className={`relative cursor-pointer group transition-opacity ${
                              isDisabled 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:opacity-80'
                            } ${isInCarousel ? 'ring-2 ring-primary' : ''}`}
                            title={isDisabled 
                              ? isInCarousel 
                                ? 'Already in carousel' 
                                : file.type !== 'photo' 
                                  ? 'Carousel only supports images'
                                  : 'Maximum 10 images'
                              : file.name
                            }
                          >
                            {file.type === 'video' ? (
                              <VideoThumbnail videoUrl={file.url} fileName={file.name} />
                            ) : (
                              <ImageThumbnail imageUrl={file.url} fileName={file.name} />
                            )}
                            <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-opacity flex items-center justify-center ${
                              isInCarousel ? 'bg-primary/20' : ''
                            }`}>
                              <span className="text-white text-xs opacity-0 group-hover:opacity-100">
                                {isInCarousel ? '✓ Added' : 'Use'}
                              </span>
                            </div>
                            {isInCarousel && (
                              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Carousel Preview */}
                {isCarousel && carouselFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Carousel Images ({carouselFiles.length}/10)</Label>
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 bg-secondary/50 rounded-lg">
                      {carouselPreviews.map((preview, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={preview}
                            alt={`Carousel ${idx + 1}`}
                            className="w-full h-24 object-cover rounded border border-border"
                          />
                          <button
                            type="button"
                            onClick={() => removeCarouselImage(idx)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                            {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {!mediaFile && carouselFiles.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="media-upload"
                      accept="image/*,video/*"
                      onChange={handleMediaChange}
                      multiple={isCarousel}
                      className="hidden"
                    />
                    <label
                      htmlFor="media-upload"
                      className="cursor-pointer flex flex-col items-center gap-3 w-full"
                    >
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <div className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors">
                        <Upload className="h-4 w-4" />
                        {isCarousel ? 'Choose Multiple Photos' : 'Choose Photo or Video'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isCarousel ? 'Select up to 10 images for carousel' : 'Max 50MB (Supabase Free Tier)'}
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    {mediaPreview && mediaType === 'photo' ? (
                      <img src={mediaPreview} alt="Preview" className="w-full h-auto rounded-lg border border-border" />
                    ) : mediaPreview && mediaType === 'video' ? (
                      <video src={mediaPreview} controls className="w-full h-auto rounded-lg max-h-96 border border-border" />
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-secondary/50">
                        <p className="text-sm font-medium text-foreground mb-2">
                          {mediaType === 'video' ? '📹 Video Selected' : '📎 File Selected'}
                        </p>
                        {mediaFile && (
                          <>
                            <p className="text-xs text-muted-foreground mb-2">{mediaFile.name}</p>
                            <Badge variant="secondary">
                              Size: {(mediaFile.size / (1024 * 1024)).toFixed(2)}MB
                            </Badge>
                          </>
                        )}
                      </div>
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
              </CardContent>
            </Card>

            {/* Right Side - Post Details */}
            <Card>
              <CardHeader>
                <CardTitle>Post Details</CardTitle>
                <CardDescription>Add text and schedule your post</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Text</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    placeholder="What's on your mind?"
                  />
                </div>

                {/* Scheduling */}
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
                    min={getMinDateTime()}
                  />
                  {scheduledDateTime && (
                    <p className="text-xs text-muted-foreground">
                      Post will be scheduled for: {new Date(scheduledDateTime).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Privacy Settings */}
                <div className="space-y-2">
                  <Label>Privacy Settings</Label>
                  <div className="p-4 bg-secondary/50 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Public</span>
                      </div>
                      <span className="text-xs text-muted-foreground">- Anyone can see your post</span>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <Button
                    type="submit"
                    disabled={loading || uploading || success}
                    className="flex-1 gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
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
                    ) : success ? (
                      <>
                        <Check className="h-4 w-4" />
                        Posted!
                      </>
                    ) : scheduledDateTime ? (
                      <>
                        <Calendar className="h-4 w-4" />
                        Schedule Post
                      </>
                    ) : (
                      <>
                        <Facebook className="h-4 w-4" />
                        Post to Facebook
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/facebook/${accountId}`)}
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
