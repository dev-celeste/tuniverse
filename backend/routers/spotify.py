from fastapi import APIRouter, HTTPException
from transformers.spotify_transformer import transform_top_artists_to_planets
from transformers.spotify_transformer import transform_top_artists_to_mood


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
def get_music_mood(
    limit: int = 20,
    time_range: str = "medium_term",
):
    """
    Returns a genre-based mood analysis of the user's music taste.
    Uses the user's top artists instead of deprecated audio features.
    """

    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()

    # Fetch user's top artists
    artists_response = spotify_client.get(
        "/me/top/artists",
        params={
            "limit": limit,
            "time_range": time_range,
        },
    )

    artists = artists_response.get("items", [])

    if not artists:
        return {
            "message": "No top artists found",
            "reason": "Spotify returned an empty artist list",
        }

    return transform_top_artists_to_mood(artists)





@router.get("/mood-test")
def test_mood_tracks(batch_size: int = 50):
    """
    Test endpoint to check how many saved tracks are restricted vs usable.
    Fetches `batch_size` saved tracks from the user's library.
    """
    access_token = ACCESS_TOKEN_STORE.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify_client = SpotifyClient()

    # Step 1: Fetch saved tracks
    saved_tracks_response = spotify_client.get("/me/tracks", params={"limit": batch_size})
    saved_tracks = saved_tracks_response.get("items", [])

    if not saved_tracks:
        return {"message": "No saved tracks found in your library."}

    # Step 2: Extract track IDs (ignore local tracks)
    track_ids = [
        item["track"]["id"]
        for item in saved_tracks
        if item["track"]["id"] and not item["track"].get("is_local")
    ]

    print("Track IDs fetched:", track_ids)

    # Step 3: Fetch audio features, skipping restricted tracks
    audio_features_result = spotify_client.get_audio_features(track_ids)
    usable_tracks = [
        feature["id"] for feature in audio_features_result.get("audio_features", [])
        if feature
    ]
    restricted_count = len(track_ids) - len(usable_tracks)

    # Step 4: Return summary
    return {
        "total_tracks_fetched": len(track_ids),
        "restricted_tracks_skipped": restricted_count,
        "usable_tracks_count": len(usable_tracks),
        "usable_track_ids_sample": usable_tracks[:10],  # sample of first 10 usable tracks
    }