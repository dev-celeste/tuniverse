import re
from collections import Counter

# Artists whose genres match no rule, or who have no genres at all on Spotify
UNCHARTED = "Uncharted"

GENRE_MOOD_MAP = {
    "metal": ("Aggressive", 1.2),
    "metalcore": ("Aggressive", 1.5),
    "deathcore": ("Aggressive", 1.5),
    "hard rock": ("Aggressive", 1.1),

    "punk": ("Intense", 1.1),
    "hardcore": ("Intense", 1.3),
    "emo": ("Intense", 1.2),
    "screamo": ("Intense", 1.3),
    "grunge": ("Intense", 1.1),
    "post-grunge": ("Intense", 1.1),
    "math rock": ("Intense", 1.1),
    "industrial": ("Intense", 1.2),
    "dubstep": ("Intense", 1.3),
    "drum and bass": ("Intense", 1.2),

    "pop": ("Upbeat", 1.0),
    "dance": ("Upbeat", 1.2),

    "house": ("Euphoric", 1.3),
    "tech house": ("Euphoric", 1.4),
    "french house": ("Euphoric", 1.3),
    "electronic": ("Euphoric", 1.2),
    "electro": ("Euphoric", 1.2),
    "edm": ("Euphoric", 1.3),
    "techno": ("Euphoric", 1.4),
    "trance": ("Euphoric", 1.4),

    "reggaeton": ("Fiery", 1.4),
    "latin": ("Fiery", 1.2),
    "latin pop": ("Fiery", 1.2),
    "urbano latino": ("Fiery", 1.3),
    "trap latino": ("Fiery", 1.3),
    "dembow": ("Fiery", 1.3),
    "salsa": ("Fiery", 1.2),
    "bachata": ("Fiery", 1.2),
    "cumbia": ("Fiery", 1.2),
    "regional mexican": ("Fiery", 1.2),

    "indie": ("Reflective", 1.1),
    "folk": ("Reflective", 1.0),

    "hip hop": ("Confident", 1.2),
    "rap": ("Confident", 1.2),
    "trap": ("Confident", 1.2),
    # Broad labels weigh less, so a more specific genre on the same artist wins
    "rock": ("Confident", 0.8),
    "alternative rock": ("Confident", 0.9),

    "ambient": ("Calm", 1.3),
    "classical": ("Calm", 1.4),
    "lo-fi": ("Calm", 1.2),
    "lo-fi beats": ("Calm", 1.2),
    "lo-fi hip hop": ("Calm", 1.2),
    "jazz beats": ("Calm", 1.1),
    "chillhop": ("Calm", 1.2),
    "jazz": ("Calm", 1.0),
}

# Longest keys first, so "metalcore" wins over "metal", "hard rock" over "rock",
# and "lo-fi hip hop" over "hip hop"
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
        "Euphoric": {
            "primary_color": "#6E6BFF",     # electric indigo
            "secondary_color": "#120F3D",
            "accent_color": "#7CF6FF",
            "planet_glow_intensity": 0.8,
            "background_style": "pulsar",
        },
        "Fiery": {
            "primary_color": "#FF8A3D",     # orange
            "secondary_color": "#4A1A0A",
            "accent_color": "#FFD3A8",
            "planet_glow_intensity": 0.85,
            "background_style": "solarFlare",
        },
        "Calm": {
            "primary_color": "#80FFDB",     # aqua
            "secondary_color": "#0B1D3A",
            "accent_color": "#B8F2E6",
            "planet_glow_intensity": 0.45,
            "background_style": "aurora",
        },
        UNCHARTED: {
            "primary_color": "#C7D2E4",     # icy silver
            "secondary_color": "#2A3142",
            "accent_color": "#E8EEF8",
            "planet_glow_intensity": 0.4,
            "background_style": "cosmicFog",
        },
    }

DEFAULT_VISUAL_IDENTITY = MOOD_VISUAL_IDENTITY[UNCHARTED]



def mood_for_genre(genre: str) -> tuple[str, float]:
    """
    Each genre maps to exactly one mood: its most specific (longest) whole-word match,
    e.g. "metalcore" → metalcore (not metal + metalcore), "k-pop" → pop.
    """
    for pattern, mood, weight in _GENRE_PATTERNS:
        if pattern.search(genre):
            return mood, weight
    return UNCHARTED, UNMATCHED_GENRE_WEIGHT


def analyze_mood_from_genres(genres: list[str]):
    mood_scores = Counter()

    for genre in genres:
        mood, weight = mood_for_genre(genre)
        mood_scores[mood] += weight

    # No genre data at all (new account, or artists Spotify hasn't tagged)
    if not mood_scores:
        return {}, UNCHARTED

    total = sum(mood_scores.values())

    mood_distribution = {
        mood: round((score / total) * 100, 2)
        for mood, score in mood_scores.items()
    }

    # Unmatched genres still show in the mix, but never outvote a real match: an artist with
    # "metalcore" plus three unmapped genres is Aggressive, not Uncharted
    charted = {mood: score for mood, score in mood_scores.items() if mood != UNCHARTED}
    dominant_mood = max(charted, key=charted.get) if charted else UNCHARTED

    return mood_distribution, dominant_mood



def transform_mood_to_visual_identity(dominant_mood: str):
    return MOOD_VISUAL_IDENTITY.get(
        dominant_mood,
        DEFAULT_VISUAL_IDENTITY,
    )

