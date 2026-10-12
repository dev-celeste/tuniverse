from fastapi import APIRouter, Depends, Query

from services.spotify_client import SpotifyClient
from services.spotify_service import build_current_user_response, build_mood_response, build_track_insights, build_galaxy_response, build_top_artists_response, build_top_tracks_response
from models.spotify_models import (
    GalaxyResponse,
    MoodResponse,
    SpotifyUser,
    TimeRange,
    TopArtistsResponse,
    TopTracksResponse,
    TrackInsightsResponse,
)


router = APIRouter(
    prefix="/spotify",
    tags=["Spotify"],
)


def get_spotify_client() -> SpotifyClient:
    """Dependency so tests (and later, per-session auth) can swap the client."""
    return SpotifyClient()


@router.get("/me", response_model=SpotifyUser)
def get_current_user(client: SpotifyClient = Depends(get_spotify_client)):
    return build_current_user_response(client)


@router.get("/top-artists", response_model=TopArtistsResponse)
def get_top_artists(
    time_range: TimeRange = "medium_term",
    limit: int = Query(10, ge=1, le=50),
    client: SpotifyClient = Depends(get_spotify_client),
):
    return build_top_artists_response(client, time_range=time_range, limit=limit)


@router.get("/top-tracks", response_model=TopTracksResponse)
def get_top_tracks(
    time_range: TimeRange = "medium_term",
    limit: int = Query(10, ge=1, le=50),
    client: SpotifyClient = Depends(get_spotify_client),
):
    return build_top_tracks_response(client, time_range=time_range, limit=limit)


@router.get("/galaxy", response_model=GalaxyResponse)
def get_music_galaxy(
    time_range: TimeRange = "medium_term",
    limit: int = Query(10, ge=1, le=50),
    client: SpotifyClient = Depends(get_spotify_client),
):
    return build_galaxy_response(client, time_range=time_range, limit=limit)


@router.get("/mood", response_model=MoodResponse)
def get_music_mood(
    limit: int = Query(20, ge=1, le=50),
    client: SpotifyClient = Depends(get_spotify_client),
):
    return build_mood_response(client, limit=limit)


@router.get("/track-insights", response_model=TrackInsightsResponse)
def get_track_insights(
    limit: int = Query(20, ge=1, le=50),
    client: SpotifyClient = Depends(get_spotify_client),
):
    return build_track_insights(client, limit=limit)
