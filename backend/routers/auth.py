from fastapi import APIRouter
from fastapi.responses import RedirectResponse
import os
import urllib.parse
import base64
import requests


router = APIRouter(prefix="/auth", tags=["auth"])

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
ACCESS_TOKEN_STORE = {}


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
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")

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
        "https://accounts.spotify.com/api/token",
        headers=headers,
        data=data,
    )

    token_data = response.json()

    ACCESS_TOKEN_STORE["access_token"] = token_data.get("access_token")

    return {
        "access_token_received": "access_token" in token_data,
        "refresh_token_received": "refresh_token" in token_data,
        "token_type": token_data.get("token_type"),
        "expires_in": token_data.get("expires_in"),
    }