import requests
from typing import Dict

SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1"


class SpotifyClient:
    def __init__(self, access_token: str):
        self.access_token = access_token

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def get(self, endpoint: str, params: Dict = None):
        url = f"{SPOTIFY_API_BASE_URL}{endpoint}"
        response = requests.get(
            url,
            headers=self._get_headers(),
            params=params,
        )

        response.raise_for_status()
        return response.json()
