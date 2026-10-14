# Tuniverse design prototype

`tuniverse-galaxy.html` is the interactive design reference for the frontend: a single-file Three.js page running on sample data shaped like the backend API. The React + React Three Fiber app (Ticket 15 onward) rebuilds this experience against the real endpoints.

Open it directly in a browser, or serve the folder:

```bash
python3 -m http.server 8765 --directory docs/prototype
```

Then visit http://127.0.0.1:8765/tuniverse-galaxy.html.

## What's in it

| Element | Data | Endpoint |
|---|---|---|
| Start screen | Connect Spotify / demo entry, login error messages (preview with `#access_denied`, `#invalid_state`, `#token_exchange_failed`, `#not_invited`) | `/auth/login`, `?login_error=` from `/auth/callback` |
| Core (you) | Profile, galaxy stats, musical era from release dates | `/me`, `/top-tracks` |
| Planets | Top artists: rank → orbit, popularity → glow, genre mood → color; panel with photo, followers, genres | `/galaxy` |
| Moons | Top tracks attached to their artist's planet | `/galaxy` |
| Constellation | Top 20 tracks as one path from #1 to #20 | `/top-tracks` |
| Mood nebula | Wisps colored in proportion to the mood mix; panel with mix, top genres, palette | `/mood` |
| Time range | 4 weeks / 6 months / all time | `time_range` on every endpoint |

## Notes for the real build

- Genre → mood rules and mood palettes mirror `backend/transformers/mood_visual_transformer.py`.
- Artist photos and album art are placeholders here (the prototype can't load remote images); use `image_url` / `album_image_url` from the API.
- "Connect Spotify" should do a full-page redirect to `/api/v1/auth/login`.
- Spotify's development mode returns 403 on data requests for accounts that aren't allowlisted; route that to the `not_invited` message on the start screen.
- Very short viewports (e.g. phones in landscape) need their own layout; the header, range control and mood card overlap below roughly 350px of height.
