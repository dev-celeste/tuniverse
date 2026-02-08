from collections import Counter
from services.spotify_client import SpotifyClient
from transformers.mood_visual_transformer import (
    analyze_mood_from_genres,
    transform_mood_to_visual_identity,
)
from models.spotify_models import MoodResponse


def build_mood_response(access_token: str, limit: int = 20) -> MoodResponse:
    spotify_client = SpotifyClient(access_token=access_token)
    top_artists = spotify_client.get_top_artists(limit=limit)

    # Collect genres from top artists
    genres = []
    for artist in top_artists.get("items", []):
        genres.extend(artist.get("genres", []))

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
        total_artists_analyzed=len(top_artists.get("items", [])) if top_artists else 0,
    )


def build_track_insights(access_token: str, limit: int = 20):
    spotify_client = SpotifyClient(access_token=access_token)
    top_tracks = spotify_client.get_top_tracks(limit=limit)

    insights = []
    for track in top_tracks.get("items", []):
        insights.append({
            "id": track.get("id"),
            "name": track.get("name"),
            "album": {
                "name": track.get("album", {}).get("name"),
                "release_date": track.get("album", {}).get("release_date"),
                "image": track.get("album", {}).get("images", [{}])[0].get("url")
            },
            "artists": [artist.get("name") for artist in track.get("artists", [])],
            "popularity": track.get("popularity"),
            "spotify_url": track.get("external_urls", {}).get("spotify"),
        })

    return {"tracks": insights, "total_tracks": len(insights)}
