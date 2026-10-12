from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from core.exceptions import SpotifyAuthError
from core.sessions import SESSION_COOKIE_NAME, InMemorySessionStore
from main import app
from routers import auth as auth_module
from routers.auth import STATE_COOKIE_NAME

TOKEN_RESPONSE = {
    "access_token": "access-1",
    "refresh_token": "refresh-1",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": "user-top-read",
}


@pytest.fixture
def store(monkeypatch):
    store = InMemorySessionStore()
    monkeypatch.setattr(auth_module, "get_session_store", lambda: store)
    monkeypatch.setattr(auth_module.spotify_auth, "exchange_code_for_tokens", lambda code: TOKEN_RESPONSE)
    monkeypatch.setenv("SPOTIFY_CLIENT_ID", "client-id")
    monkeypatch.setenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/api/v1/auth/callback")
    # Default to backend-only mode regardless of what's in .env
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    return store


@pytest.fixture
def api():
    return TestClient(app)


def login(api) -> str:
    """Runs /login and returns the state Spotify would echo back."""
    response = api.get("/api/v1/auth/login", follow_redirects=False)
    assert response.status_code == 307
    return parse_qs(urlparse(response.headers["location"]).query)["state"][0]


def test_login_sets_state_cookie_matching_redirect(store, api):
    state = login(api)

    assert api.cookies[STATE_COOKIE_NAME] == state


def test_callback_creates_session(store, api):
    state = login(api)

    response = api.get(f"/api/v1/auth/callback?code=abc&state={state}")

    assert response.status_code == 200
    assert response.json()["refresh_token_received"] is True
    session_id = api.cookies[SESSION_COOKIE_NAME]
    assert store.get(session_id).access_token == "access-1"
    assert "httponly" in response.headers["set-cookie"].lower()


def test_session_id_is_not_the_spotify_token(store, api):
    state = login(api)
    api.get(f"/api/v1/auth/callback?code=abc&state={state}")

    assert api.cookies[SESSION_COOKIE_NAME] != "access-1"


def test_callback_rejects_mismatched_state(store, api):
    login(api)

    response = api.get("/api/v1/auth/callback?code=abc&state=forged")

    assert response.status_code == 400
    assert SESSION_COOKIE_NAME not in api.cookies


def test_callback_rejects_missing_state_cookie(store, api):
    response = api.get("/api/v1/auth/callback?code=abc&state=anything")

    assert response.status_code == 400


def test_callback_handles_user_cancelling(store, api):
    state = login(api)

    response = api.get(f"/api/v1/auth/callback?error=access_denied&state={state}")

    assert response.status_code == 400
    assert response.json()["code"] == "access_denied"


def test_relogin_replaces_old_session(store, api):
    api.get(f"/api/v1/auth/callback?code=abc&state={login(api)}")
    old_session_id = api.cookies[SESSION_COOKIE_NAME]

    api.get(f"/api/v1/auth/callback?code=abc&state={login(api)}")

    assert api.cookies[SESSION_COOKIE_NAME] != old_session_id
    assert store.get(old_session_id) is None


def test_logout_deletes_session(store, api):
    api.get(f"/api/v1/auth/callback?code=abc&state={login(api)}")
    session_id = api.cookies[SESSION_COOKIE_NAME]

    response = api.post("/api/v1/auth/logout")

    assert response.status_code == 200
    assert store.get(session_id) is None
    assert SESSION_COOKIE_NAME not in api.cookies


def test_spotify_routes_require_session_cookie(api):
    assert api.get("/api/v1/spotify/me").status_code == 401


# -------------------------
# With FRONTEND_URL set (frontend mode)
# -------------------------

@pytest.fixture
def frontend(store, monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "http://127.0.0.1:5173/")
    return store


def test_successful_login_redirects_to_galaxy_with_cookie(frontend, api):
    state = login(api)

    response = api.get(f"/api/v1/auth/callback?code=abc&state={state}", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "http://127.0.0.1:5173/galaxy"
    assert frontend.get(api.cookies[SESSION_COOKIE_NAME]) is not None


@pytest.mark.parametrize("query, code", [
    ("error=access_denied", "access_denied"),
    ("code=abc&state=forged", "invalid_state"),
    ("error=<script>alert(1)</script>", "scriptalert1script"),
])
def test_failed_login_redirects_home_with_error_code(frontend, api, query, code):
    login(api)

    response = api.get(f"/api/v1/auth/callback?{query}", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == f"http://127.0.0.1:5173/?login_error={code}"
    assert SESSION_COOKIE_NAME not in api.cookies


def test_token_exchange_failure_redirects_with_error_code(frontend, api, monkeypatch):
    def failing_exchange(code):
        raise SpotifyAuthError("Spotify token request failed (authorization_code)")

    monkeypatch.setattr(auth_module.spotify_auth, "exchange_code_for_tokens", failing_exchange)
    state = login(api)

    response = api.get(f"/api/v1/auth/callback?code=abc&state={state}", follow_redirects=False)

    assert response.headers["location"] == "http://127.0.0.1:5173/?login_error=token_exchange_failed"
