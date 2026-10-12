from typing import Dict, Optional

import requests

from core.exceptions import NotAuthenticatedError, SpotifyAPIError, SpotifyAuthError
from core.token_store import InMemoryTokenStore, TokenSet, token_store
from services import spotify_auth

SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1"
REQUEST_TIMEOUT_SECONDS = 10

# Upstream statuses worth surfacing to our clients as-is; everything else becomes a 502
PASSTHROUGH_STATUS_CODES = {403, 404, 429}


class SpotifyClient:
    """
    The only place that talks to the Spotify Web API.
    Reads tokens from the store, refreshes them when expired (or on a 401),
    and retries the request once — callers never see token expiry.
    """

    BASE_URL = SPOTIFY_API_BASE_URL

    def __init__(self, store: InMemoryTokenStore = token_store):
        self.store = store

    # -------------------------
    # Token handling
    # -------------------------

    def _current_tokens(self) -> TokenSet:
        tokens = self.store.get()
        if not tokens:
            raise NotAuthenticatedError("No Spotify session found. Please log in first.")

        if tokens.is_expired():
            tokens = self._refresh(tokens)

        return tokens

    def _refresh(self, tokens: TokenSet) -> TokenSet:
        if not tokens.refresh_token:
            self.store.clear()
            raise NotAuthenticatedError("Spotify session expired. Please log in again.")

        try:
            token_data = spotify_auth.refresh_access_token(tokens.refresh_token)
        except SpotifyAuthError as e:
            # Refresh token revoked or invalid — the session is unrecoverable
            self.store.clear()
            raise NotAuthenticatedError("Spotify session expired. Please log in again.") from e

        new_tokens = TokenSet.from_spotify(token_data, fallback_refresh_token=tokens.refresh_token)
        self.store.save(new_tokens)
        return new_tokens

    # -------------------------
    # HTTP
    # -------------------------

    def _send(self, url: str, access_token: str, params: Optional[Dict]) -> requests.Response:
        try:
            return requests.get(
                url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                params=params,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except requests.Timeout as e:
            raise SpotifyAPIError(504, "Spotify API timed out") from e
        except requests.RequestException as e:
            raise SpotifyAPIError(502, f"Could not reach Spotify API: {e}") from e

    def get(self, endpoint: str, params: Optional[Dict] = None):
        url = f"{self.BASE_URL}{endpoint}"
        tokens = self._current_tokens()

        response = self._send(url, tokens.access_token, params)

        # Token was revoked/expired early — refresh once and retry transparently
        if response.status_code == 401:
            tokens = self._refresh(tokens)
            response = self._send(url, tokens.access_token, params)

        if response.status_code == 401:
            self.store.clear()
            raise NotAuthenticatedError("Spotify rejected the session. Please log in again.")

        if response.status_code >= 400:
            # Helpful debug output during development
            print(f"Spotify API error {response.status_code} for {url}")
            print("Response body:", response.text)

            status = response.status_code if response.status_code in PASSTHROUGH_STATUS_CODES else 502
            raise SpotifyAPIError(status, f"Spotify API error {response.status_code} for {endpoint}")

        return response.json()

    # -------------------------
    # User endpoints
    # -------------------------

    def get_current_user(self):
        return self.get("/me")

    def get_top_artists(self, time_range: str = "medium_term", limit: int = 10):
        return self.get(
            "/me/top/artists",
            params={"time_range": time_range, "limit": limit},
        )

    def get_top_tracks(self, time_range: str = "medium_term", limit: int = 10):
        return self.get(
            "/me/top/tracks",
            params={"time_range": time_range, "limit": limit},
        )

    def get_saved_tracks(self, limit: int = 20):
        """
        User's Liked Songs
        """
        return self.get(
            "/me/tracks",
            params={"limit": limit},
        )

    # -------------------------
    # Playlist endpoints
    # -------------------------

    def get_playlist_tracks(
        self,
        playlist_id: str,
        limit: int = 50,
        market: str = "US",
    ):
        """
        Fetch tracks from a playlist.
        Market param is IMPORTANT — prevents silent 404s.
        """
        return self.get(
            f"/playlists/{playlist_id}/tracks",
            params={
                "limit": limit,
                "market": market,
            },
        )
