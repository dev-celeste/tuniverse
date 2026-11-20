import fakeredis
import pytest
from fastapi.testclient import TestClient

from core.sessions import InMemorySessionStore, RedisSessionStore
from main import app
from routers import health as health_module


@pytest.fixture
def api():
    return TestClient(app)


def test_health_ok_with_in_memory_sessions(api, monkeypatch):
    monkeypatch.setattr(health_module, "get_session_store", InMemorySessionStore)

    response = api.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_ok_when_redis_answers(api, monkeypatch):
    monkeypatch.setattr(health_module, "get_session_store", lambda: RedisSessionStore(fakeredis.FakeRedis()))

    assert api.get("/api/v1/health").status_code == 200


def test_health_fails_when_redis_is_unreachable(api, monkeypatch):
    class DownRedis:
        def ping(self):
            raise ConnectionError("Connection refused")

    monkeypatch.setattr(health_module, "get_session_store", lambda: RedisSessionStore(DownRedis()))

    response = api.get("/api/v1/health")

    assert response.status_code == 503
    assert response.json()["sessions"] == "unreachable"
