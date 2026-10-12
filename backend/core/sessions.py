import json
import os
import time
from dataclasses import asdict, dataclass
from functools import lru_cache
from typing import Optional, Protocol

# Refresh a little before Spotify's expiry so in-flight requests don't race it
EXPIRY_LEEWAY_SECONDS = 60

SESSION_COOKIE_NAME = "tuniverse_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 30  # sliding: reset whenever tokens are saved
REDIS_KEY_PREFIX = "tuniverse:session:"


@dataclass
class TokenSet:
    access_token: str
    refresh_token: Optional[str]
    expires_at: float
    scope: Optional[str] = None

    @classmethod
    def from_spotify(cls, token_data: dict, fallback_refresh_token: Optional[str] = None) -> "TokenSet":
        """
        Build from a Spotify token response.
        Refresh responses don't always include a new refresh_token, so keep the old one.
        """
        return cls(
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token") or fallback_refresh_token,
            expires_at=time.time() + token_data.get("expires_in", 3600),
            scope=token_data.get("scope"),
        )

    def is_expired(self) -> bool:
        return time.time() >= self.expires_at - EXPIRY_LEEWAY_SECONDS


class SessionStore(Protocol):
    """Maps an opaque session ID (held in the user's cookie) to their Spotify tokens."""

    def get(self, session_id: str) -> Optional[TokenSet]: ...

    def save(self, session_id: str, tokens: TokenSet) -> None: ...

    def delete(self, session_id: str) -> None: ...


class InMemorySessionStore:
    """
    Dev-only: sessions live in this process, so a server restart logs everyone out
    and multiple workers won't share sessions. No TTL — sessions last until restart.
    """

    def __init__(self):
        self._sessions: dict[str, TokenSet] = {}

    def get(self, session_id: str) -> Optional[TokenSet]:
        return self._sessions.get(session_id)

    def save(self, session_id: str, tokens: TokenSet) -> None:
        self._sessions[session_id] = tokens

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)


class RedisSessionStore:
    """Production store: survives restarts, shared across workers, sessions expire after SESSION_TTL_SECONDS."""

    def __init__(self, redis_client):
        self.redis = redis_client

    def _key(self, session_id: str) -> str:
        return f"{REDIS_KEY_PREFIX}{session_id}"

    def get(self, session_id: str) -> Optional[TokenSet]:
        raw = self.redis.get(self._key(session_id))
        return TokenSet(**json.loads(raw)) if raw else None

    def save(self, session_id: str, tokens: TokenSet) -> None:
        self.redis.set(self._key(session_id), json.dumps(asdict(tokens)), ex=SESSION_TTL_SECONDS)

    def delete(self, session_id: str) -> None:
        self.redis.delete(self._key(session_id))


@lru_cache
def get_session_store() -> SessionStore:
    """
    Picks the store on first use (after main.py has loaded .env):
    Redis when REDIS_URL is set, otherwise in-memory.
    """
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        import redis

        return RedisSessionStore(redis.Redis.from_url(redis_url, decode_responses=True))

    return InMemorySessionStore()
