import base64
import os
import urllib.parse

import requests

from core.exceptions import SpotifyAuthError, SpotifyConfigError

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
REQUEST_TIMEOUT_SECONDS = 10

# ✅ Explicit scope list (Spotify is picky)
SCOPES = [
    "user-top-read",
    "user-library-read",
]


def build_authorize_url() -> str:
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")

    if not client_id or not redirect_uri:
        raise SpotifyConfigError("Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI")

    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": " ".join(SCOPES),
        "show_dialog": "true",
    }

    # ✅ Proper URL encoding (prevents illegal_scope)
    return f"{SPOTIFY_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(code: str) -> dict:
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")
    if not redirect_uri:
        raise SpotifyConfigError("Spotify environment variables are not fully set")

    return _request_token({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    })


def refresh_access_token(refresh_token: str) -> dict:
    return _request_token({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    })


def _request_token(data: dict) -> dict:
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise SpotifyConfigError("Spotify environment variables are not fully set")

    auth_header = base64.b64encode(
        f"{client_id}:{client_secret}".encode()
    ).decode()

    try:
        response = requests.post(
            SPOTIFY_TOKEN_URL,
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data=data,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as e:
        raise SpotifyAuthError(f"Could not reach Spotify accounts service: {e}") from e

    if response.status_code != 200:
        print(f"Spotify token error ({data['grant_type']}):", response.text)
        raise SpotifyAuthError(f"Spotify token request failed ({data['grant_type']})")

    return response.json()
