from pydantic import BaseModel
from typing import Dict, List, Tuple


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
    visual_identity: dict[str, str | float]
    total_artists_analyzed: int

