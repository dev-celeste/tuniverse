

def transform_mood_to_visual_identity(
    dominant_mood: str,
    top_genres: list[tuple[str, int]],
):
    """
    Converts mood + genre signals into a visual identity
    that the frontend can render consistently.
    """

    # Base palettes by mood
    mood_palettes = {
        "Aggressive": {
            "primary_color": "#8B0000",
            "secondary_color": "#1C1C1C",
            "accent_color": "#FF4500",
            "planet_glow_intensity": 0.9,
            "background_style": "nebulaStorm",
        },
        "Upbeat": {
            "primary_color": "#FFD166",
            "secondary_color": "#EF476F",
            "accent_color": "#06D6A0",
            "planet_glow_intensity": 0.8,
            "background_style": "solarBloom",
        },
        "Reflective": {
            "primary_color": "#5E60CE",
            "secondary_color": "#4EA8DE",
            "accent_color": "#80FFDB",
            "planet_glow_intensity": 0.5,
            "background_style": "deepSpace",
        },
        "Confident": {
            "primary_color": "#FFD60A",
            "secondary_color": "#003566",
            "accent_color": "#FFC300",
            "planet_glow_intensity": 0.7,
            "background_style": "stellarRise",
        },
        "Other": {
            "primary_color": "#ADB5BD",
            "secondary_color": "#343A40",
            "accent_color": "#CED4DA",
            "planet_glow_intensity": 0.4,
            "background_style": "cosmicFog",
        },
    }

    visual_identity = mood_palettes.get(
        dominant_mood, mood_palettes["Other"]
    ).copy()

    # Optional genre-based tweaks (small, safe modifiers)
    top_genre_names = {genre for genre, _ in top_genres}

    if {"metal", "metalcore", "deathcore"} & top_genre_names:
        visual_identity["planet_glow_intensity"] = min(
            visual_identity["planet_glow_intensity"] + 0.1, 1.0
        )

    if {"pop", "dance", "edm"} & top_genre_names:
        visual_identity["accent_color"] = "#FFEE32"

    return visual_identity
