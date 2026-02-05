# 🚨 CRITICAL: Fix Supabase Dashboard Configuration

## ⚠️ THIS IS THE ROOT CAUSE - YOU MUST FIX THIS!

The error `Failed to launch 'localhost:3001?code=...'` happens because **Supabase Dashboard Site URL is missing the protocol**.

---

## 📸 Step-by-Step Fix (WITH SCREENSHOTS GUIDE)

### Step 1: Open Supabase Dashboard
1. Go to: **https://supabase.com/dashboard**
2. **Login** to your account
3. **Click on your project**

### Step 2: Navigate to URL Configuration
1. In the left sidebar, click **"Authentication"**
2. Click **"URL Configuration"** (under Authentication section)

### Step 3: Fix Site URL
**Find the "Site URL" field**

**❌ WRONG (Current - causes the error):**
```
localhost:3001
```

**✅ CORRECT (Must be exactly this):**
```
http://localhost:3001
```

**CRITICAL:** 
- Must start with `http://` (NOT `https://` for localhost)
- Must include the port `:3001`
- No trailing slash
- No spaces

### Step 4: Add Redirect URL
**Scroll down to "Redirect URLs" section**

**Click "Add URL" or the "+" button**

**Add this EXACT URL:**
```
http://localhost:3001/auth/callback
```

**OR** add wildcard (easier for development):
```
http://localhost:3001/*
```

**Important:**
- Must start with `http://`
- Must include port `:3001`
- Must include path `/auth/callback`
- No trailing slash

### Step 5: Save
1. **Click "Save"** button (usually at bottom of page)
2. **Wait 2-3 minutes** for changes to propagate
3. **Clear browser cache** (Ctrl+Shift+Delete) or use incognito mode

---

## ✅ Verification Checklist

After fixing, verify:

- [ ] Site URL = `http://localhost:3001` (with `http://`)
- [ ] Redirect URL = `http://localhost:3001/auth/callback` (with `http://` and path)
- [ ] No typos
- [ ] Port matches your frontend port (3001)
- [ ] Saved the changes
- [ ] Waited 2-3 minutes

---

## 🧪 Test After Fix

1. **Clear browser cache** (or use incognito)
2. **Open browser console** (F12)
3. **Go to login page**
4. **Click "Continue with Google"**
5. **Check console** - should see:
   ```
   [Google OAuth] Final redirect URL: http://localhost:3001/auth/callback
   ```
6. **After Google authorization**, should redirect to:
   ```
   http://localhost:3001/auth/callback?code=...
   ```
   (NOT `localhost:3001?code=...`)

---

## 🔍 If Still Not Working

### Check 1: Verify Settings Were Saved
- Go back to Supabase Dashboard → Authentication → URL Configuration
- Check if Site URL still shows `http://localhost:3001`
- If it reverted, save again and wait longer

### Check 2: Check Browser Console
Look for:
- `[Google OAuth] Final redirect URL: http://localhost:3001/auth/callback`
- If you see `localhost:3001/auth/callback` (without `http://`), the code fix will catch it

### Check 3: Check Supabase Auth Logs
- Go to Supabase Dashboard → Authentication → Logs
- Look for errors about redirect URLs
- Check if redirect URL is being rejected

### Check 4: Try Wildcard Pattern
If exact URL doesn't work, try:
```
http://localhost:3001/*
```
This allows any path on localhost:3001

---

## 🎯 Why This Happens

When Supabase Dashboard Site URL is set to `localhost:3001` (without `http://`):
1. Supabase uses this as the base URL for redirects
2. When constructing redirect URL, it doesn't add protocol
3. Browser receives `localhost:3001?code=...` (no protocol)
4. Browser treats it as custom URL scheme → Error!

**Solution:** Set Site URL to `http://localhost:3001` (with protocol)

---

## ✅ Summary

**The fix is simple but critical:**
1. Site URL must be `http://localhost:3001` (with `http://`)
2. Redirect URL must be `http://localhost:3001/auth/callback` (with `http://` and path)
3. Save and wait 2-3 minutes
4. Clear browser cache

**The code fix I added will catch malformed redirects, but you MUST fix Supabase Dashboard to prevent the issue.**

---

**DO THIS NOW:** Go to Supabase Dashboard and fix the Site URL! That's the root cause!
