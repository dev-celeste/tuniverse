import time
from dataclasses import dataclass
from typing import Optional

# Refresh a little before Spotify's expiry so in-flight requests don't race it
EXPIRY_LEEWAY_SECONDS = 60


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


class InMemoryTokenStore:
    """
    Single-user, dev-only token store (replaces the old ACCESS_TOKEN_STORE dict).
    Ticket 14 swaps this for a session-keyed store (Redis / DB) behind the same interface.
    """

    def __init__(self):
        self._tokens: Optional[TokenSet] = None

    def get(self) -> Optional[TokenSet]:
        return self._tokens

    def save(self, tokens: TokenSet) -> None:
        self._tokens = tokens

    def clear(self) -> None:
        self._tokens = None


token_store = InMemoryTokenStore()
