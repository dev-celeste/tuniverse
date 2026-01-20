from collections import Counter
from typing import Dict, List

# -----------------------------
# Existing: Artists → Planets
# -----------------------------

def transform_top_artists_to_planets(spotify_response: dict):
    planets = []

    artists = spotify_response.get("items", [])

    for index, artist in enumerate(artists):
        planet = {
            "id": artist["id"],
            "name": artist["name"],
            "rank": index + 1,
            "orbit_radius": 100 + (index * 40),
            "planet_size": max(20, 100 - (index * 5)),
            "image_url": artist["images"][0]["url"] if artist["images"] else None,
            "genres": artist.get("genres", []),
        }

        planets.append(planet)

    return {
        "total_planets": len(planets),
        "planets": planets,
    }


# ---------------------------------------
# DEPRECATED: Audio Features → Mood
# (Spotify API no longer reliable)
# ---------------------------------------

def transform_audio_features_to_mood(audio_features_response: dict):
    """
    ⚠️ Deprecated: Spotify audio-features endpoint is no longer reliable.
    Kept for reference and possible future data sources.
    """
    features = audio_features_response.get("audio_features", [])
    valid_features = [f for f in features if f]

    if not valid_features:
        return {
            "energy": 0,
            "valence": 0,
            "danceability": 0,
            "tempo": 0,
        }

    count = len(valid_features)

    return {
        "energy": round(sum(f["energy"] for f in valid_features) / count, 2),
        "valence": round(sum(f["valence"] for f in valid_features) / count, 2),
        "danceability": round(sum(f["danceability"] for f in valid_features) / count, 2),
        "tempo": round(sum(f["tempo"] for f in valid_features) / count, 1),
    }


# ---------------------------------------
# NEW: Genres → Mood (Primary Mood Engine)
# ---------------------------------------

GENRE_MOOD_MAP = {
    "pop": "Upbeat",
    "dance": "Energetic",
    "edm": "Energetic",
    "house": "Energetic",
    "electronic": "Energetic",

    "hip hop": "Confident",
    "rap": "Confident",

    "r&b": "Chill",
    "soul": "Chill",
    "neo soul": "Chill",

    "indie": "Reflective",
    "alternative": "Reflective",

    "rock": "Intense",
    "metal": "Aggressive",

    "jazz": "Calm",
    "classical": "Calm",
    "ambient": "Peaceful",
    "lo-fi": "Peaceful",
}


def map_genre_to_mood(genre: str) -> str:
    genre_lower = genre.lower()
    for key, mood in GENRE_MOOD_MAP.items():
        if key in genre_lower:
            return mood
    return "Other"


def transform_top_artists_to_mood(artists: List[Dict]) -> Dict:
    genre_counter = Counter()
    mood_counter = Counter()

    for artist in artists:
        for genre in artist.get("genres", []):
            genre_counter[genre] += 1
            mood_counter[map_genre_to_mood(genre)] += 1

    total = sum(mood_counter.values())

    mood_distribution = {
        mood: round((count / total) * 100, 2)
        for mood, count in mood_counter.items()
        if total > 0
    }

    visual_identity = transform_mood_to_visual_identity(dominant_mood)

    return {
        "top_genres": top_genres,
        "mood_distribution": mood_distribution,
        "dominant_mood": dominant_mood,
        "visual_identity": visual_identity,
        "total_artists_analyzed": len(artists),
    }

