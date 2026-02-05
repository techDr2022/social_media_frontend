# 🔍 Magic Link Debugging Guide

## Issue: Still Loading After Clicking Magic Link

If the magic link callback is still showing infinite loading, check these:

---

## ✅ What We Fixed

1. **Callback Page** - Now uses `onAuthStateChange` instead of polling
2. **AuthProvider** - Sets `loading = false` immediately, sync runs in background
3. **Session Detection** - Checks for session immediately and waits for hash processing

---

## 🐛 Debugging Steps

### 1. Check Browser Console

Open DevTools (F12) and look for:
- `[Auth Callback]` logs
- `[AuthProvider]` logs
- Any errors

**Expected logs:**
```
[Auth Callback] No session found, waiting for hash processing...
[Auth Callback] Auth state changed: SIGNED_IN has session
[Auth Callback] Session detected, redirecting...
```

### 2. Check URL Hash

After clicking magic link, the URL should have a hash fragment:
```
http://localhost:3001/auth/callback#access_token=...&type=magiclink&...
```

**If no hash:** The redirect URL might be wrong in Supabase settings.

### 3. Check Supabase Redirect URL

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Check **Redirect URLs** includes:
   - `http://localhost:3001/auth/callback` (development)
   - Your production URL (production)

### 4. Check Network Tab

Look for:
- `/api/auth/sync` request (should complete or timeout after 10s)
- Any failed requests

### 5. Test Session Directly

Open browser console on callback page and run:
```javascript
// Check if session exists
const { data } = await supabase.auth.getSession();
console.log("Session:", data.session);

// Check URL hash
console.log("Hash:", window.location.hash);
```

---

## 🔧 Common Issues

### Issue 1: Hash Not Processing
**Symptom:** URL has hash but no session

**Fix:** 
- Check Supabase redirect URL is correct
- Clear browser cache
- Try incognito mode

### Issue 2: Session Exists But Not Redirecting
**Symptom:** Console shows session but page stays loading

**Fix:**
- Check `hasRedirected` state
- Check router is working
- Check for JavaScript errors

### Issue 3: Backend Sync Blocking
**Symptom:** Sync request hangs

**Fix:**
- Check backend is running
- Check `/api/auth/sync` route exists
- Check backend URL is correct

---

## 🧪 Manual Test

1. **Send Magic Link:**
   ```javascript
   await supabase.auth.signInWithOtp({ 
     email: 'test@example.com',
     options: { emailRedirectTo: 'http://localhost:3001/auth/callback' }
   });
   ```

2. **Click Link in Email**

3. **Check Console Logs:**
   - Should see auth state change
   - Should see redirect

4. **Check URL:**
   - Should redirect to `/dashboard`

---

## 📝 What to Check

- [ ] Supabase redirect URL configured
- [ ] Backend is running
- [ ] `/api/auth/sync` route exists
- [ ] No CORS errors
- [ ] No JavaScript errors
- [ ] Hash fragment in URL after clicking link
- [ ] Console logs show auth state changes

---

## 🚨 If Still Not Working

1. **Clear Everything:**
   ```javascript
   // In browser console
   await supabase.auth.signOut();
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs → Auth Logs
   - Check for errors

3. **Test with Simple Flow:**
   - Create a test page that just logs auth state
   - See if session is established

4. **Check Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BACKEND_URL`

---

## ✅ Expected Flow

1. User clicks magic link → Redirects to `/auth/callback#access_token=...`
2. Supabase SDK processes hash → Fires `SIGNED_IN` event
3. Callback page detects session → Shows "Redirecting..."
4. Redirects to `/dashboard` → User is logged in

---

If you're still seeing issues, check the browser console and share the logs!
