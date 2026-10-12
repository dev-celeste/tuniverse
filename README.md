# Tuniverse 🌌🎶

Tuniverse is a full-stack music analytics and visualization application that transforms Spotify listening data into an interactive, space-themed experience. Inspired by Spotify Wrapped, Tuniverse allows users to explore their listening habits, moods, and trends at any point in time — not just once a year.

Your top artists become planets, your top tracks become their moons, and the genres you listen to set the colors and mood of your galaxy.

## Current Status
🚧 In active development — backend complete, frontend next.

## Features
**Backend (done)**
- Spotify OAuth (Authorization Code flow) with CSRF-protected `state`
- Per-user sessions via an HttpOnly cookie; tokens stay server-side (in-memory for dev, Redis in production)
- Transparent access-token refresh — on expiry and on 401, with a single retry
- Galaxy model: artists → planets (orbit, size, glow, genre color), tracks → moons
- Genre-based mood analysis with a visual identity (palette + background style) per mood
- Typed, slimmed responses for every endpoint, with `short_term` / `medium_term` / `long_term` time ranges
- Test suite covering auth, sessions, token refresh and every endpoint

**Frontend (planned)** — React + TypeScript + React Three Fiber galaxy, mood dashboard, demo mode.

## Tech Stack
**Backend:** Python 3.10+, FastAPI, Uvicorn, Pydantic, Redis (optional), Spotify Web API, pytest

**Frontend (planned):** React, TypeScript, Vite, React Three Fiber, Tailwind CSS

## Architecture
```
backend/
  main.py          App setup, CORS, error → HTTP mapping
  core/            Config, session store (memory / Redis), domain exceptions
  routers/         Thin HTTP layer: auth, spotify, health
  services/        spotify_auth (accounts API), spotify_client (Web API + refresh), spotify_service (use cases)
  transformers/    Raw Spotify payloads → models; genre → mood → visuals; artists → planets
  models/          Pydantic response models (the frontend contract)
  tests/
```

Routers never call Spotify directly. Services raise domain errors (`NotAuthenticatedError`, `SpotifyAPIError`, …) and `main.py` turns them into HTTP responses.

**Data modeling & API contracts**
- Every endpoint declares a `response_model`, so the OpenAPI docs at `/docs` are the frontend contract
- Responses are normalized for frontend consumption: snake_case, arrays of objects, raw Spotify fields removed
- Fields Spotify doesn't always return (popularity, followers, images) are optional

Spotify's Audio Features endpoints are deprecated for new apps (403), so Tuniverse builds on track metadata + artist genres instead of valence/energy/tempo.

## API (`/api/v1`)
| Endpoint | Description |
|---|---|
| `GET /health` | Health check |
| `GET /auth/login` | Redirects to Spotify login |
| `GET /auth/callback` | OAuth callback — creates the session, then redirects to the frontend (or returns JSON in backend-only mode) |
| `POST /auth/logout` | Ends the session |
| `GET /spotify/me` | Current user profile |
| `GET /spotify/top-artists` | Top artists (`time_range`, `limit` 1–50) |
| `GET /spotify/top-tracks` | Top tracks (`time_range`, `limit` 1–50) |
| `GET /spotify/galaxy` | Planets (artists) with moons (tracks) |
| `GET /spotify/mood` | Mood distribution, top genres, visual identity |
| `GET /spotify/track-insights` | Track details with album info |

## Setup & Installation

### Backend
```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r ../requirements-dev.txt
cp .env.example .env   # then fill in your Spotify app credentials
.venv/bin/uvicorn main:app --port 8000
```

Then open http://127.0.0.1:8000/api/v1/auth/login to log in, and http://127.0.0.1:8000/docs to try the endpoints.

Use `127.0.0.1`, not `localhost` — it must match the Spotify redirect URI. Sessions are in-memory unless `REDIS_URL` is set, so restarting the server logs you out.

### Tests
```bash
cd backend
.venv/bin/python -m pytest
```

### Deployment
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — the frontend proxies `/api` to the backend so the session cookie stays first-party.

## Roadmap
Phase 1 – Core Experience
- ✅ Complete backend API and data models
- Build interactive, space-themed frontend
- Deploy and launch Tuniverse (with a demo mode for visitors outside the Spotify app's allowlist)

Phase 2 – Intelligence Layer (Stretch Goal)
- Introduce machine learning for mood detection and pattern analysis
- Replace or augment rule-based transformers with learned models
- Preserve existing API contracts while enhancing insights
