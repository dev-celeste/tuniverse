import re
from collections import Counter

GENRE_MOOD_MAP = {
    "metal": ("Aggressive", 1.2),
    "metalcore": ("Aggressive", 1.5),
    "deathcore": ("Aggressive", 1.5),
    "hard rock": ("Aggressive", 1.1),

    "punk": ("Intense", 1.1),
    "hardcore": ("Intense", 1.3),
    "industrial": ("Intense", 1.2),
    "dubstep": ("Intense", 1.3),
    "drum and bass": ("Intense", 1.2),

    "pop": ("Upbeat", 1.0),
    "dance": ("Upbeat", 1.2),
    "edm": ("Upbeat", 1.3),

    "indie": ("Reflective", 1.1),
    "folk": ("Reflective", 1.0),

    "hip hop": ("Confident", 1.2),
    "rap": ("Confident", 1.2),
    "trap": ("Confident", 1.2),

    "ambient": ("Calm", 1.3),
    "classical": ("Calm", 1.4),
}

# Longest keys first, so "metalcore" wins over "metal" and "hard rock" over "rock"
_GENRE_PATTERNS = [
    (re.compile(rf"\b{re.escape(key)}\b"), mood, weight)
    for key, (mood, weight) in sorted(GENRE_MOOD_MAP.items(), key=lambda item: -len(item[0]))
]

UNMATCHED_GENRE_WEIGHT = 0.5


MOOD_VISUAL_IDENTITY = {
        "Aggressive": {
            "primary_color": "#E63946",     # red
            "secondary_color": "#1D3557",   # dark blue
            "accent_color": "#99F67A",      # lime
            "planet_glow_intensity": 0.9,
            "background_style": "supernova",
        },
        "Intense": {
            "primary_color": "#8A2ECC",     # purple
            "secondary_color": "#1B0033",
            "accent_color": "#E0AAFF",
            "planet_glow_intensity": 0.8,
            "background_style": "vortex",
        },
        "Upbeat": {
            "primary_color": "#FFD166",     # yellow
            "secondary_color": "#EF476F",
            "accent_color": "#06D6A0",
            "planet_glow_intensity": 0.7,
            "background_style": "stardust",
        },
        "Confident": {
            "primary_color": "#30B8E6",     # blue
            "secondary_color": "#073B4C",
            "accent_color": "#443995",
            "planet_glow_intensity": 0.6,
            "background_style": "orbit",
        },
        "Reflective": {
            "primary_color": "#EF8DC1",     # pink
            "secondary_color": "#F93070",
            "accent_color": "#EAEAEA",
            "planet_glow_intensity": 0.5,
            "background_style": "deepSpace",
        },
        "Calm": {
            "primary_color": "#80FFDB",     # aqua
            "secondary_color": "#0B1D3A",
            "accent_color": "#B8F2E6",
            "planet_glow_intensity": 0.45,
            "background_style": "aurora",
        },
        "Other": {
            "primary_color": "#ADB5BD",     # gray
            "secondary_color": "#343A40",
            "accent_color": "#CED4DA",
            "planet_glow_intensity": 0.4,
            "background_style": "cosmicFog",
        },
    }

DEFAULT_VISUAL_IDENTITY = MOOD_VISUAL_IDENTITY["Other"]



def mood_for_genre(genre: str) -> tuple[str, float]:
    """
    Each genre maps to exactly one mood: its most specific (longest) whole-word match,
    e.g. "metalcore" → metalcore (not metal + metalcore), "k-pop" → pop.
    """
    for pattern, mood, weight in _GENRE_PATTERNS:
        if pattern.search(genre):
            return mood, weight
    return "Other", UNMATCHED_GENRE_WEIGHT


def analyze_mood_from_genres(genres: list[str]):
    mood_scores = Counter()

    for genre in genres:
        mood, weight = mood_for_genre(genre)
        mood_scores[mood] += weight

    # No genre data at all (new account, or artists Spotify hasn't tagged)
    if not mood_scores:
        return {}, "Other"

    total = sum(mood_scores.values())

    mood_distribution = {
        mood: round((score / total) * 100, 2)
        for mood, score in mood_scores.items()
    }

    dominant_mood = max(mood_scores, key=mood_scores.get)

    return mood_distribution, dominant_mood



def transform_mood_to_visual_identity(dominant_mood: str):
    return MOOD_VISUAL_IDENTITY.get(
        dominant_mood,
        DEFAULT_VISUAL_IDENTITY,
    )

