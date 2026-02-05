# 🔧 Critical: Supabase Dashboard Configuration Check

## ⚠️ IMPORTANT: This MUST be configured correctly!

The error "Failed to launch 'localhost:3001?code=..." means Supabase is not using your redirect URL correctly.

---

## ✅ Step-by-Step Supabase Dashboard Configuration

### 1. **Site URL Configuration**

Go to: **Supabase Dashboard → Authentication → URL Configuration**

**Set Site URL to:**
```
http://localhost:3001
```

**Important:** This is the base URL Supabase uses. It MUST match your frontend URL.

---

### 2. **Redirect URLs (Allow List)**

In the same page, under **Redirect URLs**, add **EXACTLY**:

```
http://localhost:3001/auth/callback
```

**OR** use wildcard (for development):
```
http://localhost:3001/*
```

**Critical Points:**
- ✅ Must include `http://` protocol
- ✅ Must include port `:3001`
- ✅ Must include full path `/auth/callback`
- ✅ No trailing slash
- ✅ Case-sensitive (use lowercase)

---

### 3. **Google OAuth Provider Configuration**

Go to: **Supabase Dashboard → Authentication → Providers → Google**

**Verify:**
- ✅ Google provider is **Enabled**
- ✅ **Client ID** is set (from Google Cloud Console)
- ✅ **Client Secret** is set (from Google Cloud Console)

**Authorized redirect URIs in Google Cloud Console:**
```
https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
```

**DO NOT** add `http://localhost:3001/auth/callback` to Google Cloud Console - Supabase handles that!

---

## 🔍 How to Verify

1. **Check Browser Console:**
   After clicking "Continue with Google", you should see:
   ```
   [Google OAuth] Debug Info: { origin: 'http://localhost:3001', ... }
   [Google OAuth] Calling signInWithOAuth with redirectTo: http://localhost:3001/auth/callback
   ```

2. **Check Network Tab:**
   - Look for the OAuth request to Supabase
   - Check the `redirect_uri` parameter
   - It should be: `https://[PROJECT].supabase.co/auth/v1/callback`

3. **Check Supabase Auth Logs:**
   - Go to **Supabase Dashboard → Authentication → Logs**
   - Look for errors related to redirect URL
   - Check if redirect URL is being rejected

---

## 🐛 Common Mistakes

### ❌ Wrong Site URL
```
Site URL: https://localhost:3001  ← Wrong! Should be http://
Site URL: localhost:3001         ← Wrong! Missing protocol
Site URL: http://localhost:3000   ← Wrong! Wrong port
```

### ✅ Correct Site URL
```
Site URL: http://localhost:3001
```

### ❌ Wrong Redirect URL
```
http://localhost:3001/auth/callback/  ← Trailing slash
http://localhost:3001/Auth/Callback   ← Wrong case
localhost:3001/auth/callback          ← Missing protocol
http://localhost/auth/callback         ← Missing port
```

### ✅ Correct Redirect URL
```
http://localhost:3001/auth/callback
```

---

## 🔄 After Making Changes

1. **Save** the configuration in Supabase Dashboard
2. **Wait 1-2 minutes** for changes to propagate
3. **Clear browser cache/localStorage**
4. **Try again**

---

## 📝 Quick Checklist

- [ ] Site URL = `http://localhost:3001`
- [ ] Redirect URL = `http://localhost:3001/auth/callback` (or `http://localhost:3001/*`)
- [ ] Google provider is enabled
- [ ] Google Client ID and Secret are set
- [ ] No typos in URLs
- [ ] Protocol is `http://` (not `https://` for localhost)
- [ ] Port matches your frontend port (3001)

---

## 🆘 If Still Not Working

1. **Check Supabase Auth Logs** for specific errors
2. **Check browser console** for the debug logs
3. **Verify** your frontend is actually running on port 3001
4. **Try** using the wildcard pattern: `http://localhost:3001/*`
5. **Check** if there are multiple redirect URLs conflicting

---

## ✅ Expected Flow

1. User clicks "Continue with Google"
2. Browser console shows: `[Google OAuth] Calling signInWithOAuth with redirectTo: http://localhost:3001/auth/callback`
3. Redirects to Google OAuth
4. User authorizes
5. Google redirects to Supabase callback
6. Supabase processes and redirects to: `http://localhost:3001/auth/callback?code=...`
7. Your callback page processes the code
8. Redirects to `/dashboard`

---

**The most common issue is incorrect Site URL or Redirect URL configuration in Supabase Dashboard!**
