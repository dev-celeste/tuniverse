# Tuniverse frontend

React + TypeScript + Vite. The design reference is [`docs/prototype/tuniverse-galaxy.html`](../docs/prototype/tuniverse-galaxy.html).

## Run it

Needs Node 24 (pinned in `.nvmrc`) and the backend running on `127.0.0.1:8000`.

```bash
nvm use
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Use `127.0.0.1`, not `localhost`: the session cookie is scoped to the host, and the backend and Spotify redirect URI use `127.0.0.1`.

The backend's `.env` needs `FRONTEND_URL=http://127.0.0.1:5173` so Spotify login returns here.

## How it talks to the backend

- The Vite dev server proxies `/api` to the backend, so every request is same-origin and the HttpOnly session cookie is sent automatically. Production uses the same shape (see [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md)).
- **Connect Spotify** is a full-page navigation to `/api/v1/auth/login`. After login the backend redirects to `/galaxy`, or to `/?login_error=<code>` on failure.
- Response types in `src/api/schema.d.ts` are generated from the backend's Pydantic models. After changing `backend/models`, regenerate them:

  ```bash
  npm run gen:api
  ```

## Sessions and protected pages

Pages that need Spotify go inside the `RequireSession` layout route in `src/App.tsx`. It checks the session with `/spotify/me`, then:

| Result | What happens |
|---|---|
| Signed in | The page renders; read the user with `useSessionUser()` |
| 401, never signed in | Start screen |
| 401 after being signed in | Start screen with "Your session ended…" |
| 403 | Start screen with "This Spotify account isn't on the invite list yet…" |
| Other errors | Error card with **Try again** |

A 401 from any other request (an expired or revoked session, or a backend restart with in-memory sessions) re-checks the session, so these rules apply app-wide. Log out with `useLogout()`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server at 127.0.0.1:5173 with the `/api` proxy |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Lint with oxlint |
| `npm test` | Run the tests once (Vitest + React Testing Library); `npm run test:watch` to keep them running |
| `npm run gen:api` | Regenerate API types from the backend's OpenAPI schema |

## Routes

| Path | Page |
|---|---|
| `/` | Start screen: Connect Spotify, demo entry, login error messages |
| `/galaxy` | Signed-in app (currently the profile card; the 3D galaxy arrives in Ticket 17). Protected |
| `/demo` | Demo universe placeholder |
