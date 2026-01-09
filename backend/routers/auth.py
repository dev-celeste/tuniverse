from fastapi import APIRouter
from fastapi.responses import RedirectResponse
import os
import urllib.parse

router = APIRouter(prefix="/auth", tags=["auth"])

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"

@router.get("/login")
def spotify_login():
    params = {
        "client_id": os.getenv("SPOTIFY_CLIENT_ID"),
        "response_type": "code",
        "redirect_uri": os.getenv("SPOTIFY_REDIRECT_URI"),
        "scope": "user-top-read user-read-recently-played",
        "show_dialog": "true",
    }

    url = f"{SPOTIFY_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)

@router.get("/callback")
def spotify_callback(code: str):
    return {
        "message": "Authorization successful",
        "code_received": True,
        "code": code
    }