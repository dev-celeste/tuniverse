import pytest

from transformers.mood_visual_transformer import (
    MOOD_VISUAL_IDENTITY,
    GENRE_MOOD_MAP,
    UNCHARTED,
    analyze_mood_from_genres,
    mood_for_genre,
)


@pytest.mark.parametrize("genre, mood, weight", [
    ("metalcore", "Aggressive", 1.5),  # most specific key, not metal + metalcore
    ("alt metal", "Aggressive", 1.2),
    ("post-hardcore", "Intense", 1.3),
    ("k-pop", "Upbeat", 1.0),
    ("trap", "Confident", 1.2),
    ("scrapcore", "Uncharted", 0.5),  # "rap" must match as a whole word only
    ("classical", "Calm", 1.4),
    # Added for real-world genres that used to fall through
    ("reggaeton", "Fiery", 1.4),
    ("trap latino", "Fiery", 1.3),  # more specific than "trap"
    ("latin pop", "Fiery", 1.2),  # more specific than "pop"
    ("tech house", "Euphoric", 1.4),
    ("french house", "Euphoric", 1.3),
    ("edm", "Euphoric", 1.3),
    ("lo-fi hip hop", "Calm", 1.2),  # more specific than "hip hop"
    ("jazz beats", "Calm", 1.1),
    ("screamo", "Intense", 1.3),
    ("emo", "Intense", 1.2),
    ("post-grunge", "Intense", 1.1),
    ("rock", "Confident", 0.8),
    ("hard rock", "Aggressive", 1.1),  # more specific than "rock"
    ("rap metal", "Aggressive", 1.2),  # "metal" is longer than "rap"
])
def test_mood_for_genre(genre, mood, weight):
    assert mood_for_genre(genre) == (mood, weight)


def test_each_genre_counts_once():
    distribution, dominant = analyze_mood_from_genres(["metalcore", "dance pop"])

    # 1.5 vs 1.2 — metalcore isn't double-counted as metal too
    assert distribution == {"Aggressive": 55.56, "Upbeat": 44.44}
    assert dominant == "Aggressive"


def test_no_genres_is_uncharted():
    assert analyze_mood_from_genres([]) == ({}, "Uncharted")


def test_unmatched_genres_never_outvote_a_match():
    # Three unmapped genres outweigh one hip hop (1.5 vs 1.2) but still lose
    distribution, dominant = analyze_mood_from_genres(["hip hop", "zydeco", "polka", "yodel"])

    assert dominant == "Confident"
    # They still show up in the mix
    assert distribution[UNCHARTED] == 55.56


def test_only_unmatched_genres_is_uncharted():
    assert analyze_mood_from_genres(["zydeco", "polka"])[1] == UNCHARTED


def test_every_mood_has_a_palette():
    moods = {mood for mood, _ in GENRE_MOOD_MAP.values()} | {UNCHARTED}

    assert moods <= set(MOOD_VISUAL_IDENTITY)
