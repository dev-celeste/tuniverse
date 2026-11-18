"""
The demo universe: sample listening data run through the real backend pipeline (planet
layout, moons, moods, genre rules), so the demo always matches what real users get.

Regenerate the frontend's copy after changing this file or the transformers:

    cd backend && .venv/bin/python -m demo.universe

tests/test_demo_universe.py fails if the committed JSON is out of date.
"""
import hashlib
import json
from pathlib import Path
from urllib.parse import quote

from services.spotify_service import (
    build_current_user_response,
    build_galaxy_response,
    build_mood_response,
    build_top_tracks_response,
)

OUTPUT_PATH = Path(__file__).resolve().parents[2] / "frontend" / "src" / "demo" / "demo-universe.json"

TIME_RANGES = ("short_term", "medium_term", "long_term")

# id: (name, genres, popularity, followers). Genres, popularity and followers are Spotify's own
# (November 2026); artists Spotify lists no genres for would be silver Uncharted planets
ARTISTS = {
    "bad-bunny": ("Bad Bunny", ["reggaeton", "trap latino", "latin", "urbano latino"], 98, 126_000_000),
    "the-beatles": ("The Beatles", ["classic rock", "psychedelic rock"], 86, 33_100_000),
    "kiss": ("KISS", ["glam rock", "glam metal", "hard rock", "rock", "classic rock"], 75, 12_400_000),
    "britney-spears": ("Britney Spears", ["pop"], 86, 20_500_000),
    "arctic-monkeys": ("Arctic Monkeys", ["indie", "garage rock"], 88, 36_300_000),
    "j-cole": ("J. Cole", ["rap"], 87, 29_300_000),
    "john-summit": ("John Summit", ["house", "tech house", "edm"], 78, 866_000),
    "my-chemical-romance": ("My Chemical Romance", ["emo", "pop punk"], 83, 11_600_000),
    "tame-impala": ("Tame Impala", ["neo-psychedelic", "indie"], 89, 12_400_000),
    "linkin-park": ("Linkin Park", ["nu metal", "rap metal", "rock", "alternative metal"], 92, 36_900_000),
    "ariana-grande": ("Ariana Grande", ["pop"], 95, 117_000_000),
    "led-zeppelin": ("Led Zeppelin", ["classic rock", "rock", "hard rock", "rock and roll"], 79, 17_300_000),
    "shakira": ("Shakira", ["latin pop"], 90, 47_100_000),
    "olivia-dean": ("Olivia Dean", ["pop soul"], 90, 5_600_000),
    # Only appear in top tracks: their stars have no planet
    "taylor-swift": ("Taylor Swift", [], 98, 167_000_000),
    "phoebe-bridgers": ("Phoebe Bridgers", [], 83, 3_700_000),
    "hozier": ("Hozier", [], 83, 9_800_000),
}

# Each period's top 10 artists, in rank order
TOP_ARTISTS = {
    "short_term": ["john-summit", "bad-bunny", "olivia-dean", "ariana-grande", "linkin-park", "tame-impala", "j-cole", "shakira", "arctic-monkeys", "my-chemical-romance"],
    "medium_term": ["arctic-monkeys", "tame-impala", "bad-bunny", "linkin-park", "ariana-grande", "j-cole", "my-chemical-romance", "john-summit", "the-beatles", "britney-spears"],
    "long_term": ["the-beatles", "linkin-park", "my-chemical-romance", "arctic-monkeys", "led-zeppelin", "britney-spears", "kiss", "tame-impala", "shakira", "j-cole"],
}

