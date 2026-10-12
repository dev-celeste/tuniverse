import time

import fakeredis
import pytest

from core.sessions import (
    REDIS_KEY_PREFIX,
    SESSION_TTL_SECONDS,
    InMemorySessionStore,
    RedisSessionStore,
    TokenSet,
)


@pytest.fixture(params=["memory", "redis"])
def store(request):
    if request.param == "memory":
        return InMemorySessionStore()
    return RedisSessionStore(fakeredis.FakeRedis(decode_responses=True))


def make_tokens(access_token="access-1"):
    return TokenSet(access_token, "refresh-1", time.time() + 3600, scope="user-top-read")


def test_save_and_get_round_trip(store):
    tokens = make_tokens()
    store.save("s1", tokens)

    assert store.get("s1") == tokens


def test_sessions_are_isolated(store):
    store.save("s1", make_tokens("alice"))
    store.save("s2", make_tokens("bob"))

    assert store.get("s1").access_token == "alice"
    assert store.get("s2").access_token == "bob"


def test_unknown_session_is_none(store):
    assert store.get("nope") is None


def test_delete(store):
    store.save("s1", make_tokens())
    store.delete("s1")
    store.delete("never-existed")  # no error

    assert store.get("s1") is None


def test_redis_sessions_expire():
    redis = fakeredis.FakeRedis(decode_responses=True)
    RedisSessionStore(redis).save("s1", make_tokens())

    assert 0 < redis.ttl(f"{REDIS_KEY_PREFIX}s1") <= SESSION_TTL_SECONDS
