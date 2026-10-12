import os
from typing import Optional

# Read lazily (not at import time) so values from .env are picked up after main.py loads it

DEFAULT_CORS_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173"


def frontend_url() -> Optional[str]:
    """
    Where to send the browser after Spotify login. Unset = backend-only mode
    (callback returns JSON instead of redirecting).
    """
    url = os.getenv("FRONTEND_URL")
    return url.rstrip("/") if url else None


def cors_origins() -> list[str]:
    """
    Only needed when the frontend calls the API cross-origin. With the Vite dev proxy
    (and a same-site proxy in production) requests are same-origin and CORS doesn't apply.
    """
    raw = os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def cookie_secure() -> bool:
    """Secure cookies need HTTPS — off for local http://127.0.0.1, on in production."""
    return os.getenv("COOKIE_SECURE", "false").lower() == "true"
