from routers.auth import ACCESS_TOKEN_STORE
import requests
from typing import Dict, List, Optional

SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1"


class SpotifyClient:
    BASE_URL = SPOTIFY_API_BASE_URL

    def __init__(self, access_token: Optional[str] = None):
        """
        Spotify client that can either:
        1) Use an explicitly passed access_token (recommended for services + ML later)
        2) Fall back to the global ACCESS_TOKEN_STORE
        """
        self.access_token = access_token

    def _get_headers(self) -> Dict[str, str]:
        access_token = self.access_token or ACCESS_TOKEN_STORE.get("access_token")

        if not access_token:
            raise Exception("No Spotify access token found. Please log in first.")

        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    def get(self, endpoint: str, params: Optional[Dict] = None):
        url = f"{self.BASE_URL}{endpoint}"

        response = requests.get(
            url,
            headers=self._get_headers(),
            params=params,
        )

        # Helpful debug output during development
        if response.status_code >= 400:
            print(f"Spotify API error {response.status_code} for {url}")
            print("Response body:", response.text)

        response.raise_for_status()
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

    # -------------------------
    # Audio features
    # -------------------------

    def get_audio_features(self, track_ids: List[str]):
        """
        Fetch audio features for tracks.
        Falls back to individual calls if batch fails.
        """
        if not track_ids:
            return {"audio_features": []}

        ids_str = ",".join(track_ids)

        try:
            return self.get(
                "/audio-features",
                params={"ids": ids_str},
            )

        except requests.exceptions.HTTPError as e:
            print("Batch audio-features request failed, trying individually:", e)

            features = []

            for track_id in track_ids:
                try:
                    result = self.get(
                        "/audio-features",
                        params={"ids": track_id},
                    )

                    if (
                        result.get("audio_features")
                        and result["audio_features"][0] is not None
                    ):
                        features.append(result["audio_features"][0])

                except requests.exceptions.HTTPError:
                    print(f"Skipping restricted or unavailable track {track_id}")

            return {"audio_features": features}
