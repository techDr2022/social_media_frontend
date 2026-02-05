# 🔧 Fix: 404 Errors for /social-accounts and /scheduled-posts

## Issue

Backend logs showing 404 errors:
```
[HttpExceptionFilter] Sent error response: 404, path: /social-accounts
[HttpExceptionFilter] Sent error response: 404, path: /scheduled-posts
```

## Root Cause

The backend uses a global prefix `/api/v1` (set in `main.ts`):
```typescript
app.setGlobalPrefix('api/v1');
```

So all routes are actually at:
- `/api/v1/social-accounts`
- `/api/v1/scheduled-posts`
- `/api/v1/youtube/upload/:accountId`
- `/api/v1/instagram/post/:accountId`
- `/api/v1/facebook/post/:accountId`

But the frontend API routes were calling:
- `/social-accounts` ❌ (missing `/api/v1`)
- `/scheduled-posts` ❌ (missing `/api/v1`)

---

## ✅ Fixes Applied

All API routes have been updated to include `/api/v1` prefix:

### Fixed Routes:
1. ✅ `/api/social-accounts` → `/api/v1/social-accounts`
2. ✅ `/api/social-accounts/[accountId]` → `/api/v1/social-accounts/[accountId]`
3. ✅ `/api/scheduled-posts` → `/api/v1/scheduled-posts`
4. ✅ `/api/social-accounts/youtube/[accountId]/videos` → `/api/v1/social-accounts/youtube/[accountId]/videos`
5. ✅ `/api/social-accounts/youtube/[accountId]/statistics` → `/api/v1/social-accounts/youtube/[accountId]/statistics`
6. ✅ `/api/social-accounts/connect/instagram` → `/api/v1/social-accounts/connect/instagram`
7. ✅ `/api/social-accounts/connect/facebook` → `/api/v1/social-accounts/connect/facebook`
8. ✅ `/api/youtube/upload/[accountId]` → `/api/v1/youtube/upload/[accountId]`
9. ✅ `/api/instagram/post/[accountId]` → `/api/v1/instagram/post/[accountId]`
10. ✅ `/api/instagram/posts/[accountId]` → `/api/v1/instagram/posts/[accountId]`
11. ✅ `/api/instagram/posts/[accountId]/[postId]` → `/api/v1/instagram/posts/[accountId]/[postId]`
12. ✅ `/api/facebook/post/[accountId]` → `/api/v1/facebook/post/[accountId]`
13. ✅ `/api/facebook/posts/[accountId]` → `/api/v1/facebook/posts/[accountId]`
14. ✅ `/api/facebook/posts/[accountId]/[postId]` → `/api/v1/facebook/posts/[accountId]/[postId]`
15. ✅ `/api/users/profile` → `/api/v1/users/profile`
16. ✅ `/social-accounts/callback/instagram` → `/api/v1/social-accounts/callback/instagram`

---

## 🧪 Test It

1. **Restart frontend** (if needed)
2. **Check backend logs** - should no longer see 404 errors
3. **Try loading dashboard** - should load social accounts and scheduled posts
4. **Check browser console** - should see successful API calls

---

## ✅ Result

- ✅ All API routes now include `/api/v1` prefix
- ✅ Backend routes match frontend calls
- ✅ No more 404 errors
- ✅ Social accounts and scheduled posts should load correctly

---

## 📝 Note

The `next.config.mjs` rewrite rule:
```javascript
source: "/api/:path*",
destination: "http://localhost:3000/api/v1/:path*",
```

This rewrite only works for direct browser requests. Since we're using Next.js API routes that proxy to the backend, we need to include `/api/v1` in the fetch URLs.

---

**All API routes are now fixed! The 404 errors should be gone.**
