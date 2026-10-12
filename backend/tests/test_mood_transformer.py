import pytest

from transformers.mood_visual_transformer import (
    MOOD_VISUAL_IDENTITY,
    GENRE_MOOD_MAP,
    analyze_mood_from_genres,
    mood_for_genre,
)


@pytest.mark.parametrize("genre, mood, weight", [
    ("metalcore", "Aggressive", 1.5),  # most specific key, not metal + metalcore
    ("alt metal", "Aggressive", 1.2),
    ("post-hardcore", "Intense", 1.3),
    ("k-pop", "Upbeat", 1.0),
    ("trap", "Confident", 1.2),
    ("scrapcore", "Other", 0.5),  # "rap" must match as a whole word only
    ("classical", "Calm", 1.4),
])
def test_mood_for_genre(genre, mood, weight):
    assert mood_for_genre(genre) == (mood, weight)


def test_each_genre_counts_once():
    distribution, dominant = analyze_mood_from_genres(["metalcore", "dance pop"])

    # 1.5 vs 1.2 — metalcore isn't double-counted as metal too
    assert distribution == {"Aggressive": 55.56, "Upbeat": 44.44}
    assert dominant == "Aggressive"


def test_no_genres_is_other():
    assert analyze_mood_from_genres([]) == ({}, "Other")


def test_every_mood_has_a_palette():
    moods = {mood for mood, _ in GENRE_MOOD_MAP.values()} | {"Other"}

    assert moods <= set(MOOD_VISUAL_IDENTITY)
