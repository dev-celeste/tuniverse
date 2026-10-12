from collections import Counter
from services.spotify_client import SpotifyClient
from transformers.mood_visual_transformer import (
    analyze_mood_from_genres,
    transform_mood_to_visual_identity,
)
from models.spotify_models import (
    GalaxyResponse,
    MoodResponse,
    SpotifyUser,
    TopArtistsResponse,
    TopTracksResponse,
    TrackInsightsResponse,
)
from transformers.spotify_transformer import (
    extract_genres_from_artists,
    transform_artist,
    transform_top_artists_to_planets,
    transform_track,
    transform_user,
)

# Pull the max top tracks for the galaxy so most planets get some moons
GALAXY_MOON_TRACK_LIMIT = 50


def build_current_user_response(client: SpotifyClient) -> SpotifyUser:
    return transform_user(client.get_current_user())


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
        artists_with_genres=sum(1 for artist in top_artists.get("items", []) if artist.get("genres")),
    )


def build_track_insights(client: SpotifyClient, limit: int = 20) -> TrackInsightsResponse:
    top_tracks = client.get_top_tracks(limit=limit)
    tracks = [transform_track(track) for track in top_tracks.get("items", [])]

    return TrackInsightsResponse(tracks=tracks, total_tracks=len(tracks))

def build_galaxy_response(client: SpotifyClient, time_range: str = "medium_term", limit: int = 10) -> GalaxyResponse:
    """
    Fetches user's top artists (planets) and top tracks (moons) and transforms them
    into a visual 'galaxy' representation.
    """
    top_artists = client.get_top_artists(time_range=time_range, limit=limit)
    top_tracks = client.get_top_tracks(time_range=time_range, limit=GALAXY_MOON_TRACK_LIMIT)

    planets = transform_top_artists_to_planets(top_artists, top_tracks)
    return GalaxyResponse(time_range=time_range, total_planets=len(planets), planets=planets)


def build_top_artists_response(
    client: SpotifyClient,
    time_range: str = "medium_term",
    limit: int = 10,
) -> TopArtistsResponse:
    top_artists = client.get_top_artists(time_range=time_range, limit=limit)
    artists = [transform_artist(artist) for artist in top_artists.get("items", [])]

    return TopArtistsResponse(time_range=time_range, total=len(artists), artists=artists)


def build_top_tracks_response(
    client: SpotifyClient,
    time_range: str = "medium_term",
    limit: int = 10,
) -> TopTracksResponse:
    top_tracks = client.get_top_tracks(time_range=time_range, limit=limit)
    tracks = [transform_track(track) for track in top_tracks.get("items", [])]

    return TopTracksResponse(time_range=time_range, total=len(tracks), tracks=tracks)
