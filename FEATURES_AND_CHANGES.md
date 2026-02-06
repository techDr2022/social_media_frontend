# Features and changes (frontend + related backend)

This doc lists the main features and changes made to the Social app (frontend and backend work that affects the frontend).

---

## Token encryption (backend)

- **Access and refresh tokens** can be stored encrypted in the database.
- **No `ENCRYPTION_KEY` in `.env`** → tokens are stored in **plain text** (same as before).
- **`ENCRYPTION_KEY` set in `.env`** (min 16 chars) → new/updated tokens are **encrypted** at rest.
- Old plain-text tokens keep working; a one-time migration script can encrypt existing tokens (`npm run encrypt-tokens` in backend).

---

## Your keys page

- **Route:** `/your-keys` (sidebar: “Your keys”).
- **Shows:** Connected accounts with **token expiry** and **status** (Healthy / Expiring soon / Expired / Disconnected). **No tokens or keys are shown.**
- **Automatic refresh:** A short explanation explains that tokens are refreshed automatically about once an hour; manual refresh is optional.
- **YouTube:** Note that tokens typically expire in ~1 hour and are refreshed when you use the app (e.g. upload); expiry shown is the next refresh window.
- **Facebook & Instagram:** Long-lived tokens (~60 days), refreshed automatically when close to expiry; manual refresh is optional.
- **Manual Refresh:** Button to trigger an immediate token refresh when the platform supports it (YouTube, Facebook, Instagram). If you see “not found”, use **Reconnect**.
- **Reconnect:** Link to the correct connect flow for each platform when the account is disconnected or expired.

---

## Alerts and TopBar

- **Unread-count polling:** Only runs when the user is logged in (`session?.access_token`).
- **On 401:** Polling stops so we don’t keep sending an invalid/expired token; no repeated 401s.
- **Backend:** 401 responses for `/alerts/unread-count` are no longer logged to avoid console spam.

---

## Error handling and UX

- **Structured errors:** Backend uses error codes (e.g. `ACCOUNT_NOT_FOUND`, `ACCOUNT_TOKEN_EXPIRED`) for token status and refresh.
- **Your keys:** On load error, a “Try again” button re-fetches token status.
- **Connect Instagram:** Reads `?error=...` from the URL after OAuth and shows a short message plus “Try again”.
- **Refresh errors:** On 404 from manual refresh, the message suggests using Reconnect.

---

## Manual refresh behavior

- **YouTube:** Manual refresh uses the same account id as on “Your keys”. If you see “not found”, the backend did not find that account for the current user; use **Reconnect** to link the account again. Uploads still work because the app refreshes the token when getting a valid YouTube token.
- **Facebook & Instagram:** Manual refresh is shown for active Facebook and Instagram accounts so you can trigger a refresh; automatic refresh still runs in the background. If manual refresh fails, use **Reconnect**.

---

## API routes (frontend → backend)

- **Token status:** `GET /api/social-accounts/token-status` → backend `GET /api/v1/social-accounts/token-status` (no tokens in response).
- **Manual refresh:** `POST /api/social-accounts/:accountId` → backend `POST /api/v1/social-accounts/:accountId/refresh`. `accountId` is trimmed before sending.

---

## Summary

| Area              | What we did |
|-------------------|------------|
| Token encryption  | Optional encryption when `ENCRYPTION_KEY` is set; plain text when not. |
| Your keys         | New page with expiry, status, auto-refresh text, manual Refresh, Reconnect. |
| Alerts            | Poll only when logged in; stop on 401; no 401 log spam for unread-count. |
| Errors            | Clearer messages and Try again / Reconnect where relevant. |
| Manual refresh    | Shown for YouTube (with refresh token), Facebook, Instagram (when active). |
