import time

import pytest

from core.exceptions import NotAuthenticatedError, SpotifyAPIError, SpotifyAuthError
from core.sessions import InMemorySessionStore, TokenSet
from services import spotify_client as client_module
from services.spotify_client import SpotifyClient


class FakeResponse:
    def __init__(self, status_code, body=None):
        self.status_code = status_code
        self._body = body or {}
        self.text = str(self._body)

    def json(self):
        return self._body


SESSION_ID = "session-1"


def make_store(access_token="old-token", refresh_token="refresh-1", expires_in=3600):
    store = InMemorySessionStore()
    store.save(SESSION_ID, TokenSet(access_token, refresh_token, time.time() + expires_in))
    return store


def make_client(store):
    return SpotifyClient(session_id=SESSION_ID, store=store)


@pytest.fixture
def spotify(monkeypatch):
    """Scripts Spotify API responses and records which tokens were sent."""
    state = {"responses": [], "tokens_sent": [], "refresh_calls": 0}

    def fake_get(url, headers, params, timeout):
        state["tokens_sent"].append(headers["Authorization"].removeprefix("Bearer "))
        return state["responses"].pop(0)

    def fake_refresh(refresh_token):
        state["refresh_calls"] += 1
        return {"access_token": f"new-token-{state['refresh_calls']}", "expires_in": 3600}

    monkeypatch.setattr(client_module.requests, "get", fake_get)
    monkeypatch.setattr(client_module.spotify_auth, "refresh_access_token", fake_refresh)
    return state


def test_no_session_raises_not_authenticated(spotify):
    with pytest.raises(NotAuthenticatedError):
        SpotifyClient(session_id="unknown", store=InMemorySessionStore()).get_current_user()


def test_valid_token_is_used_without_refresh(spotify):
    spotify["responses"] = [FakeResponse(200, {"id": "me"})]

    result = make_client(make_store()).get_current_user()

    assert result == {"id": "me"}
    assert spotify["tokens_sent"] == ["old-token"]
    assert spotify["refresh_calls"] == 0


def test_expired_token_is_refreshed_before_request(spotify):
    store = make_store(expires_in=-10)
    spotify["responses"] = [FakeResponse(200, {"id": "me"})]

    make_client(store).get_current_user()

    assert spotify["tokens_sent"] == ["new-token-1"]
    assert store.get(SESSION_ID).access_token == "new-token-1"
    # Spotify didn't send a new refresh token, so the old one is kept
    assert store.get(SESSION_ID).refresh_token == "refresh-1"


def test_401_triggers_refresh_and_single_retry(spotify):
    store = make_store()
    spotify["responses"] = [FakeResponse(401), FakeResponse(200, {"id": "me"})]

    result = make_client(store).get_current_user()

    assert result == {"id": "me"}
    assert spotify["tokens_sent"] == ["old-token", "new-token-1"]
    assert store.get(SESSION_ID).access_token == "new-token-1"


def test_401_after_retry_clears_session(spotify):
    store = make_store()
    spotify["responses"] = [FakeResponse(401), FakeResponse(401)]

    with pytest.raises(NotAuthenticatedError):
        make_client(store).get_current_user()

    assert spotify["refresh_calls"] == 1
    assert store.get(SESSION_ID) is None


def test_revoked_refresh_token_clears_session(spotify, monkeypatch):
    def failing_refresh(refresh_token):
        raise SpotifyAuthError("invalid_grant")

    monkeypatch.setattr(client_module.spotify_auth, "refresh_access_token", failing_refresh)
    store = make_store(expires_in=-10)

    with pytest.raises(NotAuthenticatedError):
        make_client(store).get_current_user()

    assert store.get(SESSION_ID) is None


@pytest.mark.parametrize("upstream, expected", [(429, 429), (404, 404), (500, 502), (400, 502)])
def test_spotify_errors_are_mapped(spotify, upstream, expected):
    spotify["responses"] = [FakeResponse(upstream)]

    with pytest.raises(SpotifyAPIError) as exc_info:
        make_client(make_store()).get_current_user()

    assert exc_info.value.status_code == expected


def test_refresh_only_touches_own_session(spotify):
    store = make_store(expires_in=-10)
    other = TokenSet("other-token", "other-refresh", time.time() + 3600)
    store.save("session-2", other)
    spotify["responses"] = [FakeResponse(200, {"id": "me"})]

    make_client(store).get_current_user()

    assert store.get("session-2") == other
