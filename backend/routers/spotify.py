from fastapi import APIRouter, HTTPException
from collections import Counter

from services.spotify_client import SpotifyClient
from routers.auth import ACCESS_TOKEN_STORE

from transformers.spotify_transformer import transform_top_artists_to_planets
from transformers.mood_visual_transformer import analyze_and_visualize_mood


router = APIRouter(
    prefix="/spotify",
    tags=["Spotify"],
)


@router.get("/me")
def get_current_user():
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()
    return spotify_client.get_current_user()


@router.get("/top-artists")
def get_top_artists(
    time_range: str = "medium_term",
    limit: int = 10,
):
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()
    return spotify_client.get_top_artists(time_range, limit)


@router.get("/top-tracks")
def get_top_tracks(
    time_range: str = "medium_term",
    limit: int = 10,
):
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()
    return spotify_client.get_top_tracks(time_range, limit)


@router.get("/galaxy")
def get_music_galaxy(
    time_range: str = "medium_term",
    limit: int = 10,
):
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()
    raw_artists = spotify_client.get_top_artists(time_range, limit)

    return transform_top_artists_to_planets(raw_artists)


@router.get("/mood")
def get_music_mood(limit: int = 20):
    """
    Analyzes the user's top artists and derives:
    - top genres
    - mood distribution
    - dominant mood
    - visual identity (frontend-ready)
    """
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()
    top_artists = spotify_client.get_top_artists(limit=limit)

    # Collect genres from top artists
    genres: list[str] = []
    for artist in top_artists.get("items", []):
        genres.extend(artist.get("genres", []))

    # Run unified mood + visual analysis
    mood_result = analyze_and_visualize_mood(genres)

    return {
        "top_genres": Counter(genres).most_common(10) if genres else [],
        "mood_distribution": mood_result["mood_distribution"],
        "dominant_mood": mood_result["dominant_mood"],
        "visual_identity": mood_result["visual_identity"],
        "total_artists_analyzed": len(top_artists.get("items", [])) if top_artists else 0,
    }
