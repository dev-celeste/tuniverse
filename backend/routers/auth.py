from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
import os
import urllib.parse
import base64
import requests

router = APIRouter(prefix="/auth", tags=["auth"])

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

ACCESS_TOKEN_STORE = {}

# ✅ Explicit scope list (Spotify is picky)
SCOPES = [
    "user-top-read",
    "user-library-read",
]

@router.get("/login")
def spotify_login():
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")

    if not client_id or not redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI",
        )

    scope_str = " ".join(SCOPES)

    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": scope_str,
        "show_dialog": "true",
    }

    # ✅ Proper URL encoding (prevents illegal_scope)
    auth_url = f"{SPOTIFY_AUTH_URL}?{urllib.parse.urlencode(params)}"

    return RedirectResponse(auth_url)


@router.get("/callback")
def spotify_callback(code: str):
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")

    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="Spotify environment variables are not fully set",
        )

    auth_header = base64.b64encode(
        f"{client_id}:{client_secret}".encode()
    ).decode()

    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }

    response = requests.post(
        SPOTIFY_TOKEN_URL,
        headers=headers,
        data=data,
    )

    if response.status_code != 200:
        print("Spotify token error:", response.text)
        raise HTTPException(
            status_code=400,
            detail="Failed to retrieve Spotify access token",
        )

    token_data = response.json()

    # ✅ Store tokens
    ACCESS_TOKEN_STORE["access_token"] = token_data.get("access_token")
    ACCESS_TOKEN_STORE["refresh_token"] = token_data.get("refresh_token")

    return {
        "access_token_received": "access_token" in token_data,
        "refresh_token_received": "refresh_token" in token_data,
        "token_type": token_data.get("token_type"),
        "expires_in": token_data.get("expires_in"),
        "scopes": token_data.get("scope"),
    }
