from fastapi import APIRouter, HTTPException
from collections import Counter

from services.spotify_client import SpotifyClient
from routers.auth import ACCESS_TOKEN_STORE

from transformers.spotify_transformer import transform_top_artists_to_planets
from transformers.mood_visual_transformer import analyze_mood_from_genres, transform_mood_to_visual_identity
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


@router.get("/mood", response_model=MoodResponse)
def get_music_mood(limit: int = 20):
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()
    top_artists = spotify_client.get_top_artists(limit=limit)

    # Collect genres from top artists
    genres = []
    for artist in top_artists.get("items", []):
        genres.extend(artist.get("genres", []))

    # Analyze mood 
    mood_distribution, dominant_mood = analyze_mood_from_genres(genres)

    # Map mood → visuals
    visual_identity = transform_mood_to_visual_identity(dominant_mood)

    raw_top_genres = Counter(genres).most_common(10)

    top_genres = [
        {"genre": genre, "count": count}
        for genre, count in raw_top_genres
    ]

    return MoodResponse(
        top_genres=top_genres,
        mood_distribution=mood_distribution or {},
        dominant_mood=dominant_mood or "Other",
        visual_identity=visual_identity,
        total_artists_analyzed=len(top_artists.get("items", [])) if top_artists else 0,
    )
