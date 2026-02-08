from fastapi import APIRouter, HTTPException

from services.spotify_client import SpotifyClient
from services.spotify_service import build_mood_response
from routers.auth import ACCESS_TOKEN_STORE

from transformers.spotify_transformer import transform_top_artists_to_planets
from models.spotify_models import MoodResponse




router = APIRouter(
    prefix="/spotify",
    tags=["Spotify"],
)


@router.get("/me")
def get_current_user():
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient(access_token=access_token)
    return spotify_client.get_current_user()


@router.get("/top-artists")
def get_top_artists(
    time_range: str = "medium_term",
    limit: int = 10,
):
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient(access_token=access_token)
    return spotify_client.get_top_artists(time_range, limit)


@router.get("/top-tracks")
def get_top_tracks(
    time_range: str = "medium_term",
    limit: int = 10,
):
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient(access_token=access_token)
    return spotify_client.get_top_tracks(time_range, limit)


@router.get("/galaxy")
def get_music_galaxy(
    time_range: str = "medium_term",
    limit: int = 10,
):
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient(access_token=access_token)
    raw_artists = spotify_client.get_top_artists(time_range, limit)

    return transform_top_artists_to_planets(raw_artists)



@router.get("/mood", response_model=MoodResponse)
def get_music_mood(limit: int = 20):
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return build_mood_response(access_token=access_token, limit=limit)

