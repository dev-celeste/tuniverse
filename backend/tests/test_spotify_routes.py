import pytest
from fastapi.testclient import TestClient

from core.exceptions import NotAuthenticatedError
from main import app
from routers.spotify import get_spotify_client


def raw_track(track_id, name, artist_ids, popularity=50, images=None):
    return {
        "id": track_id,
        "name": name,
        "album": {"name": "Album", "release_date": "2024-01-01", "images": images or [], "available_markets": ["US"]},
        "artists": [{"id": a, "name": a.upper()} for a in artist_ids],
        "popularity": popularity,
        "duration_ms": 200000,
        "explicit": True,
        "external_urls": {"spotify": f"https://open.spotify.com/track/{track_id}"},
        "available_markets": ["US", "GB"],
    }


class FakeSpotifyClient:
    time_ranges_requested = []

    def get_current_user(self):
        return {
            "id": "me",
            "display_name": "Celeste",
            "images": [{"url": "avatar"}],
            "external_urls": {"spotify": "https://open.spotify.com/user/me"},
            "followers": {"href": None, "total": 12},
            "uri": "spotify:user:me",
        }

    def get_top_artists(self, time_range="medium_term", limit=10):
        self.time_ranges_requested.append(time_range)
        return {
            "items": [
                {
                    "id": "a1", "name": "Sleep Token", "images": [{"url": "img1"}],
                    "genres": ["metalcore", "alt metal"], "popularity": 85,
                    "followers": {"total": 1000}, "uri": "spotify:artist:a1",
                },
                {"id": "a2", "name": "Dua Lipa", "images": [], "genres": ["dance pop"]},
                {"id": "a3", "name": "New Artist", "images": [], "genres": []},
            ]
        }

    def get_top_tracks(self, time_range="medium_term", limit=10):
        self.time_ranges_requested.append(time_range)
        return {
            "items": [
                raw_track("t1", "Song One", ["a1"]),
                raw_track("t2", "Feature", ["x9", "a2"]),  # featured artist isn't a planet, second artist is
                raw_track("t3", "Stray", ["x9"]),  # no matching planet → dropped
                raw_track("t4", "Song Two", ["a1"], images=[{"url": "cover"}]),
            ]
        }


class LoggedOutClient:
    def get_current_user(self):
        raise NotAuthenticatedError("No Spotify session found. Please log in first.")


class NoGenresClient:
    def get_top_artists(self, time_range="medium_term", limit=10):
        return {"items": [{"id": "a1", "name": "Unknown", "images": [], "genres": []}]}


@pytest.fixture
def api():
    FakeSpotifyClient.time_ranges_requested = []
    app.dependency_overrides[get_spotify_client] = FakeSpotifyClient
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_me_returns_slim_user(api):
    body = api.get("/api/v1/spotify/me").json()

    assert body == {
        "id": "me",
        "display_name": "Celeste",
        "image_url": "avatar",
        "profile_url": "https://open.spotify.com/user/me",
        "followers": 12,
    }


def test_galaxy_maps_artists_to_planets(api):
    body = api.get("/api/v1/spotify/galaxy?time_range=short_term").json()

    assert body["time_range"] == "short_term"
    assert body["total_planets"] == 3
    sleep_token, dua, new_artist = body["planets"]
    assert sleep_token["name"] == "Sleep Token"
    assert sleep_token["glow_intensity"] == 0.85
    assert dua["image_url"] is None
    assert dua["glow_intensity"] == 0.5  # no popularity → default
    assert (sleep_token["mood"], sleep_token["color"]) == ("Aggressive", "#E63946")
    assert dua["mood"] == "Upbeat"
    assert (new_artist["mood"], new_artist["color"]) == ("Other", "#ADB5BD")


def test_galaxy_attaches_tracks_as_moons(api):
    sleep_token, dua, new_artist = api.get("/api/v1/spotify/galaxy").json()["planets"]

    assert [m["id"] for m in sleep_token["moons"]] == ["t1", "t4"]
    assert sleep_token["moons"][1]["rank"] == 4
    assert sleep_token["moons"][1]["album_image_url"] == "cover"
    assert [m["id"] for m in dua["moons"]] == ["t2"]
    assert new_artist["moons"] == []


def test_top_tracks_strips_raw_spotify_fields(api):
    body = api.get("/api/v1/spotify/top-tracks").json()

    track = body["tracks"][0]
    assert body["total"] == 4
    assert "available_markets" not in track
    assert "available_markets" not in track["album"]
    assert track["artists"] == ["A1"]
    assert track["explicit"] is True


def test_top_artists_strips_raw_spotify_fields(api):
    artist = api.get("/api/v1/spotify/top-artists").json()["artists"][0]

    assert "uri" not in artist
    assert artist["followers"] == 1000
    assert artist["image_url"] == "img1"


def test_mood_returns_dominant_mood(api):
    body = api.get("/api/v1/spotify/mood").json()

    assert body["dominant_mood"] == "Aggressive"
    assert body["total_artists_analyzed"] == 3
    assert body["artists_with_genres"] == 2
    assert set(body["visual_identity"]) == {
        "primary_color", "secondary_color", "accent_color", "planet_glow_intensity", "background_style",
    }


def test_track_insights_handles_missing_album_art(api):
    body = api.get("/api/v1/spotify/track-insights").json()

    assert body["total_tracks"] == 4
    assert body["tracks"][0]["album"]["image_url"] is None


@pytest.mark.parametrize("query", ["limit=0", "limit=51", "time_range=forever"])
def test_invalid_query_params_rejected(api, query):
    assert api.get(f"/api/v1/spotify/top-artists?{query}").status_code == 422


def test_not_authenticated_returns_401():
    app.dependency_overrides[get_spotify_client] = LoggedOutClient
    try:
        response = TestClient(app).get("/api/v1/spotify/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401


@pytest.mark.parametrize("path", ["/galaxy", "/mood", "/track-insights", "/top-artists", "/top-tracks"])
def test_time_range_is_passed_to_spotify(api, path):
    body = api.get(f"/api/v1/spotify{path}?time_range=long_term").json()

    assert body["time_range"] == "long_term"
    assert set(FakeSpotifyClient.time_ranges_requested) == {"long_term"}


def test_mood_without_any_genres_falls_back_to_other():
    app.dependency_overrides[get_spotify_client] = NoGenresClient
    try:
        response = TestClient(app).get("/api/v1/spotify/mood")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["dominant_mood"] == "Other"
    assert body["mood_distribution"] == {}
    assert body["artists_with_genres"] == 0
