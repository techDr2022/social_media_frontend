import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Social Media Manager - Manage All Your Social Accounts",
  description: "Connect, schedule, and publish content across YouTube, Instagram, Facebook, and more. One dashboard for all your social media management needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Critical: Fix malformed Supabase redirects BEFORE React loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                console.log('[URLFixScript] Script loaded, checking URL...');
                try {
                  var currentUrl = window.location.href;
                  var search = window.location.search;
                  var pathname = window.location.pathname;
                  
                  console.log('[URLFixScript] Current URL:', {
                    href: currentUrl,
                    search: search,
                    pathname: pathname,
                    hasProtocol: currentUrl.startsWith('http://') || currentUrl.startsWith('https://')
                  });
                  
                  // Check if URL is malformed (missing protocol but has code parameter)
                  if (search.includes('code=')) {
                    if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
                      console.error('[URLFixScript] ⚠️ CRITICAL: Malformed URL detected (missing protocol)!', currentUrl);
                      var codeMatch = search.match(/code=([^&]+)/);
                      if (codeMatch) {
                        var code = codeMatch[1];
                        var fixedUrl = 'http://localhost:3001/auth/callback?code=' + encodeURIComponent(code);
                        console.log('[URLFixScript] Fixing malformed URL, redirecting to:', fixedUrl);
                        window.location.replace(fixedUrl);
                        return;
                      }
                    }
                    
                    // Also check if on root with code but should be on callback
                    if (pathname === '/' && !search.includes('state=')) {
                      var codeMatch = search.match(/code=([^&]+)/);
                      if (codeMatch) {
                        var code = codeMatch[1];
                        var fixedUrl = 'http://localhost:3001/auth/callback?code=' + encodeURIComponent(code);
                        console.log('[URLFixScript] Redirecting OAuth callback from root to callback handler:', fixedUrl);
                        window.location.replace(fixedUrl);
                        return;
                      }
                    }
                  }
                  
                  // Intercept location changes to catch malformed redirects
                  // This MUST run before any redirects happen
                  var originalReplace = window.location.replace;
                  var originalAssign = window.location.assign;
                  var originalHrefSetter = Object.getOwnPropertyDescriptor(window.location, 'href')?.set;
                  
                  // Override location.replace
                  window.location.replace = function(url) {
                    console.log('[URLFixScript] Intercepted location.replace:', url);
                    if (typeof url === 'string') {
                      // Check if URL is malformed (has code but no protocol)
                      if (url.includes('code=') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
                        console.error('[URLFixScript] ⚠️ CRITICAL: Intercepted malformed redirect!', url);
                        var codeMatch = url.match(/code=([^&]+)/);
                        if (codeMatch) {
                          var code = codeMatch[1];
                          var fixedUrl = 'http://localhost:3001/auth/callback?code=' + encodeURIComponent(code);
                          console.log('[URLFixScript] ✅ Fixing intercepted redirect:', fixedUrl);
                          return originalReplace.call(window.location, fixedUrl);
                        }
                      }
                    }
                    return originalReplace.call(window.location, url);
                  };
                  
                  // Override location.assign
                  window.location.assign = function(url) {
                    console.log('[URLFixScript] Intercepted location.assign:', url);
                    if (typeof url === 'string') {
                      if (url.includes('code=') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
                        console.error('[URLFixScript] ⚠️ CRITICAL: Intercepted malformed assign!', url);
                        var codeMatch = url.match(/code=([^&]+)/);
                        if (codeMatch) {
                          var code = codeMatch[1];
                          var fixedUrl = 'http://localhost:3001/auth/callback?code=' + encodeURIComponent(code);
                          console.log('[URLFixScript] ✅ Fixing intercepted assign:', fixedUrl);
                          return originalAssign.call(window.location, fixedUrl);
                        }
                      }
                    }
                    return originalAssign.call(window.location, url);
                  };
                  
                  // Also intercept location.href setter
                  if (originalHrefSetter) {
                    Object.defineProperty(window.location, 'href', {
                      set: function(url) {
                        console.log('[URLFixScript] Intercepted location.href set:', url);
                        if (typeof url === 'string') {
                          if (url.includes('code=') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
                            console.error('[URLFixScript] ⚠️ CRITICAL: Intercepted malformed href!', url);
                            var codeMatch = url.match(/code=([^&]+)/);
                            if (codeMatch) {
                              var code = codeMatch[1];
                              var fixedUrl = 'http://localhost:3001/auth/callback?code=' + encodeURIComponent(code);
                              console.log('[URLFixScript] ✅ Fixing intercepted href:', fixedUrl);
                              return originalHrefSetter.call(window.location, fixedUrl);
                            }
                          }
                        }
                        return originalHrefSetter.call(window.location, url);
                      },
                      get: function() {
                        return window.location.href;
                      },
                      configurable: true
                    });
                  }
                  
                  console.log('[URLFixScript] URL check complete, interceptors installed');
                } catch (error) {
                  console.error('[URLFixScript] Error:', error);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
