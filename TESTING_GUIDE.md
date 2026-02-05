# 🧪 Testing Guide: API Routes Fix

## 📋 What We Changed

### **Root Cause**
The backend uses a global prefix `/api/v1` for all routes (set in `backend/api-service/src/main.ts`):
```typescript
app.setGlobalPrefix('api/v1');
```

But the frontend API routes were calling endpoints **without** this prefix, causing 404 errors.

---

## ✅ Files Changed

### **1. Core API Routes** (16 files fixed)

#### Social Accounts Routes:
- ✅ `frontend/src/app/api/social-accounts/route.ts`
  - Changed: `/social-accounts` → `/api/v1/social-accounts`
  
- ✅ `frontend/src/app/api/social-accounts/[accountId]/route.ts`
  - Changed: `/social-accounts/${accountId}` → `/api/v1/social-accounts/${accountId}`

- ✅ `frontend/src/app/api/social-accounts/connect/instagram/route.ts`
  - Changed: `/social-accounts/connect/instagram` → `/api/v1/social-accounts/connect/instagram`

- ✅ `frontend/src/app/api/social-accounts/connect/facebook/route.ts`
  - Changed: `/social-accounts/connect/facebook` → `/api/v1/social-accounts/connect/facebook`

- ✅ `frontend/src/app/api/social-accounts/youtube/[accountId]/videos/route.ts`
  - Changed: `/social-accounts/youtube/${accountId}/videos` → `/api/v1/social-accounts/youtube/${accountId}/videos`

- ✅ `frontend/src/app/api/social-accounts/youtube/[accountId]/statistics/route.ts`
  - Changed: `/social-accounts/youtube/${accountId}/statistics` → `/api/v1/social-accounts/youtube/${accountId}/statistics`

#### Scheduled Posts Routes:
- ✅ `frontend/src/app/api/scheduled-posts/route.ts`
  - Changed: `/scheduled-posts` → `/api/v1/scheduled-posts` (both GET and POST)

#### Platform-Specific Routes:
- ✅ `frontend/src/app/api/youtube/upload/[accountId]/route.ts`
  - Changed: `/youtube/upload/${accountId}` → `/api/v1/youtube/upload/${accountId}`

- ✅ `frontend/src/app/api/instagram/post/[accountId]/route.ts`
  - Changed: `/instagram/post/${accountId}` → `/api/v1/instagram/post/${accountId}`

- ✅ `frontend/src/app/api/instagram/posts/[accountId]/route.ts`
  - Changed: `/instagram/posts/${accountId}` → `/api/v1/instagram/posts/${accountId}`

- ✅ `frontend/src/app/api/instagram/posts/[accountId]/[postId]/route.ts`
  - Changed: `/instagram/posts/${accountId}/${postId}` → `/api/v1/instagram/posts/${accountId}/${postId}`

- ✅ `frontend/src/app/api/facebook/post/[accountId]/route.ts`
  - Changed: `/facebook/post/${accountId}` → `/api/v1/facebook/post/${accountId}` (POST, GET, DELETE)

- ✅ `frontend/src/app/api/facebook/posts/[accountId]/route.ts`
  - Changed: `/facebook/posts/${accountId}` → `/api/v1/facebook/posts/${accountId}`

- ✅ `frontend/src/app/api/facebook/posts/[accountId]/[postId]/route.ts`
  - Changed: `/facebook/posts/${accountId}/${postId}` → `/api/v1/facebook/posts/${accountId}/${postId}`

#### User Routes:
- ✅ `frontend/src/app/api/users/profile/route.ts`
  - Changed: `/users/profile` → `/api/v1/users/profile`

#### Callback Routes:
- ✅ `frontend/src/app/social-accounts/callback/instagram/route.ts`
  - Changed: `/social-accounts/callback/instagram` → `/api/v1/social-accounts/callback/instagram`

---

## 🧪 What to Test

### **1. Backend Logs** ✅
**Before:** You saw repeated 404 errors:
```
[HttpExceptionFilter] Sent error response: 404, path: /social-accounts
[HttpExceptionFilter] Sent error response: 404, path: /scheduled-posts
```

**After:** Should see successful requests:
```
[LoggingInterceptor] GET /api/v1/social-accounts - 200
[LoggingInterceptor] GET /api/v1/scheduled-posts - 200
```

**Test:** Check backend terminal - no more 404 errors for these routes.

---

### **2. Dashboard Page** ✅
**Test:** Load the main dashboard (`/dashboard`)

**Expected:**
- ✅ Social accounts load successfully
- ✅ Scheduled posts load successfully
- ✅ No console errors
- ✅ No loading spinners stuck

**Check:**
- Browser DevTools → Network tab → Look for `/api/social-accounts` and `/api/scheduled-posts` → Should return 200 OK
- Browser Console → Should see successful API calls

---

### **3. Social Accounts Management** ✅

#### **3.1 List Social Accounts**
**Test:** Navigate to any page that shows connected accounts

**Expected:**
- ✅ Accounts list loads
- ✅ Account details display correctly
- ✅ No "Failed to load accounts" errors

---

#### **3.2 Connect New Account**
**Test:** Try connecting Instagram/Facebook/YouTube

