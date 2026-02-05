# 🔧 Fix: "Failed to launch localhost:3001?code=..." Error

## Issue

**Error:** `Failed to launch 'localhost:3001?code=700e6f31-9693-4b8d-babf-d454578a1d66' because the scheme does not have a registered handler.`

**Root Cause:**
- The redirect URL is missing the protocol (`http://` or `https://`)
- The redirect URL might not be properly configured in Supabase Dashboard
- Supabase is trying to redirect to `localhost:3001?code=...` instead of `http://localhost:3001/auth/callback?code=...`

---

## ✅ Fix Steps

### 1. **Verify Supabase Dashboard Configuration**

Go to your Supabase Dashboard:
1. Navigate to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, make sure you have:
   ```
   http://localhost:3001/auth/callback
   ```
   **OR** use a wildcard pattern:
   ```
   http://localhost:3001/*
   ```

3. **Important:** The URL **MUST** include:
   - ✅ Protocol (`http://` or `https://`)
   - ✅ Full path (`/auth/callback`)
   - ✅ Port number if not default (`:3001`)

---

### 2. **Verify Code is Correct**

The code now validates the redirect URL format:

```typescript
// File: src/app/login/page.tsx
const redirectUrl = `${origin}/auth/callback`;

// Validates protocol is present
if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
  throw new Error(`Invalid redirect URL: ${redirectUrl}`);
}
```

---

### 3. **Check Browser Console**

After clicking "Continue with Google", check the browser console for:
```
[Google OAuth] Redirect URL: http://localhost:3001/auth/callback
```

If you see a different URL or an error, that's the issue.

---

### 4. **Common Issues**

#### Issue A: Redirect URL not in Supabase Dashboard
**Symptom:** Error about invalid redirect URL
**Fix:** Add `http://localhost:3001/auth/callback` to Supabase Dashboard → Auth → URL Configuration

#### Issue B: Protocol Missing
**Symptom:** Error "scheme does not have a registered handler"
**Fix:** Ensure redirect URL includes `http://` or `https://`

#### Issue C: Wrong Port
**Symptom:** Redirects to wrong port
**Fix:** Match the port in Supabase Dashboard with your actual frontend port (3001)

#### Issue D: Path Mismatch
**Symptom:** Redirects to wrong page
**Fix:** Ensure path `/auth/callback` matches exactly in both code and Supabase Dashboard

---

## 🧪 Testing

1. **Clear browser cache/localStorage**
2. **Open browser console** (F12)
3. **Click "Continue with Google"**
4. **Check console for:**
   ```
   [Google OAuth] Redirect URL: http://localhost:3001/auth/callback
   ```
5. **After Google authorization, should redirect to:**
   ```
   http://localhost:3001/auth/callback?code=...
   ```

---

## ✅ Expected Behavior

1. Click "Continue with Google"
2. Redirects to Google OAuth
3. User authorizes
4. Google redirects to: `http://localhost:3001/auth/callback?code=...`
5. Callback page processes code
6. Redirects to `/dashboard`

---

## 🔍 Debugging

If still not working:

1. **Check Supabase Dashboard → Auth Logs**
   - Look for errors related to redirect URL
   - Check if the redirect URL is being rejected

2. **Check Browser Network Tab**
   - Look for the OAuth redirect request
   - Check the `redirect_uri` parameter in the request

3. **Verify Environment**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Ensure frontend is running on port 3001

---

## ✅ Summary

The fix ensures:
- ✅ Redirect URL includes protocol
- ✅ Redirect URL is validated before use
- ✅ Better error logging for debugging
- ✅ Proper URL format: `http://localhost:3001/auth/callback`

**Most Important:** Make sure `http://localhost:3001/auth/callback` is added to your Supabase Dashboard → Authentication → URL Configuration!
