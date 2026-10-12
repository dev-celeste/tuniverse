from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Query

from core.exceptions import NotAuthenticatedError
from core.sessions import SESSION_COOKIE_NAME, get_session_store
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


def get_spotify_client(
    session_id: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
) -> SpotifyClient:
    """Builds a client for the caller's session; overridable in tests."""
    if not session_id:
        raise NotAuthenticatedError("No Spotify session found. Please log in first.")

    return SpotifyClient(session_id=session_id, store=get_session_store())


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
    time_range: TimeRange = "medium_term",
    limit: int = Query(20, ge=1, le=50),
    client: SpotifyClient = Depends(get_spotify_client),
):
    return build_mood_response(client, time_range=time_range, limit=limit)


@router.get("/track-insights", response_model=TrackInsightsResponse)
def get_track_insights(
    time_range: TimeRange = "medium_term",
    limit: int = Query(20, ge=1, le=50),
    client: SpotifyClient = Depends(get_spotify_client),
):
    return build_track_insights(client, time_range=time_range, limit=limit)