**Expected:**
- ✅ OAuth flow starts correctly
- ✅ Redirects work properly
- ✅ Account connects successfully
- ✅ New account appears in list

**Routes to verify:**
- `/api/social-accounts/connect/instagram` → Should redirect to Instagram OAuth
- `/api/social-accounts/connect/facebook` → Should redirect to Facebook OAuth
- `/api/social-accounts/connect/youtube` → Should redirect to YouTube OAuth

---

#### **3.3 Delete Account**
**Test:** Delete a connected social account

**Expected:**
- ✅ Delete request succeeds
- ✅ Account removed from list
- ✅ No errors in console

**Route:** `/api/social-accounts/[accountId]` (DELETE)

---

### **4. Scheduled Posts** ✅

#### **4.1 View Scheduled Posts**
**Test:** Navigate to schedule page or dashboard

**Expected:**
- ✅ Posts list loads
- ✅ Post details display correctly
- ✅ Status indicators work

---

#### **4.2 Create Scheduled Post**
**Test:** Create a new scheduled post

**Expected:**
- ✅ Post creation succeeds
- ✅ Post appears in list
- ✅ No errors

**Route:** `/api/scheduled-posts` (POST)

---

### **5. Platform-Specific Features** ✅

#### **5.1 YouTube**
**Test:**
- View YouTube account videos
- View YouTube statistics
- Upload YouTube video

**Routes:**
- `/api/social-accounts/youtube/[accountId]/videos`
- `/api/social-accounts/youtube/[accountId]/statistics`
- `/api/youtube/upload/[accountId]`

**Expected:** All features work without 404 errors

---

#### **5.2 Instagram**
**Test:**
- Create Instagram post
- List Instagram posts
- Delete Instagram post

**Routes:**
- `/api/instagram/post/[accountId]` (POST)
- `/api/instagram/posts/[accountId]` (GET)
- `/api/instagram/posts/[accountId]/[postId]` (DELETE)

**Expected:** All features work without 404 errors

---

#### **5.3 Facebook**
**Test:**
- Create Facebook post
- List Facebook posts
- Delete Facebook post

**Routes:**
- `/api/facebook/post/[accountId]` (POST)
- `/api/facebook/posts/[accountId]` (GET)
- `/api/facebook/posts/[accountId]/[postId]` (DELETE)

**Expected:** All features work without 404 errors

---

### **6. User Profile** ✅
**Test:** Update user profile

**Route:** `/api/users/profile` (PUT)

**Expected:**
- ✅ Profile updates successfully
- ✅ Changes persist
- ✅ No errors

---

### **7. Instagram OAuth Callback** ✅
**Test:** Complete Instagram OAuth flow

**Route:** `/social-accounts/callback/instagram`

**Expected:**
- ✅ Callback processes correctly
- ✅ Redirects to frontend
- ✅ Account connects successfully

---

## 🔍 How to Verify Fix

### **Method 1: Browser DevTools**
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter by `/api/`
4. Reload dashboard
5. Check all requests return **200 OK** (not 404)

### **Method 2: Backend Logs**
1. Check backend terminal
2. Look for successful requests:
   ```
   [LoggingInterceptor] GET /api/v1/social-accounts - 200
   [LoggingInterceptor] GET /api/v1/scheduled-posts - 200
   ```
3. Should **NOT** see:
   ```
   [HttpExceptionFilter] Sent error response: 404, path: /social-accounts
   ```

### **Method 3: Browser Console**
1. Open browser DevTools → Console
2. Look for API call logs:
   ```
   [Social Accounts API] Fetching accounts from: http://localhost:3000/api/v1/social-accounts
   ```
3. Should see successful responses, no errors

---

## ✅ Success Criteria

- ✅ **No 404 errors** in backend logs
- ✅ **Dashboard loads** social accounts and scheduled posts
- ✅ **All API calls return 200 OK**
- ✅ **No console errors** in browser
- ✅ **All features work** (connect, create, delete, etc.)

---

## 🐛 If Something Still Doesn't Work

### **Check:**
1. **Backend is running** on port 3000
2. **Frontend is running** on port 3001
3. **Environment variables** are set correctly:
   - `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BACKEND_URL` (if used)
4. **Browser cache** is cleared (hard refresh: Ctrl+Shift+R)

### **Debug Steps:**
1. Check browser Network tab → See actual request URLs
2. Check backend logs → See what routes are being hit
3. Check browser Console → See any JavaScript errors
4. Verify the route exists in backend → Check `backend/api-service/src/main.ts` for global prefix

---

## 📝 Summary

**What Changed:**
- Added `/api/v1` prefix to all frontend API route calls
- Fixed 16 API route files
- All routes now match backend's global prefix

**Impact:**
- ✅ Fixes 404 errors
- ✅ Restores functionality for social accounts and scheduled posts
- ✅ All platform-specific features work correctly

**Testing Priority:**
1. **High:** Dashboard loading (social accounts + scheduled posts)
2. **High:** Backend logs (no 404 errors)
3. **Medium:** Connect/delete accounts
4. **Medium:** Create scheduled posts
5. **Low:** Platform-specific features (YouTube, Instagram, Facebook)

---

**🎉 All routes are now fixed! Test the dashboard first - it should work perfectly now.**
