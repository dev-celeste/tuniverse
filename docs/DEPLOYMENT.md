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

### Production

| Piece | Where | Config in the repo |
|---|---|---|
| Frontend (static React app) | Vercel, free | `frontend/vercel.json`: the `/api` proxy, routes, security headers |
| API | Render web service, free | `render.yaml` (Blueprint) |
| Sessions | Render Key Value (Redis), free | `render.yaml`: wired to the API as `REDIS_URL`, private to the account |

Order matters a little, because the API needs the frontend's address and vice versa.

1. **Vercel:** Add New → Project → import the GitHub repo. Set **Root Directory** to `frontend`
   (Vercel reads the rest from `vercel.json`) and deploy. Note the address, e.g.
   `https://tuniverse.vercel.app`; renaming the project in Settings → Domains gets a nicer one.
   The demo already works at this point; Spotify login doesn't yet.
2. **Render:** New → Blueprint → pick the repo. It creates `tuniverse-api` and
   `tuniverse-sessions` and asks for:

   | Var | Value |
   |---|---|
   | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | from the Spotify dashboard (same as `backend/.env`) |
   | `SPOTIFY_REDIRECT_URI` | `https://<vercel-domain>/api/v1/auth/callback` (the **frontend** domain) |
   | `FRONTEND_URL` | `https://<vercel-domain>` |

   `COOKIE_SECURE=true`, `REDIS_URL` and the Python version are set by the Blueprint.
   When it's live, `https://tuniverse-api.onrender.com/api/v1/health` returns `{"status":"ok"}`.
3. **If Render gave the API a different address** than `tuniverse-api.onrender.com` (the name was
   taken), put the real one in the `/api` rewrite in `frontend/vercel.json` and push. Vercel
   doesn't substitute env vars in rewrites.
4. **Spotify dashboard** → your app → Settings → Redirect URIs: add
   `https://<vercel-domain>/api/v1/auth/callback` (keep the local one). Under User Management,
   add the Spotify accounts that may log in (development mode allows 5). Everyone else uses the demo.
5. **Check:** open the Vercel address → Connect Spotify → you land back on the start screen and
   dive into your galaxy. `https://<vercel-domain>/api/v1/health` should answer through the proxy.

Both hosts redeploy on every push to `main`: Vercel for any change, Render only when `backend/`,
`requirements.txt` or `render.yaml` change.

**Free-plan behavior:** Render's free web service sleeps after 15 minutes without traffic and takes
about a minute to wake. The demo doesn't need the API, so it's unaffected; the first login after a
quiet spell would be slow, so `.github/workflows/keep-warm.yml` pings `/api/v1/health` every 10
minutes (GitHub can run it a few minutes late, and pauses scheduled jobs after 60 days without
commits; re-enable it under Actions). One always-on free service fits Render's 750 free hours a month. The free Key Value store isn't persisted to disk, so a restart of it logs
everyone out (they just log in again).

### Checklist when it breaks

- Logged in but every call returns 401 → the cookie isn't reaching the backend. Check that the
  browser is on the same host as the API (`127.0.0.1` vs `localhost`, or a missing proxy rewrite).
- `login_error=invalid_state` → the state cookie was lost between `/login` and `/callback`;
  usually the same host mismatch, or `COOKIE_SECURE=true` on plain http.
- The first request after a while takes ~1 minute → Render's free service was asleep (see above).
- `/api/v1/health` returns 503 → the API is up but can't reach Redis; check `tuniverse-sessions` in Render.
- Spotify shows "INVALID_CLIENT: Invalid redirect URI" → `SPOTIFY_REDIRECT_URI` doesn't exactly
  match the dashboard.
