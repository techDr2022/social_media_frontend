/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rewrites only work in development (localhost)
  // In production, we use Next.js API routes that proxy to backend
  async rewrites() {
    // Only use rewrite in development (when NEXT_PUBLIC_API_URL is not set or is localhost)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    const isLocalhost = !apiUrl || apiUrl.includes('localhost');
    
    if (isLocalhost) {
      return [
        {
          // Rewrite /api/* to backend /api/v1/* (backend uses /api/v1 prefix)
          source: "/api/:path*",
          destination: "http://localhost:3000/api/v1/:path*",
        },
      ];
    }
    // In production, return empty array - API routes will handle it
    return [];
  },
};

export default nextConfig;
