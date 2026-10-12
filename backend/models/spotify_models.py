from typing import Literal, Optional

from pydantic import BaseModel

TimeRange = Literal["short_term", "medium_term", "long_term"]

# Spotify omits or zeroes some fields (popularity, followers, images) depending on
# app access level and catalog data, so anything not guaranteed is Optional.


# -------------------------
# User
# -------------------------

class SpotifyUser(BaseModel):
    id: str
    display_name: Optional[str] = None
    image_url: Optional[str] = None
    profile_url: Optional[str] = None
    followers: Optional[int] = None


# -------------------------
# Artists & tracks
# -------------------------

class Artist(BaseModel):
    id: str
    name: str
    genres: list[str]
    popularity: Optional[int] = None
    followers: Optional[int] = None
    image_url: Optional[str] = None
    spotify_url: Optional[str] = None


class AlbumSummary(BaseModel):
    name: Optional[str] = None
    release_date: Optional[str] = None
    image_url: Optional[str] = None


class Track(BaseModel):
    id: str
    name: str
    artists: list[str]
    album: AlbumSummary
    popularity: Optional[int] = None
    duration_ms: Optional[int] = None
    explicit: bool = False
    spotify_url: Optional[str] = None


class TopArtistsResponse(BaseModel):
    time_range: TimeRange
    total: int
    artists: list[Artist]


class TopTracksResponse(BaseModel):
    time_range: TimeRange
    total: int
    tracks: list[Track]


class TrackInsightsResponse(BaseModel):
    total_tracks: int
    tracks: list[Track]


# -------------------------
# Galaxy
# -------------------------

class Moon(BaseModel):
    """One of the user's top tracks, orbiting the planet of its artist."""
    id: str
    name: str
    rank: int  # position in the user's top tracks
    popularity: Optional[int] = None
    duration_ms: Optional[int] = None
    album_image_url: Optional[str] = None
    spotify_url: Optional[str] = None


class Planet(BaseModel):
    """One of the user's top artists."""
    id: str
    name: str
    rank: int
    orbit_radius: int
    planet_size: int
    glow_intensity: float  # 0–1, from artist popularity
    image_url: Optional[str] = None
    genres: list[str]
    popularity: Optional[int] = None
    spotify_url: Optional[str] = None
    moons: list[Moon]


class GalaxyResponse(BaseModel):
    time_range: TimeRange
    total_planets: int
    planets: list[Planet]


# -------------------------
# Mood
# -------------------------

class VisualIdentity(BaseModel):
    primary_color: str
    secondary_color: str
    accent_color: str
    planet_glow_intensity: float
    background_style: str

class GenreCount(BaseModel):
    genre: str
    count: int


class MoodResponse(BaseModel):
    top_genres: list[GenreCount]
    mood_distribution: dict[str, float]
    dominant_mood: str
    visual_identity: VisualIdentity
    total_artists_analyzed: int
