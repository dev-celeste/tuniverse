import logging
import re
import secrets
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Cookie
from fastapi.responses import JSONResponse, RedirectResponse, Response

from core.config import cookie_secure, frontend_url
from core.exceptions import SpotifyAuthError
from core.sessions import (
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS,
    TokenSet,
    get_session_store,
)
from services import spotify_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# CSRF protection: the state we send to Spotify must come back on the callback
# and match this short-lived cookie
STATE_COOKIE_NAME = "tuniverse_oauth_state"
STATE_TTL_SECONDS = 600

# Where the frontend lands after a successful login
POST_LOGIN_PATH = "/galaxy"


class LoginError(Exception):
    """A callback failure with a short machine-readable code the frontend can show a message for."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@router.get("/login")
def spotify_login():
    state = secrets.token_urlsafe(16)

    response = RedirectResponse(spotify_auth.build_authorize_url(state))
    response.set_cookie(
        STATE_COOKIE_NAME,
        state,
        max_age=STATE_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=cookie_secure(),
    )
    return response


@router.get("/callback")
def spotify_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    expected_state: Optional[str] = Cookie(None, alias=STATE_COOKIE_NAME),
    old_session_id: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
):
    """
    With FRONTEND_URL set, redirects back to the app (to /galaxy, or to /?login_error=<code>).
    Without it (backend-only mode), returns JSON / a 400.
    """
    try:
        token_data = _complete_login(code, state, error, expected_state)
    except LoginError as e:
        logger.warning("Spotify login failed: %s", e.message)
        response = _login_failed_response(e)
        response.delete_cookie(STATE_COOKIE_NAME)
        return response

    store = get_session_store()
    if old_session_id:
        store.delete(old_session_id)

    # ✅ Store tokens server-side; the browser only gets an opaque session ID
    session_id = secrets.token_urlsafe(32)
    store.save(session_id, TokenSet.from_spotify(token_data))

    app_url = frontend_url()
    if app_url:
        response = RedirectResponse(f"{app_url}{POST_LOGIN_PATH}", status_code=303)
    else:
        response = JSONResponse({
            "access_token_received": "access_token" in token_data,
            "refresh_token_received": "refresh_token" in token_data,
            "token_type": token_data.get("token_type"),
            "expires_in": token_data.get("expires_in"),
            "scopes": token_data.get("scope"),
        })

    response.set_cookie(
        SESSION_COOKIE_NAME,
        session_id,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=cookie_secure(),
    )
    response.delete_cookie(STATE_COOKIE_NAME)
    return response


def _complete_login(
    code: Optional[str],
    state: Optional[str],
    error: Optional[str],
    expected_state: Optional[str],
) -> dict:
    # e.g. error=access_denied when the user clicks Cancel on Spotify's consent screen
    if error:
        # Only pass a safe token through to the frontend URL
        error_code = re.sub(r"[^a-z0-9_]", "", error.lower())[:40] or "spotify_error"
        raise LoginError(error_code, f"Spotify login was not completed: {error}")

    if not state or not expected_state or not secrets.compare_digest(state, expected_state):
        raise LoginError("invalid_state", "Invalid OAuth state. Please start the login again.")

    if not code:
        raise LoginError("missing_code", "Missing authorization code")

    try:
        return spotify_auth.exchange_code_for_tokens(code)
    except SpotifyAuthError as e:
        raise LoginError("token_exchange_failed", str(e)) from e


def _login_failed_response(error: LoginError) -> Response:
    app_url = frontend_url()
    if app_url:
        return RedirectResponse(f"{app_url}/?{urlencode({'login_error': error.code})}", status_code=303)

    return JSONResponse(status_code=400, content={"detail": error.message, "code": error.code})


@router.post("/logout")
def logout(session_id: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME)):
    if session_id:
        get_session_store().delete(session_id)

    response = JSONResponse({"logged_out": True})
    response.delete_cookie(SESSION_COOKIE_NAME)
    return response
