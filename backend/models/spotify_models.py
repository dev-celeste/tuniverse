from pydantic import BaseModel
from typing import Dict, List, Tuple


class VisualIdentity(BaseModel):
    primary_color: str
    secondary_color: str
    accent_color: str
    planet_glow_intensity: float
    background_style: str


class MoodResponse(BaseModel):
    top_genres: List[Tuple[str, int]]
    mood_distribution: Dict[str, float]
    dominant_mood: str
    visual_identity: VisualIdentity
    total_artists_analyzed: int
