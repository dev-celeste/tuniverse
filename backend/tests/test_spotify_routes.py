import pytest
from fastapi.testclient import TestClient

from core.exceptions import NotAuthenticatedError
from main import app
from routers.spotify import get_spotify_client


class FakeSpotifyClient:
    def get_top_artists(self, time_range="medium_term", limit=10):
        return {
            "items": [
                {"id": "a1", "name": "Sleep Token", "images": [{"url": "img1"}], "genres": ["metalcore", "alt metal"]},
                {"id": "a2", "name": "Dua Lipa", "images": [], "genres": ["dance pop"]},
            ]
        }

    def get_top_tracks(self, time_range="medium_term", limit=10):
        return {
            "items": [
                {
                    "id": "t1",
                    "name": "Song",
                    "album": {"name": "Album", "release_date": "2024-01-01", "images": []},
                    "artists": [{"name": "Artist"}],
                    "popularity": 80,
                    "external_urls": {"spotify": "https://open.spotify.com/track/t1"},
                }
            ]
        }


class LoggedOutClient:
    def get_current_user(self):
        raise NotAuthenticatedError("No Spotify session found. Please log in first.")


@pytest.fixture
def api():
    app.dependency_overrides[get_spotify_client] = FakeSpotifyClient
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_galaxy_maps_artists_to_planets(api):
    body = api.get("/api/v1/spotify/galaxy").json()

    assert body["total_planets"] == 2
    assert body["planets"][0]["name"] == "Sleep Token"
    assert body["planets"][1]["image_url"] is None


def test_mood_returns_dominant_mood(api):
    body = api.get("/api/v1/spotify/mood").json()

    assert body["dominant_mood"] == "Aggressive"
    assert body["total_artists_analyzed"] == 2


def test_track_insights_handles_missing_album_art(api):
    body = api.get("/api/v1/spotify/track-insights").json()

    assert body["total_tracks"] == 1
    assert body["tracks"][0]["album"]["image"] is None


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