# artist id: [(title, seconds, release date)], from Spotify's catalog
TRACKS = {
    "bad-bunny": [("DtMF", 237, "2025-01-05"), ("BAILE INoLVIDABLE", 368, "2025-01-05"), ("Tití Me Preguntó", 244, "2022-05-06")],
    "the-beatles": [("Here Comes The Sun", 186, "1969-09-26"), ("Let It Be", 243, "1970-05-08")],
    "kiss": [("I Was Made For Lovin' You", 271, "1979-05-23"), ("Rock And Roll All Nite", 168, "1975-03-19")],
    "britney-spears": [("Toxic", 199, "2003-11-13"), ("...Baby One More Time", 211, "1999-01-12")],
    "arctic-monkeys": [("Do I Wanna Know?", 273, "2013-09-09"), ("505", 254, "2007-04-24"), ("I Wanna Be Yours", 184, "2013-09-09")],
    "j-cole": [("No Role Modelz", 293, "2014-12-09"), ("MIDDLE CHILD", 214, "2019-01-23")],
    "john-summit": [("Where You Are", 236, "2023-03-03"), ("Shiver", 234, "2024-02-14")],
    "my-chemical-romance": [("Welcome to the Black Parade", 311, "2006-10-20"), ("Helena", 205, "2004-06-08")],
    "tame-impala": [("The Less I Know The Better", 216, "2015-07-17"), ("Let It Happen", 468, "2015-07-17")],
    "linkin-park": [("In the End", 217, "2000-10-24"), ("Numb", 188, "2003-03-25"), ("The Emptiness Machine", 190, "2024-09-05")],
    "ariana-grande": [("we can't be friends (wait for your love)", 229, "2024-03-08"), ("7 rings", 179, "2019-02-08")],
    "led-zeppelin": [("Stairway to Heaven", 483, "1971-11-08"), ("Immigrant Song", 146, "1970-10-05")],
    "shakira": [("Hips Don't Lie", 220, "2006-02-28"), ("Whenever, Wherever", 196, "2001-11-13")],
    "olivia-dean": [("Man I Need", 184, "2025-08-15"), ("Dive", 201, "2023-03-28")],
    "taylor-swift": [("Cruel Summer", 178, "2019-08-23")],
    "phoebe-bridgers": [("Motion Sickness", 230, "2017-07-18")],
    "hozier": [("Too Sweet", 251, "2024-03-22")],
}
TRACKS_ONLY = ("taylor-swift", "phoebe-bridgers", "hozier")

USER = {"id": "demo", "display_name": "Demo Listener", "images": [], "external_urls": {}, "followers": {"total": 48}}


def _stable(text: str) -> float:
    """0–1 from a string, the same on every run (Python's hash() is randomized per process)."""
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def _search_url(query: str) -> str:
    return f"https://open.spotify.com/search/{quote(query)}"


def _raw_artist(artist_id: str) -> dict:
    name, genres, popularity, followers = ARTISTS[artist_id]
    return {
        "id": artist_id,
        "name": name,
        "genres": genres,
        "popularity": popularity,
        "followers": {"total": followers},
        "images": [],
        "external_urls": {"spotify": _search_url(name)},
    }


def _raw_track(artist_id: str, title: str, seconds: int, release_date: str) -> dict:
    artist_name = ARTISTS[artist_id][0]
    return {
        "id": f"{artist_id}--{title}".lower().replace(" ", "-"),
        "name": title,
        "artists": [{"id": artist_id, "name": artist_name}],
        "album": {"name": title, "release_date": release_date, "images": []},
        "popularity": 70,
        "duration_ms": seconds * 1000,
        "explicit": False,
        "external_urls": {"spotify": _search_url(f"{title} {artist_name}")},
    }


def _top_tracks(time_range: str) -> list[dict]:
    """
    Roughly follows artist rank, shuffled a little, plus a few tracks by artists outside the top 10.
    The #10 artist has no songs in the period's top tracks, so its planet has no moons (common
    in real galaxies, and a state the demo should show).
    """
    ranked = []
    for rank, artist_id in enumerate(TOP_ARTISTS[time_range][:-1], start=1):
        for title, seconds, date in TRACKS.get(artist_id, []):
            ranked.append((rank + _stable(title + time_range) * 5, _raw_track(artist_id, title, seconds, date)))
    for artist_id in TRACKS_ONLY:
        for title, seconds, date in TRACKS[artist_id]:
            ranked.append((3.5 + _stable(title + time_range) * 9, _raw_track(artist_id, title, seconds, date)))
    return [track for _, track in sorted(ranked, key=lambda pair: pair[0])]


class DemoSpotifyClient:
    """Stands in for SpotifyClient, answering like Spotify's API with the sample data."""

    def get_current_user(self):
        return USER

    def get_top_artists(self, time_range: str = "medium_term", limit: int = 10):
        return {"items": [_raw_artist(a) for a in TOP_ARTISTS[time_range][:limit]]}

    def get_top_tracks(self, time_range: str = "medium_term", limit: int = 10):
        return {"items": _top_tracks(time_range)[:limit]}


def build_demo_universe() -> dict:
    client = DemoSpotifyClient()
    return {
        "me": build_current_user_response(client).model_dump(mode="json"),
        "ranges": {
            time_range: {
                "galaxy": build_galaxy_response(client, time_range=time_range).model_dump(mode="json"),
                "top_tracks": build_top_tracks_response(client, time_range=time_range, limit=20).model_dump(mode="json"),
                "mood": build_mood_response(client, time_range=time_range).model_dump(mode="json"),
            }
            for time_range in TIME_RANGES
        },
    }


def render(universe: dict) -> str:
    return json.dumps(universe, indent=2, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    OUTPUT_PATH.write_text(render(build_demo_universe()), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")
