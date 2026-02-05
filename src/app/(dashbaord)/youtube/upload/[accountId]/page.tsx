"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseclient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function YoutubeUploadPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("private");
  const [madeForKids, setMadeForKids] = useState(false);
  const [category, setCategory] = useState("22");
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("en");
  const [license, setLicense] = useState("youtube");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [ageRestricted, setAgeRestricted] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    visibility: false,
    audience: false,
    details: false,
    language: false,
    comments: false,
    restrictions: false,
    scheduling: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => {
      // If clicking the same section, toggle it
      // If clicking a different section, close all others and open only this one
      const isCurrentlyOpen = prev[section];
      const newState = {
        description: false,
        visibility: false,
        audience: false,
        details: false,
        language: false,
        comments: false,
        restrictions: false,
        scheduling: false,
      };
      // If it was closed, open it. If it was open, close it (accordion behavior)
      newState[section] = !isCurrentlyOpen;
      return newState;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create preview URL
      const url = URL.createObjectURL(selectedFile);
      setVideoPreview(url);
    }
  };

  const handleRemoveFile = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate image file
      if (!selectedFile.type.startsWith('image/')) {
        setStatus("❌ Thumbnail must be an image file");
        return;
      }
      setThumbnail(selectedFile);
      // Create preview URL
      const url = URL.createObjectURL(selectedFile);
      setThumbnailPreview(url);
    }
  };

  const handleRemoveThumbnail = () => {
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnail(null);
    setThumbnailPreview(null);
  };

  async function handleUpload() {
    if (!file || !title) {
      setStatus("❌ Video file and title are required");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("❌ Not authenticated");
      return;
    }

    // Use Next.js API route which proxies to backend with /api/v1 prefix
    // The API route handles large file uploads and proxies to backend
    const uploadUrl = `/api/youtube/upload/${accountId}`;

    const fd = new FormData();
    fd.append("video", file);
    if (thumbnail) {
      fd.append("thumbnail", thumbnail);
    }
    fd.append("title", title);
    fd.append("description", description || "");
    fd.append("privacyStatus", privacy);
    fd.append("categoryId", category || "22");
    fd.append("madeForKids", madeForKids.toString());
    fd.append("tags", tags || "");
    fd.append("language", language || "en");
    fd.append("license", license || "youtube");
    fd.append("commentsEnabled", commentsEnabled.toString());
    fd.append("ageRestricted", ageRestricted.toString());
    if (publishAt) {
      // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO 8601 (RFC3339)
      // YouTube expects format like: 2024-01-01T12:00:00Z
      const date = new Date(publishAt);
      if (!isNaN(date.getTime())) {
        fd.append("publishAt", date.toISOString());
      } else {
        // Fallback: try to append as-is if conversion fails
        fd.append("publishAt", publishAt);
      }
    }
    fd.append("socialAccountId", accountId);

    setUploading(true);
    setStatus("Uploading video to YouTube...");
    setUploadProgress(0);

    // Use XMLHttpRequest for actual upload progress
    try {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        setUploadProgress(100);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Parse response - handle both string and object responses
            let json;
            const responseText = xhr.responseText || '';
            
            if (xhr.response && typeof xhr.response === 'object') {
              // Already parsed
              json = xhr.response;
            } else if (responseText) {
              // Try to parse as JSON
              try {
                json = JSON.parse(responseText);
                // Handle double-encoded JSON (string that contains JSON string)
                if (typeof json === 'string') {
                  json = JSON.parse(json);
                }
              } catch (parseErr) {
                // If parsing fails, try to extract videoId from the string
                const videoIdMatch = responseText.match(/"videoId"\s*:\s*"([^"]+)"/);
                if (videoIdMatch) {
                  json = { videoId: videoIdMatch[1] };
                } else {
                  throw parseErr;
                }
              }
            } else {
              throw new Error('No response received');
            }
            
            console.log('Upload response:', json);
            
            if (json && json.videoId) {
              const videoUrl = `https://www.youtube.com/watch?v=${json.videoId}`;
              // Show success message with video ID and link
              setStatus(`✅ Uploaded successfully! Video ID: ${json.videoId} | Watch: ${videoUrl}`);
              setUploading(false); // Stop uploading state so success shows
              
              // DON'T auto-reset - let user click "Upload Another Video" button
            } else {
              console.error('Invalid response format:', json);
              setStatus(`❌ Upload response missing videoId. Response: ${JSON.stringify(json)}`);
              setUploading(false);
            }
          } catch (err: any) {
            console.error('Parse error:', err, 'Response:', xhr.responseText);
            setStatus(`❌ Upload failed: ${err.message}. Response: ${xhr.responseText?.substring(0, 200) || 'No response'}`);
            setUploading(false);
          }
        } else {
          // Handle error response
          let errorMessage = 'Server error';
          let userFriendlyMessage = '';
          try {
            const errorText = xhr.responseText || xhr.statusText || 'Server error';
            // Try to parse as JSON to extract the message
            try {
              const errorJson = JSON.parse(errorText);
              // Extract message from nested structure
              errorMessage = errorJson.message || 
                            errorJson.error?.message || 
                            errorJson.error?.errors?.[0]?.message ||
                            JSON.stringify(errorJson);
              
              // Add user-friendly explanations for common YouTube errors
              const lowerMessage = errorMessage.toLowerCase();
              if (lowerMessage.includes('exceeded') && lowerMessage.includes('upload')) {
                userFriendlyMessage = 'YouTube Upload Limit Reached\n\n' +
                  'Your YouTube account has reached its daily upload limit. ' +
                  'YouTube typically allows:\n' +
                  '• 6 uploads per day for unverified accounts\n' +
                  '• Higher limits for verified accounts\n\n' +
                  'Please try again tomorrow or verify your YouTube account to increase limits.';
              } else if (lowerMessage.includes('quota') || lowerMessage.includes('limit')) {
                userFriendlyMessage = 'YouTube API Limit Reached\n\n' +
                  'You have reached YouTube\'s API quota limit. Please try again later.';
              } else if (lowerMessage.includes('unauthorized') || lowerMessage.includes('invalid')) {
                userFriendlyMessage = 'Authentication Error\n\n' +
                  'Your YouTube account connection may have expired. Please reconnect your account.';
              } else {
                userFriendlyMessage = errorMessage;
              }
            } catch {
              // If not JSON, use the text as-is (but limit length)
              errorMessage = errorText.substring(0, 300);
              userFriendlyMessage = errorMessage;
            }
          } catch (err) {
            errorMessage = xhr.statusText || 'Unknown error';
            userFriendlyMessage = errorMessage;
          }
          
          console.error('Upload failed:', xhr.status, errorMessage);
          setStatus(`❌ ${userFriendlyMessage}`);
          setUploading(false);
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setStatus("❌ Upload error: Network error");
        setUploading(false);
      });

      xhr.addEventListener('abort', () => {
        setStatus("❌ Upload cancelled");
        setUploading(false);
      });

      // Open and send request
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      // Don't set responseType for FormData - let it auto-detect
      xhr.send(fd);

    } catch (err: any) {
      setStatus("❌ Upload error: " + err.message);
      setUploading(false);
    }
  }

  return (
    <div className="bg-gray-50 relative">
      {/* FULL PAGE UPLOAD OVERLAY */}
      {(uploading || status) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Glass Blurred Background - Pure blur, no color overlay */}
          <div className="absolute inset-0 backdrop-blur-xl"></div>
          
          {/* Upload Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            {/* Close Button - Only show on success */}
            {status && status.includes("✅") && (
              <button
                onClick={() => {
                  router.push(`/youtube/${accountId}`);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close and go to channel"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            {uploading ? (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Uploading Video...
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Please wait while we upload your video to YouTube
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="bg-red-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {uploadProgress}% complete
                  </p>
                  {file && (
                    <p className="text-xs text-gray-500 mt-2">
                      {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>
            ) : status ? (
              <div className="text-center space-y-6">
                {status.includes("✅") ? (
                  <>
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Upload Successful!
                      </h3>
                      {status.includes("Video ID:") && (
                        <div className="space-y-3">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Video ID</p>
                            <p className="text-lg font-mono font-semibold text-gray-900">
                              {status.match(/Video ID: ([A-Za-z0-9_-]+)/)?.[1] || "N/A"}
                            </p>
                          </div>
                          {status.includes("Watch:") && (
                            <a
                              href={status.split("Watch: ")[1]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                              </svg>
                              Watch on YouTube
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Upload Failed
                      </h3>
                      <div className="text-sm text-gray-600 whitespace-pre-line text-left bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {status.replace('❌ ', '')}
                      </div>
                    </div>
                  </>
                )}
                <button
                  onClick={() => {
                    setStatus("");
                    setUploading(false);
                    if (status.includes("✅")) {
                      handleRemoveFile();
                      handleRemoveThumbnail();
                      setTitle("");
                      setDescription("");
                      setPrivacy("private");
                      setMadeForKids(false);
                      setCategory("22");
                      setTags("");
                      setLanguage("en");
                      setLicense("youtube");
                      setCommentsEnabled(true);
                      setAgeRestricted(false);
                      setPublishAt("");
                      setUploadProgress(0);
                      setExpandedSections({
                        description: false,
                        visibility: false,
                        audience: false,
                        details: false,
                        language: false,
                        comments: false,
                        restrictions: false,
                        scheduling: false,
                      });
                    }
                  }}
                  className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  {status.includes("✅") ? "Upload Another Video" : "Close"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/youtube/${accountId}`}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Upload Video
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/youtube/${accountId}`}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={handleUpload}
                disabled={uploading || !file || !title}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {uploading ? "Uploading..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - SPLIT LAYOUT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT SIDE - VIDEO + TITLE + UPLOAD STATUS */}
          <div className="space-y-6">
            {/* VIDEO UPLOAD/PREVIEW AREA */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {videoPreview ? (
                <div className="relative">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full aspect-video bg-black"
                  />
                  <button
                    onClick={handleRemoveFile}
                    className="absolute top-4 right-4 bg-black bg-opacity-70 hover:bg-opacity-90 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Remove
                  </button>
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <div className="text-center p-8">
                    <svg
                      className="mx-auto h-16 w-16 text-gray-400 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a video to upload
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Your video will be private until you publish it.
                    </p>
                    <label
                      htmlFor="video-upload"
                      className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg cursor-pointer transition-colors"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      Select Files
                    </label>
      <input
                      ref={fileInputRef}
                      id="video-upload"
        type="file"
        accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-400 mt-4">
                      MP4, MOV, AVI up to 1GB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* TITLE - BELOW VIDEO */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
      <input
                type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a title that describes your video"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                maxLength={100}
              />
              <p className="mt-1 text-xs text-gray-500">
                {title.length}/100 characters
              </p>
            </div>

          </div>

          {/* RIGHT SIDE - FORM FIELDS */}
          <div className="space-y-4">
            {/* DESCRIPTION - COLLAPSIBLE */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("description")}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">Description</span>
                  {description && (
                    <span className="text-xs text-gray-500">({description.length} chars)</span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedSections.description ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedSections.description && (
                <div className="px-6 pb-6">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell viewers about your video"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition resize-none"
                    maxLength={5000}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {description.length}/5000 characters
                  </p>
                </div>
              )}
            </div>

            {/* VISIBILITY - COLLAPSIBLE */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("visibility")}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  Visibility: <span className="text-gray-600 capitalize">{privacy}</span>
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedSections.visibility ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedSections.visibility && (
                <div className="px-6 pb-6 space-y-3">
      <select
        value={privacy}
        onChange={(e) => setPrivacy(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
      >
        <option value="private">Private</option>
        <option value="unlisted">Unlisted</option>
        <option value="public">Public</option>
      </select>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                        privacy === "private" ? "bg-red-600" : "border-2 border-gray-300"
                      }`}>
                        {privacy === "private" && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Private</p>
                        <p className="text-xs text-gray-500">Only you can watch this video</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                        privacy === "unlisted" ? "bg-red-600" : "border-2 border-gray-300"
                      }`}>
                        {privacy === "unlisted" && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Unlisted</p>
                        <p className="text-xs text-gray-500">Anyone with the link can watch</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                        privacy === "public" ? "bg-red-600" : "border-2 border-gray-300"
                      }`}>
                        {privacy === "public" && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Public</p>
                        <p className="text-xs text-gray-500">Anyone can search for and watch</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AUDIENCE & CONTENT - COLLAPSIBLE */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("audience")}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  Audience & Content
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedSections.audience ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedSections.audience && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Made for Kids
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="madeForKids"
                          checked={!madeForKids}
                          onChange={() => setMadeForKids(false)}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">No, it's not made for kids</p>
                          <p className="text-xs text-gray-500">Content that is not primarily directed to children</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="madeForKids"
                          checked={madeForKids}
                          onChange={() => setMadeForKids(true)}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Yes, it's made for kids</p>
                          <p className="text-xs text-gray-500">Content that is primarily directed to children</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DETAILS - COLLAPSIBLE */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("details")}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  Details
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedSections.details ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedSections.details && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                    >
                      <option value="1">Film & Animation</option>
                      <option value="2">Autos & Vehicles</option>
                      <option value="10">Music</option>
                      <option value="15">Pets & Animals</option>
                      <option value="17">Sports</option>
                      <option value="19">Travel & Events</option>
                      <option value="20">Gaming</option>
                      <option value="22">People & Blogs</option>
                      <option value="23">Comedy</option>
                      <option value="24">Entertainment</option>
                      <option value="25">News & Politics</option>
                      <option value="26">Howto & Style</option>
                      <option value="27">Education</option>
                      <option value="28">Science & Technology</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Enter tags separated by commas"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Separate tags with commas. Tags help viewers find your video.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thumbnail (Optional)
                    </label>
                    {thumbnailPreview ? (
                      <div className="relative">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full max-w-md aspect-video object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveThumbnail}
                          className="absolute top-2 right-2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white px-3 py-1 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          JPG, PNG, GIF up to 2MB. Recommended: 1280x720px
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* LANGUAGE & LICENSE - COLLAPSIBLE */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("language")}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  Language & License
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedSections.language ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedSections.language && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="ru">Russian</option>
                      <option value="ja">Japanese</option>
                      <option value="ko">Korean</option>
                      <option value="zh">Chinese</option>
                      <option value="hi">Hindi</option>
                      <option value="ar">Arabic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License
                    </label>
                    <select
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                    >
                      <option value="youtube">Standard YouTube License</option>
                      <option value="creativeCommon">Creative Commons - Attribution</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {license === "youtube" 
                        ? "Others can reuse your video, but YouTube can show ads on it."
                        : "Others can reuse your work, even commercially, as long as they credit you."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* COMMENTS & COMMUNITY - COLLAPSIBLE */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("comments")}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  Comments & Community
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedSections.comments ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedSections.comments && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={commentsEnabled}
                        onChange={(e) => setCommentsEnabled(e.target.checked)}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Allow comments</p>
                        <p className="text-xs text-gray-500">Viewers can comment on your video</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* RESTRICTIONS - COLLAPSIBLE */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
                type="button"
                onClick={() => toggleSection("restrictions")}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  Restrictions
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedSections.restrictions ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
      </button>
              {expandedSections.restrictions && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ageRestricted}
                        onChange={(e) => setAgeRestricted(e.target.checked)}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Age-restricted content</p>
                        <p className="text-xs text-gray-500">Restrict video to viewers 18 and older</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* SCHEDULING - COLLAPSIBLE */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("scheduling")}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  Scheduling
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedSections.scheduling ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedSections.scheduling && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule Publish Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to publish immediately. Set a future date/time to schedule.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
