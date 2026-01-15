from fastapi import APIRouter, HTTPException
from transformers.spotify_transformer import transform_top_artists_to_planets
from transformers.spotify_transformer import transform_audio_features_to_mood


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
    """
    Returns the mood analysis of a user's top saved tracks (Liked Songs).
    Only uses tracks the user has saved, avoiding restricted tracks.
    """
    access_token = ACCESS_TOKEN_STORE.get("access_token")

    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()

    # Fetch the user's saved tracks (Liked Songs)
    saved_tracks_response = spotify_client.get("/me/tracks", params={"limit": limit})
    saved_tracks = saved_tracks_response.get("items", [])

    # Filter out local or unavailable tracks
    track_ids = [
        item["track"]["id"]
        for item in saved_tracks
        if item["track"]["id"] and not item["track"].get("is_local")
    ]

    print("Track IDs sent to audio-features:", track_ids)

    if not track_ids:
        return {
            "message": "No eligible tracks found for mood analysis",
            "reason": "All saved tracks are local or restricted",
        }

    # Fetch audio features for the eligible tracks
    audio_features = spotify_client.get_audio_features(track_ids)

    if not audio_features.get("audio_features"):
        return {
            "message": "No audio features available",
            "reason": "Tracks may be restricted or unavailable",
        }

    return transform_audio_features_to_mood(audio_features)