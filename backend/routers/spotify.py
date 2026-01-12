from fastapi import APIRouter, HTTPException

from services.spotify_client import SpotifyClient
from routers.auth import ACCESS_TOKEN_STORE

router = APIRouter(
    prefix="/spotify",
    tags=["Spotify"],
)


@router.get("/me")
def get_current_user():
    access_token = ACCESS_TOKEN_STORE.get("access_token")

    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient(access_token)
    return spotify_client.get_current_user()
