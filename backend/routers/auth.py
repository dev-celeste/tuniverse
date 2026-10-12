import secrets
from typing import Optional

from fastapi import APIRouter, Cookie, Response
from fastapi.responses import RedirectResponse

from core.exceptions import SpotifyAuthError
from core.sessions import (
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS,
    TokenSet,
    cookie_secure,
    get_session_store,
)
from services import spotify_auth

router = APIRouter(prefix="/auth", tags=["auth"])

# CSRF protection: the state we send to Spotify must come back on the callback
# and match this short-lived cookie
STATE_COOKIE_NAME = "tuniverse_oauth_state"
STATE_TTL_SECONDS = 600


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
    response: Response,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    expected_state: Optional[str] = Cookie(None, alias=STATE_COOKIE_NAME),
    old_session_id: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
):
    # e.g. error=access_denied when the user clicks Cancel on Spotify's consent screen
    if error:
        raise SpotifyAuthError(f"Spotify login was not completed: {error}")

    if not state or not expected_state or not secrets.compare_digest(state, expected_state):
        raise SpotifyAuthError("Invalid OAuth state. Please start the login again.")

    if not code:
        raise SpotifyAuthError("Missing authorization code")

    token_data = spotify_auth.exchange_code_for_tokens(code)

    store = get_session_store()
    if old_session_id:
        store.delete(old_session_id)

    # ✅ Store tokens server-side; the browser only gets an opaque session ID
    session_id = secrets.token_urlsafe(32)
    store.save(session_id, TokenSet.from_spotify(token_data))

    response.set_cookie(
        SESSION_COOKIE_NAME,
        session_id,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=cookie_secure(),
    )
    response.delete_cookie(STATE_COOKIE_NAME)

    return {
        "access_token_received": "access_token" in token_data,
        "refresh_token_received": "refresh_token" in token_data,
        "token_type": token_data.get("token_type"),
        "expires_in": token_data.get("expires_in"),
        "scopes": token_data.get("scope"),
    }


@router.post("/logout")
def logout(
    response: Response,
    session_id: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
):
    if session_id:
        get_session_store().delete(session_id)

    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"logged_out": True}
