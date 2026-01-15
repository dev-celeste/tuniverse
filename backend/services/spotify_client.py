from routers.auth import ACCESS_TOKEN_STORE
import requests
from typing import Dict, List

SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1"


class SpotifyClient:
    BASE_URL = SPOTIFY_API_BASE_URL

    def __init__(self):
        # Token will be fetched dynamically from ACCESS_TOKEN_STORE
        pass

    def _get_headers(self) -> Dict[str, str]:
        access_token = ACCESS_TOKEN_STORE.get("access_token")
        if not access_token:
            raise Exception("No Spotify access token found. Please log in first.")
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    def get(self, endpoint: str, params: Dict = None):
        url = f"{self.BASE_URL}{endpoint}"
        response = requests.get(url, headers=self._get_headers(), params=params)
        response.raise_for_status()
        return response.json()

    def get_current_user(self):
        return self.get("/me")

    def get_top_artists(self, time_range: str = "medium_term", limit: int = 10):
        return self.get("/me/top/artists", params={"time_range": time_range, "limit": limit})

    def get_top_tracks(self, time_range: str = "medium_term", limit: int = 10):
        return self.get("/me/top/tracks", params={"time_range": time_range, "limit": limit})

    def get_audio_features(self, track_ids: List[str]):
        """
        Fetch audio features for tracks.
        If some tracks fail (403), fetch individually to skip restricted tracks.
        """
        if not track_ids:
            return {"audio_features": []}

        ids_str = ",".join(track_ids)
        try:
            return self.get("/audio-features", params={"ids": ids_str})
        except requests.exceptions.HTTPError as e:
            print("Batch audio-features request failed, trying individually:", e)
            # Fetch individually to skip forbidden tracks
            features = []
            for track_id in track_ids:
                try:
                    result = self.get("/audio-features", params={"ids": track_id})
                    if result.get("audio_features") and result["audio_features"][0]:
                        features.append(result["audio_features"][0])
                except requests.exceptions.HTTPError:
                    print(f"Skipping restricted track {track_id}")
            return {"audio_features": features}
