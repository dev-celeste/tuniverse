class SpotifyConfigError(Exception):
    """Spotify credentials are missing from the environment."""


class NotAuthenticatedError(Exception):
    """No usable Spotify session — the user needs to log in (again)."""


class SpotifyAuthError(Exception):
    """Spotify's accounts service rejected a token exchange or refresh."""


class SpotifyAPIError(Exception):
    """The Spotify Web API returned an error or could not be reached."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
