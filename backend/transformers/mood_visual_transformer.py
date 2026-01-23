from collections import Counter

GENRE_MOOD_MAP = {
    "metal": ("Aggressive", 1.2),
    "metalcore": ("Aggressive", 1.5),
    "deathcore": ("Aggressive", 1.5),
    "hard rock": ("Aggressive", 1.1),

    "pop": ("Upbeat", 1.0),
    "dance": ("Upbeat", 1.2),
    "edm": ("Upbeat", 1.3),

    "indie": ("Reflective", 1.1),
    "folk": ("Reflective", 1.0),

    "hip hop": ("Confident", 1.2),
    "rap": ("Confident", 1.2),

    "ambient": ("Calm", 1.3),
    "classical": ("Calm", 1.4),
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

DEFAULT_VISUAL_IDENTITY = MOOD_VISUAL_IDENTITY["Other"]



def analyze_mood_from_genres(genres: list[str]):
    mood_scores = Counter()

    for genre in genres:
        matched = False
        for key, (mood, weight) in GENRE_MOOD_MAP.items():
            if key in genre:
                mood_scores[mood] += weight
                matched = True

        if not matched:
            mood_scores["Other"] += 0.5

    total = sum(mood_scores.values()) or 1

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


def analyze_and_visualize_mood(genres: list[str]):
    """
    Single entry point for mood analysis.
    This is where ML can later replace heuristic logic.
    """
    mood_distribution, dominant_mood = analyze_mood_from_genres(genres)
    visual_identity = transform_mood_to_visual_identity(dominant_mood)

    return {
        "mood_distribution": mood_distribution,
        "dominant_mood": dominant_mood,
        "visual_identity": visual_identity,
    }
