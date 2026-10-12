from typing import Optional

from transformers.mood_visual_transformer import (
    analyze_mood_from_genres,
    transform_mood_to_visual_identity,
)
from models.spotify_models import (
    AlbumSummary,
    Artist,
    Moon,
    Planet,
    SpotifyUser,
    Track,
)

DEFAULT_GLOW_INTENSITY = 0.5


def _first_image_url(images: Optional[list]) -> Optional[str]:
    return images[0].get("url") if images else None


# -------------------------
# Raw Spotify payload → slim models
# -------------------------

def transform_user(raw: dict) -> SpotifyUser:
    return SpotifyUser(
        id=raw["id"],
        display_name=raw.get("display_name"),
        image_url=_first_image_url(raw.get("images")),
        profile_url=raw.get("external_urls", {}).get("spotify"),
        followers=(raw.get("followers") or {}).get("total"),
    )


def transform_artist(raw: dict) -> Artist:
    return Artist(
        id=raw["id"],
        name=raw["name"],
        genres=raw.get("genres", []),
        popularity=raw.get("popularity"),
        followers=(raw.get("followers") or {}).get("total"),
        image_url=_first_image_url(raw.get("images")),
        spotify_url=raw.get("external_urls", {}).get("spotify"),
    )


def transform_track(raw: dict) -> Track:
    album = raw.get("album", {})
    return Track(
        id=raw["id"],
        name=raw["name"],
        artists=[artist.get("name") for artist in raw.get("artists", [])],
        album=AlbumSummary(
            name=album.get("name"),
            release_date=album.get("release_date"),
            image_url=_first_image_url(album.get("images")),
        ),
        popularity=raw.get("popularity"),
        duration_ms=raw.get("duration_ms"),
        explicit=raw.get("explicit", False),
        spotify_url=raw.get("external_urls", {}).get("spotify"),
    )


# -------------------------
# Galaxy mapping
# -------------------------

def _glow_from_popularity(popularity: Optional[int]) -> float:
    if popularity is None:
        return DEFAULT_GLOW_INTENSITY
    return round(min(max(popularity / 100, 0.0), 1.0), 2)


def transform_top_artists_to_planets(
    top_artists: dict,
    top_tracks: Optional[dict] = None,
) -> list[Planet]:
    """
    Each top artist becomes a planet; each top track becomes a moon of the first
    of its artists that is a planet. Tracks by artists outside the galaxy are dropped.
    """
    planets = []
    planets_by_artist_id = {}

    for index, artist in enumerate(top_artists.get("items", [])):
        _, mood = analyze_mood_from_genres(artist.get("genres", []))
        planet = Planet(
            id=artist["id"],
            name=artist["name"],
            rank=index + 1,
            orbit_radius=100 + (index * 40),
            planet_size=max(20, 100 - (index * 5)),
            glow_intensity=_glow_from_popularity(artist.get("popularity")),
            mood=mood,
            color=transform_mood_to_visual_identity(mood)["primary_color"],
            image_url=_first_image_url(artist.get("images")),
            genres=artist.get("genres", []),
            popularity=artist.get("popularity"),
            spotify_url=artist.get("external_urls", {}).get("spotify"),
            moons=[],
        )
        planets.append(planet)
        planets_by_artist_id[planet.id] = planet

    for index, track in enumerate((top_tracks or {}).get("items", [])):
        planet = next(
            (planets_by_artist_id[a["id"]] for a in track.get("artists", []) if a.get("id") in planets_by_artist_id),
            None,
        )
        if planet is None:
            continue

        planet.moons.append(Moon(
            id=track["id"],
            name=track["name"],
            rank=index + 1,
            popularity=track.get("popularity"),
            duration_ms=track.get("duration_ms"),
            album_image_url=_first_image_url(track.get("album", {}).get("images")),
            spotify_url=track.get("external_urls", {}).get("spotify"),
        ))

    return planets


def extract_genres_from_artists(spotify_response: dict):
    """
    Extracts a flat list of genres from top artists
    """
    artists = spotify_response.get("items", [])
    genres = []

    for artist in artists:
        genres.extend(artist.get("genres", []))

    return genres
