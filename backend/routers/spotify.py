from fastapi import APIRouter, HTTPException
from transformers.spotify_transformer import transform_top_artists_to_planets
from transformers.spotify_transformer import extract_genres_from_artists
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
    if not ACCESS_TOKEN_STORE.get("access_token"):
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()

    # 1. Fetch top artists
    top_artists = spotify_client.get_top_artists(limit=limit)

    # 2. Extract genres
    genres = extract_genres_from_artists(top_artists)

    # 3. Analyze mood
    mood_distribution, dominant_mood = analyze_mood_from_genres(genres)

    # 4. Visual identity
    visual_identity = transform_mood_to_visual_identity(dominant_mood)

    return {
    "meta": {
        "artists_analyzed": len(top_artists.get("items", [])),
        "genres_analyzed": len(genres),
    },
    "genres": {
        "top": Counter(genres).most_common(10),
    },
    "mood": {
        "dominant": dominant_mood,
        "distribution": mood_distribution,
    },
    "visual_identity": visual_identity,
}
