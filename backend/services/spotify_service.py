from collections import Counter
from services.spotify_client import SpotifyClient
from transformers.mood_visual_transformer import (
    analyze_mood_from_genres,
    transform_mood_to_visual_identity,
)
from models.spotify_models import MoodResponse
from transformers.spotify_transformer import (
    extract_genres_from_artists,
    transform_top_artists_to_planets,
)
from typing import Dict, Any


def build_mood_response(client: SpotifyClient, limit: int = 20) -> MoodResponse:
    top_artists = client.get_top_artists(limit=limit)

    # Collect genres from top artists
    genres = extract_genres_from_artists(top_artists)

    # Analyze mood
    mood_distribution, dominant_mood = analyze_mood_from_genres(genres)

    # Map mood → visuals
    visual_identity = transform_mood_to_visual_identity(dominant_mood)

    # Prepare top genres in the shape MoodResponse expects
    raw_top_genres = Counter(genres).most_common(10)
    top_genres = [{"genre": genre, "count": count} for genre, count in raw_top_genres]

    return MoodResponse(
        top_genres=top_genres,
        mood_distribution=mood_distribution or {},
        dominant_mood=dominant_mood or "Other",
        visual_identity=visual_identity,
        total_artists_analyzed=len(top_artists.get("items", [])),
    )


def build_track_insights(client: SpotifyClient, limit: int = 20):
    top_tracks = client.get_top_tracks(limit=limit)

    insights = []
    for track in top_tracks.get("items", []):
        album = track.get("album", {})
        images = album.get("images") or [{}]
        insights.append({
            "id": track.get("id"),
            "name": track.get("name"),
            "album": {
                "name": album.get("name"),
                "release_date": album.get("release_date"),
                "image": images[0].get("url"),
            },
            "artists": [artist.get("name") for artist in track.get("artists", [])],
            "popularity": track.get("popularity"),
            "spotify_url": track.get("external_urls", {}).get("spotify"),
        })

    return {"tracks": insights, "total_tracks": len(insights)}

def build_galaxy_response(client: SpotifyClient, time_range: str = "medium_term", limit: int = 10):
    """
    Fetches user's top artists and transforms them into a visual 'galaxy' representation.
    """
    top_artists = client.get_top_artists(time_range=time_range, limit=limit)

    return transform_top_artists_to_planets(top_artists)


def build_top_artists_response(
    client: SpotifyClient,
    time_range: str = "medium_term",
    limit: int = 10,
) -> Dict[str, Any]:
    return client.get_top_artists(time_range=time_range, limit=limit)


def build_top_tracks_response(
    client: SpotifyClient,
    time_range: str = "medium_term",
    limit: int = 10,
) -> Dict[str, Any]:
    return client.get_top_tracks(time_range=time_range, limit=limit)
