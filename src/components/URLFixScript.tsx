"use client";

/**
 * Critical: Fix malformed Supabase redirects
 * 
 * This component injects a script that runs IMMEDIATELY when the page loads,
 * before React hydrates. This catches malformed URLs like "localhost:3001?code=..."
 * that Supabase sometimes redirects to (missing protocol).
 * 
 * The script runs in the <head> and fixes the URL before React even starts.
 */
export function URLFixScript() {
  return (
    <>
      {/* Inline script that runs IMMEDIATELY - before any other scripts */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              console.log('[URLFixScript] Script loaded, checking URL...');
              
              // Fix malformed URLs immediately (runs before React)
              try {
                var currentUrl = window.location.href;
                var search = window.location.search;
                var pathname = window.location.pathname;
                var hostname = window.location.hostname;
                var port = window.location.port;
                
                console.log('[URLFixScript] Current URL:', {
                  href: currentUrl,
                  search: search,
                  pathname: pathname,
                  hostname: hostname,
                  port: port,
                  hasProtocol: currentUrl.startsWith('http://') || currentUrl.startsWith('https://')
                });
                
                // Check if URL is malformed (missing protocol but has code parameter)
                // This happens when Supabase redirects incorrectly
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
                
                console.log('[URLFixScript] URL check complete, no fixes needed');
              } catch (error) {
                console.error('[URLFixScript] Error checking URL:', error);
              }
            })();
          `,
        }}
      />
      {/* Also intercept window.location changes */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Intercept location changes to catch malformed redirects
              var originalReplace = window.location.replace;
              var originalAssign = window.location.assign;
              
              window.location.replace = function(url) {
                console.log('[URLFixScript] Intercepted location.replace:', url);
                if (typeof url === 'string' && url.includes('code=') && !url.startsWith('http://') && !url.startsWith('https://')) {
                  console.error('[URLFixScript] ⚠️ Intercepted malformed redirect!', url);
                  var codeMatch = url.match(/code=([^&]+)/);
                  if (codeMatch) {
                    var code = codeMatch[1];
                    var fixedUrl = 'http://localhost:3001/auth/callback?code=' + encodeURIComponent(code);
                    console.log('[URLFixScript] Fixing intercepted redirect:', fixedUrl);
                    return originalReplace.call(window.location, fixedUrl);
                  }
                }
                return originalReplace.call(window.location, url);
              };
              
              window.location.assign = function(url) {
                console.log('[URLFixScript] Intercepted location.assign:', url);
                if (typeof url === 'string' && url.includes('code=') && !url.startsWith('http://') && !url.startsWith('https://')) {
                  console.error('[URLFixScript] ⚠️ Intercepted malformed assign!', url);
                  var codeMatch = url.match(/code=([^&]+)/);
                  if (codeMatch) {
                    var code = codeMatch[1];
                    var fixedUrl = 'http://localhost:3001/auth/callback?code=' + encodeURIComponent(code);
                    console.log('[URLFixScript] Fixing intercepted assign:', fixedUrl);
                    return originalAssign.call(window.location, fixedUrl);
                  }
                }
                return originalAssign.call(window.location, url);
              };
            })();
          `,
        }}
      />
    </>
  );
}
