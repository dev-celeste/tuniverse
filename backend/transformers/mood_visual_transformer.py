from collections import Counter

GENRE_MOOD_MAP = {
    "metal": "Aggressive",
    "metalcore": "Aggressive",
    "deathcore": "Aggressive",
    "hard rock": "Aggressive",

    "pop": "Upbeat",
    "dance": "Upbeat",
    "edm": "Upbeat",

    "indie": "Reflective",
    "folk": "Reflective",

    "hip hop": "Confident",
    "rap": "Confident",

    "ambient": "Calm",
    "classical": "Calm",
}

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
        "Other": {
            "primary_color": "#ADB5BD",     # gray
            "secondary_color": "#343A40",
            "accent_color": "#CED4DA",
            "planet_glow_intensity": 0.4,
            "background_style": "cosmicFog",
        },
    }


def analyze_mood_from_genres(genres: list[str]):
    mood_counts = Counter()

    for genre in genres:
        matched = False
        for key, mood in GENRE_MOOD_MAP.items():
            if key in genre:
                mood_counts[mood] += 1
                matched = True
                break
        if not matched:
            mood_counts["Other"] += 1

    total = sum(mood_counts.values()) or 1

    mood_distribution = {
        mood: round((count / total) * 100, 2)
        for mood, count in mood_counts.items()
    }

    dominant_mood = max(mood_counts, key=mood_counts.get)

    return mood_distribution, dominant_mood


def transform_mood_to_visual_identity(dominant_mood: str):
    return MOOD_VISUAL_IDENTITY.get(
        dominant_mood,
        MOOD_VISUAL_IDENTITY["Other"],
    )