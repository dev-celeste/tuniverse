# Deployment & cookie architecture

## The problem

Login state lives in an HttpOnly `tuniverse_session` cookie set by the backend.
If the frontend and backend live on different sites — e.g. `tuniverse.vercel.app` and
`tuniverse-api.onrender.com` — that cookie is a **third-party cookie** from the frontend's
point of view. Safari blocks those by default, Firefox partitions them, and Chrome lets users
block them, so login would silently break for many visitors.

## The fix: one site, `/api` proxied

The browser only ever talks to the frontend's domain. The frontend host forwards `/api/*`
to the backend, so every cookie is first-party and CORS never comes into play.

```
Browser ──► https://tuniverse.app/            → static React app
        └─► https://tuniverse.app/api/v1/...  → (proxy) → https://<backend-host>/api/v1/...
```

This is the same shape as local dev, where the Vite dev server proxies `/api` to uvicorn.

### Local development

| Piece | Value |
|---|---|
| Frontend | `http://127.0.0.1:5173` — use `127.0.0.1`, **not** `localhost` (they're different cookie hosts) |
| Vite proxy | `/api` → `http://127.0.0.1:8000` (set up in Ticket 15) |
| `FRONTEND_URL` | `http://127.0.0.1:5173` |
| `SPOTIFY_REDIRECT_URI` | `http://127.0.0.1:5173/api/v1/auth/callback` once the frontend exists (through the proxy, mirroring production). `http://127.0.0.1:8000/...` also works, since cookies are scoped by host, not port |
| `COOKIE_SECURE` | unset / `false` |
| `REDIS_URL` | unset (in-memory) |

The frontend starts login with a full-page navigation (`window.location.href = "/api/v1/auth/login"`),
not `fetch`, because it's a redirect chain through Spotify.

### Production (Ticket 23)

1. **Backend** (Render / Railway / Fly.io): run
   `uvicorn main:app --host 0.0.0.0 --port $PORT` from `backend/`, with a managed Redis.
2. **Frontend** (Vercel): add a rewrite in `frontend/vercel.json`. Vercel doesn't
   substitute env vars here, so put the real backend URL in:

   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://<backend-host>/api/:path*" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

   The second rule sends client-side routes like `/galaxy` to the React app.
   (Netlify equivalent: `/api/*  https://<backend-host>/api/:splat  200` in `_redirects`.)
3. **Backend env vars:**

   | Var | Value |
   |---|---|
   | `SPOTIFY_REDIRECT_URI` | `https://tuniverse.app/api/v1/auth/callback` (the **frontend** domain) |
   | `FRONTEND_URL` | `https://tuniverse.app` |
   | `COOKIE_SECURE` | `true` |
   | `REDIS_URL` | from the Redis provider |
   | `CORS_ORIGINS` | `https://tuniverse.app` (unused behind the proxy, but harmless) |
4. **Spotify dashboard:** add the production redirect URI, and add the Spotify accounts of anyone
   who should be able to log in to the app's user allowlist (development-mode apps only allow
   allowlisted users). Everyone else uses demo mode.

### Checklist when it breaks

- Logged in but every call returns 401 → the cookie isn't reaching the backend. Check that the
  browser is on the same host as the API (`127.0.0.1` vs `localhost`, or a missing proxy rewrite).
- `login_error=invalid_state` → the state cookie was lost between `/login` and `/callback`;
  usually the same host mismatch, or `COOKIE_SECURE=true` on plain http.
- Spotify shows "INVALID_CLIENT: Invalid redirect URI" → `SPOTIFY_REDIRECT_URI` doesn't exactly
  match the dashboard.
