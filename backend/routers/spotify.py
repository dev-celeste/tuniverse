from fastapi import APIRouter, HTTPException
from transformers.spotify_transformer import transform_top_artists_to_planets
from transformers.mood_visual_transformer import transform_mood_to_visual_identity
from transformers.mood_visual_transformer import analyze_mood_from_genres
from collections import Counter


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
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()
    top_artists = spotify_client.get_top_artists(limit=limit)

    # Extract all genres
    genres = []
    for artist in top_artists.get("items", []):
        genres.extend(artist.get("genres", []))

    # Run transformer
    mood_distribution, dominant_mood = analyze_mood_from_genres(genres)
    visual_identity = transform_mood_to_visual_identity(dominant_mood)

    # Build response
    return {
        "top_genres": Counter(genres).most_common(10),
        "mood_distribution": mood_distribution,
        "dominant_mood": dominant_mood,
        "visual_identity": visual_identity,
        "total_artists_analyzed": len(top_artists.get("items", [])),
    }

